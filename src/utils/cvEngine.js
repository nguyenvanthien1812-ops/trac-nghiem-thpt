// Light-weight Browser CV Engine for THPT Bubble Sheet Grading
// Uses standard canvas pixel operations. Analyzes Red channel to filter out red ink guidelines.

import { SHEET_WIDTH, SHEET_HEIGHT } from "./constants";

// ─── Preprocessing ───────────────────────────────────────────────────────────

// Auto-contrast stretch on the red channel to improve bubble detection
// in photos with poor lighting or low contrast.
export function preprocessImage(ctx, width, height) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Sample min/max of the red channel (every 8th pixel for speed)
  let minR = 255, maxR = 0;
  for (let i = 0; i < data.length; i += 4 * 8) {
    const r = data[i];
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
  }

  const range = maxR - minR;
  if (range < 30) return; // Already high-contrast; skip

  const factor = 255 / range;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, Math.round((data[i] - minR) * factor)));
    // G and B channels are intentionally left unchanged to preserve colour cues
  }
  ctx.putImageData(imgData, 0, 0);
}

// ─── Corner Marker Detection ─────────────────────────────────────────────────

// The THPT answer sheet has black corner markers (squares or horizontal dashes) at each of its 4 corners.
// We use a robust connected-component (flood-fill) detection algorithm to locate candidate clusters 
// in each corner's 20% search region, and select the candidate closest to the actual physical corner
// of the image to ignore inner timing marks or background table edges.
export function findCornerMarkers(imgData, width, height) {
  const data = imgData.data;
  const DARK_THRESH = 95;       // Adaptive brightness threshold for dark pixels
  const SEARCH = 0.15;          // Search in 15% of the image from each corner to accommodate skew

  // Visited array to keep track of processed pixels across all boxes
  const visited = new Uint8Array(width * height);

  function findMarkerInBox(x0, y0, x1, y1, targetX, targetY) {
    const clusters = [];

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;

        const pIdx = idx * 4;
        const brightness = data[pIdx] * 0.299 + data[pIdx + 1] * 0.587 + data[pIdx + 2] * 0.114;

        if (brightness < DARK_THRESH) {
          // Flood fill cluster using a fast queue BFS
          const queue = [{ x, y }];
          visited[idx] = 1;
          let sx = 0, sy = 0, count = 0;
          let minX = x, maxX = x, minY = y, maxY = y;

          let qHead = 0;
          while (qHead < queue.length) {
            const curr = queue[qHead++];
            sx += curr.x;
            sy += curr.y;
            count++;

            if (curr.x < minX) minX = curr.x;
            if (curr.x > maxX) maxX = curr.x;
            if (curr.y < minY) minY = curr.y;
            if (curr.y > maxY) maxY = curr.y;

            // Check 4-neighbors
            const neighbors = [
              { x: curr.x + 1, y: curr.y },
              { x: curr.x - 1, y: curr.y },
              { x: curr.x, y: curr.y + 1 },
              { x: curr.x, y: curr.y - 1 }
            ];

            for (let i = 0; i < 4; i++) {
              const n = neighbors[i];
              if (n.x >= x0 && n.x < x1 && n.y >= y0 && n.y < y1) {
                const nIdx = n.y * width + n.x;
                if (!visited[nIdx]) {
                  visited[nIdx] = 1;
                  const npIdx = nIdx * 4;
                  const nBrightness = data[npIdx] * 0.299 + data[npIdx + 1] * 0.587 + data[npIdx + 2] * 0.114;
                  if (nBrightness < DARK_THRESH) {
                    queue.push(n);
                  }
                }
              }
            }
          }

          clusters.push({
            cx: sx / count,
            cy: sy / count,
            count,
            width: maxX - minX + 1,
            height: maxY - minY + 1
          });
        }
      }
    }

    // Scale size limits based on canvas dimensions to support smaller preview canvases
    const scaleFactor = (width / SHEET_WIDTH) * (height / SHEET_HEIGHT);
    const minCount = Math.max(4, Math.round(8 * scaleFactor));
    const maxCount = Math.max(80, Math.round(400 * scaleFactor));

    const candidates = clusters.filter(c => c.count >= minCount && c.count <= maxCount);
    if (candidates.length === 0) return null;

    // Sort by proximity to the target physical corner of the image
    candidates.sort((a, b) => {
      const distA = (a.cx - targetX) ** 2 + (a.cy - targetY) ** 2;
      const distB = (b.cx - targetX) ** 2 + (b.cy - targetY) ** 2;
      return distA - distB;
    });

    return { x: candidates[0].cx, y: candidates[0].cy };
  }

  const sw = Math.floor(width * SEARCH);
  const sh = Math.floor(height * SEARCH);

  const tl = findMarkerInBox(0,          0,           sw,    sh,     0,     0);
  const tr = findMarkerInBox(width - sw, 0,           width, sh,     width, 0);
  const bl = findMarkerInBox(0,          height - sh, sw,    height, 0,     height);
  const br = findMarkerInBox(width - sw, height - sh, width, height, width, height);

  return (tl && tr && bl && br) ? { tl, tr, bl, br } : null;
}

// ─── Auto-Calibration ────────────────────────────────────────────────────────

// Given detected corner pixel positions (from findCornerMarkers) and the
// source image dimensions, compute nudge / scale / rotation adjustments that
// will align the detected sheet with the expected canonical layout.
export function computeAutoCalibration(corners, imgWidth, imgHeight) {
  if (!corners) return null;

  // Expected corner positions in the SHEET_WIDTH × SHEET_HEIGHT space (px)
  const M = 27; // margin from corner square centre to sheet edge
  const expected = {
    tl: { x: M,              y: M               },
    tr: { x: SHEET_WIDTH - M, y: M               },
    bl: { x: M,              y: SHEET_HEIGHT - M },
    br: { x: SHEET_WIDTH - M, y: SHEET_HEIGHT - M },
  };

  // Scale detected corners from source resolution to sheet resolution
  const rx = SHEET_WIDTH  / imgWidth;
  const ry = SHEET_HEIGHT / imgHeight;
  const det = {
    tl: { x: corners.tl.x * rx, y: corners.tl.y * ry },
    tr: { x: corners.tr.x * rx, y: corners.tr.y * ry },
    bl: { x: corners.bl.x * rx, y: corners.bl.y * ry },
    br: { x: corners.br.x * rx, y: corners.br.y * ry },
  };

  // Translation: align top-left corner
  const nudgeX = ((expected.tl.x - det.tl.x) / SHEET_WIDTH)  * 100;
  const nudgeY = ((expected.tl.y - det.tl.y) / SHEET_HEIGHT) * 100;

  // Scale: ratio of expected span to detected span
  const detW = det.tr.x - det.tl.x;
  const expW = expected.tr.x - expected.tl.x;
  const scaleX = detW > 10 ? expW / detW : 1;

  const detH = det.bl.y - det.tl.y;
  const expH = expected.bl.y - expected.tl.y;
  const scaleY = detH > 10 ? expH / detH : 1;

  // Rotation: angle of the top edge
  const dx = det.tr.x - det.tl.x;
  const dy = det.tr.y - det.tl.y;
  const rotation = -(Math.atan2(dy, dx) * 180) / Math.PI;

  // Sanity bounds — reject wildly wrong detections
  if (Math.abs(nudgeX) > 15 || Math.abs(nudgeY) > 15) return null;
  if (Math.abs(scaleX - 1) > 0.3 || Math.abs(scaleY - 1) > 0.3) return null;
  if (Math.abs(rotation) > 15) return null;

  return {
    nudgeX:   Math.round(nudgeX   * 100) / 100,
    nudgeY:   Math.round(nudgeY   * 100) / 100,
    scaleX:   Math.round(scaleX   * 1000) / 1000,
    scaleY:   Math.round(scaleY   * 1000) / 1000,
    rotation: Math.round(rotation * 10)   / 10,
  };
}

// Helper: Get grayscale value from red channel (efficient for red dropout bubble sheets)
// Red ink reflects red light, so in the red channel, red ink and white paper both appear bright (~255).
// Black/blue pen or pencil marks appear dark (~0) in all channels.
function getPixelIntensityRed(imgData, x, y, width) {
  const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
  if (idx < 0 || idx >= imgData.data.length) return 255;
  return imgData.data[idx]; // Red channel is the first byte
}

// Calculate the darkness score of a bubble using relative contrast
// We compare the average intensity inside the bubble radius to a ring just outside the bubble.
export function getBubbleDarkness(ctx, imgData, x, y, r = 7) {
  let insideSum = 0;
  let insideCount = 0;
  let outsideSum = 0;
  let outsideCount = 0;

  // We sample inside a bounding box of size 2.5 * r
  const boxSize = Math.ceil(r * 2.5);
  const startX = Math.max(0, Math.floor(x - boxSize));
  const endX = Math.min(imgData.width - 1, Math.ceil(x + boxSize));
  const startY = Math.max(0, Math.floor(y - boxSize));
  const endY = Math.min(imgData.height - 1, Math.ceil(y + boxSize));

  for (let py = startY; py <= endY; py++) {
    for (let px = startX; px <= endX; px++) {
      const distSq = (px - x) * (px - x) + (py - y) * (py - y);
      const intensity = getPixelIntensityRed(imgData, px, py, imgData.width);

      if (distSq <= r * r) {
        insideSum += intensity;
        insideCount++;
      } else if (distSq >= (1.4 * r) * (1.4 * r) && distSq <= (2.2 * r) * (2.2 * r)) {
        outsideSum += intensity;
        outsideCount++;
      }
    }
  }

  const avgInside = insideCount > 0 ? insideSum / insideCount : 255;
  const avgOutside = outsideCount > 0 ? outsideSum / outsideCount : 255;

  // A filled bubble is darker than its background, meaning avgInside < avgOutside.
  // We return the difference. Higher score = darker/more filled.
  return Math.max(0, avgOutside - avgInside);
}

// Map percentage coordinates (0 to 100) to actual pixel coordinates on the 800x1130 canvas,
// applying grid offsets (nudgeX, nudgeY) and scaling (scaleX, scaleY).
export function getPixelCoords(pctX, pctY, config) {
  const { nudgeX = 0, nudgeY = 0, scaleX = 1, scaleY = 1 } = config;
  
  // Center of the sheet is 50%
  const centerX = SHEET_WIDTH / 2;
  const centerY = SHEET_HEIGHT / 2;

  // Convert percentage to coordinate relative to center, scale it, add offset, and convert back
  const pixelX = ((pctX / 100 * SHEET_WIDTH) - centerX) * scaleX + centerX + (nudgeX / 100 * SHEET_WIDTH);
  const pixelY = ((pctY / 100 * SHEET_HEIGHT) - centerY) * scaleY + centerY + (nudgeY / 100 * SHEET_HEIGHT);

  return { x: pixelX, y: pixelY };
}

// ─── Perspective Correction ───────────────────────────────────────────────────

// Solve 8×8 linear system Ax = b by Gaussian elimination with partial pivoting
function solveLinear8(A, b) {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-10) return null;
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / M[col][col];
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// Compute 3×3 homography H mapping srcPts[i] → dstPts[i] (homogeneous coords)
export function computeHomography(srcPts, dstPts) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = srcPts[i];
    const { x: dx, y: dy } = dstPts[i];
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }
  const h = solveLinear8(A, b);
  if (!h) return null;
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}

// Backward-warp srcImageData into dstCtx using H (maps dst coords → src coords).
// Bilinear interpolation for sub-pixel accuracy.
export function warpPerspective(srcImageData, dstCtx, H, dstWidth, dstHeight) {
  const sd = srcImageData.data;
  const sw = srcImageData.width;
  const sh = srcImageData.height;
  const out = dstCtx.createImageData(dstWidth, dstHeight);
  const od = out.data;

  for (let dy = 0; dy < dstHeight; dy++) {
    for (let dx = 0; dx < dstWidth; dx++) {
      const w  = H[2][0] * dx + H[2][1] * dy + H[2][2];
      const sx = (H[0][0] * dx + H[0][1] * dy + H[0][2]) / w;
      const sy = (H[1][0] * dx + H[1][1] * dy + H[1][2]) / w;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = x0 + 1, y1 = y0 + 1;
      const oi = (dy * dstWidth + dx) * 4;
      if (x0 < 0 || y0 < 0 || x1 >= sw || y1 >= sh) {
        od[oi] = od[oi + 1] = od[oi + 2] = 255; od[oi + 3] = 255;
        continue;
      }
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
      for (let c = 0; c < 3; c++) {
        od[oi + c] = Math.round(
          sd[i00 + c] * (1 - fx) * (1 - fy) + sd[i10 + c] * fx * (1 - fy) +
          sd[i01 + c] * (1 - fx) * fy       + sd[i11 + c] * fx * fy
        );
      }
      od[oi + 3] = 255;
    }
  }
  dstCtx.putImageData(out, 0, 0);
}

// Scans the entire sheet using the layout config and manual adjustments
export function scanSheet(ctx, layout, adjustments, template) {
  const imgData = ctx.getImageData(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
  const results = {
    sbd: "",
    code: "",
    part1: [],
    part2: [],
    part3: [],
    bubbleScores: {
      sbd: [],
      code: [],
      part1: [],
      part2: [],
      part3: []
    }
  };

  const bubbleRadius = 6.5;
  const fillThreshold = 25; // Minimum darkness difference to count as filled

  // Helper to scan a standard matrix grid (like SBD, Exam Code)
  function scanGrid(gridConfig) {
    const gridResults = [];
    const scoresMatrix = [];

    for (let c = 0; c < gridConfig.cols; c++) {
      const colScores = [];
      const colX = gridConfig.x + (gridConfig.w / (gridConfig.cols - 1 || 1)) * c;
      
      for (let r = 0; r < gridConfig.rows; r++) {
        const rowY = gridConfig.y + (gridConfig.h / (gridConfig.rows - 1 || 1)) * r;
        const coords = getPixelCoords(colX, rowY, adjustments);
        const score = getBubbleDarkness(ctx, imgData, coords.x, coords.y, bubbleRadius);
        colScores.push({ row: r, score, coords });
      }
      scoresMatrix.push(colScores);

      // Find the darkest bubble in this column
      let maxScore = -1;
      let selectedRow = -1;
      for (let r = 0; r < gridConfig.rows; r++) {
        if (colScores[r].score > maxScore) {
          maxScore = colScores[r].score;
          selectedRow = r;
        }
      }

      // If the darkest bubble exceeds threshold, record it, else leave empty
      if (maxScore >= fillThreshold) {
        gridResults.push(selectedRow.toString());
      } else {
        gridResults.push("?"); // Empty or unreadable
      }
    }

    return { value: gridResults.join(""), scores: scoresMatrix };
  }

  // 1. Scan SBD
  const sbdScan = scanGrid(layout.sbd);
  results.sbd = sbdScan.value;
  results.bubbleScores.sbd = sbdScan.scores;

  // 2. Scan Exam Code
  const codeScan = scanGrid(layout.code);
  results.code = codeScan.value;
  results.bubbleScores.code = codeScan.scores;

  // 3. Scan Part I (40 questions, single option A-D)
  const part1Count = template.part1Count;
  const p1Results = Array(part1Count).fill("");
  const p1Scores = [];

  for (let qIdx = 0; qIdx < part1Count; qIdx++) {
    const colNum = Math.floor(qIdx / layout.part1.rows);
    const rowNum = qIdx % layout.part1.rows;

    if (colNum >= layout.part1.cols.length) continue;

    const colConfig = layout.part1.cols[colNum];
    const qY = layout.part1.y + (layout.part1.h / (layout.part1.rows - 1)) * rowNum;
    
    const qScores = [];
    for (let optIdx = 0; optIdx < 4; optIdx++) {
      const optX = colConfig.x + (colConfig.w / (layout.part1.options.length - 1 || 1)) * optIdx;
      const coords = getPixelCoords(optX, qY, adjustments);
      const score = getBubbleDarkness(ctx, imgData, coords.x, coords.y, bubbleRadius);
      qScores.push({ option: layout.part1.options[optIdx], score, coords });
    }
    p1Scores.push({ question: qIdx + 1, scores: qScores });

    // Determine filled bubbles
    let maxScore = -1;
    let secondScore = -1;
    let selectedOpt = "";
    let filledCount = 0;

    for (let optIdx = 0; optIdx < 4; optIdx++) {
      const s = qScores[optIdx].score;
      if (s >= fillThreshold) filledCount++;
      if (s > maxScore) { secondScore = maxScore; maxScore = s; selectedOpt = qScores[optIdx].option; }
      else if (s > secondScore) secondScore = s;
    }

    // Adaptive: light marks (score 15–24) still selected if clearly dominant over others
    const lightMarkSelected = maxScore >= 15 && maxScore < fillThreshold && maxScore >= secondScore * 1.6;

    if (filledCount > 1) {
      p1Results[qIdx] = "MULTIPLE";
    } else if (maxScore >= fillThreshold || lightMarkSelected) {
      p1Results[qIdx] = selectedOpt;
    } else {
      p1Results[qIdx] = "";
    }
  }
  results.part1 = p1Results;
  results.bubbleScores.part1 = p1Scores;

  // 4. Scan Part II (True/False, số câu tuỳ mẫu)
  const part2Count = template.part2Count;
  const p2Results = Array(part2Count).fill(null).map(() => ({ a: "", b: "", c: "", d: "" }));
  const p2Scores = [];

  if (part2Count > 0 && layout.part2) {
  // Số câu mỗi cột = tổng câu / số cột (làm tròn lên để xử lý cột cuối ít câu hơn)
  const p2QsPerCol = Math.ceil(part2Count / layout.part2.cols.length);
  // Tổng số dòng mỗi cột = số câu/cột × 4 ý (a,b,c,d)
  const p2RowsPerCol = p2QsPerCol * 4;

  for (let qIdx = 0; qIdx < part2Count; qIdx++) {
    const colNum = Math.floor(qIdx / p2QsPerCol);
    const subQGroup = qIdx % p2QsPerCol;

    if (colNum >= layout.part2.cols.length) continue;

    const colConfig = layout.part2.cols[colNum];
    const subQScores = { a: [], b: [], c: [], d: [] };
    const subQKeys = ["a", "b", "c", "d"];

    for (let subIdx = 0; subIdx < 4; subIdx++) {
      const overallRowIdx = subQGroup * 4 + subIdx;
      // Chia đều chiều cao theo tổng số dòng của cột (p2RowsPerCol vị trí = p2RowsPerCol-1 khoảng)
      const qY = layout.part2.y + (layout.part2.h / (p2RowsPerCol - 1)) * overallRowIdx;
      const subKey = subQKeys[subIdx];

      const optScores = [];
      // Option 0: Đúng (True), Option 1: Sai (False)
      for (let optIdx = 0; optIdx < 2; optIdx++) {
        // Đúng (T) is left column, Sai (F) is right column
        const optX = colConfig.x + (colConfig.w / 1) * optIdx; // Width divided by 1 gives left (0) and right (1)
        const coords = getPixelCoords(optX, qY, adjustments);
        const score = getBubbleDarkness(ctx, imgData, coords.x, coords.y, bubbleRadius);
        optScores.push({ option: layout.part2.options[optIdx], score, coords });
      }
      subQScores[subKey] = optScores;

      // Classify True/False
      const scoreTrue = optScores[0].score;
      const scoreFalse = optScores[1].score;

      const diff = Math.abs(scoreTrue - scoreFalse);

      if (scoreTrue >= fillThreshold && scoreFalse >= fillThreshold) {
        p2Results[qIdx][subKey] = "BOTH";
      } else if (scoreTrue >= fillThreshold && scoreTrue > scoreFalse && diff > 10) {
        p2Results[qIdx][subKey] = "T"; // Đúng
      } else if (scoreFalse >= fillThreshold && scoreFalse > scoreTrue && diff > 10) {
        p2Results[qIdx][subKey] = "F"; // Sai
      } else {
        p2Results[qIdx][subKey] = ""; // Blank
      }
    }
    p2Scores.push({ question: qIdx + 1, scores: subQScores });
  }
  } // end if (part2Count > 0 && layout.part2)
  results.part2 = p2Results;
  results.bubbleScores.part2 = p2Scores;

  // 5. Scan Part III (6 short answers)
  const part3Count = template.part3Count;
  const p3Results = Array(part3Count).fill("");
  const p3Scores = [];

  for (let qIdx = 0; qIdx < part3Count; qIdx++) {
    const colConfig = layout.part3.cols[qIdx];
    const qScores = {
      sign: null, // Minus sign bubble
      comma: [],  // Comma row (3 columns)
      digits: []  // 0-9 digits (10 rows x 3 columns)
    };

    // Cột ở hàng 2 (mẫu Mở rộng) có thêm độ lệch dọc dy (%)
    const dyOffset = colConfig.dy || 0;

    // 5a. Scan negative sign '-' (Row 1 of the column)
    const signY = layout.part3.y + dyOffset;
    const signX = colConfig.x;
    const signCoords = getPixelCoords(signX, signY, adjustments);
    const signScore = getBubbleDarkness(ctx, imgData, signCoords.x, signCoords.y, bubbleRadius);
    qScores.sign = { score: signScore, coords: signCoords };
    const isNegative = signScore >= fillThreshold;

    // 5b. Scan comma ',' (Row 2 of the column, 3 positions)
    const commaY = layout.part3.y + dyOffset + (layout.part3.h / 11) * 1;
    const commaColScores = [];
    for (let c = 0; c < 3; c++) {
      const commaX = colConfig.x + (colConfig.w / 2) * c;
      const coords = getPixelCoords(commaX, commaY, adjustments);
      const score = getBubbleDarkness(ctx, imgData, coords.x, coords.y, bubbleRadius);
      commaColScores.push({ col: c, score, coords });
    }
    qScores.comma = commaColScores;

    // Find if a comma bubble is filled
    let commaIndex = -1;
    let maxCommaScore = -1;
    for (let c = 0; c < 3; c++) {
      if (commaColScores[c].score > maxCommaScore) {
        maxCommaScore = commaColScores[c].score;
        commaIndex = c;
      }
    }
    const hasComma = maxCommaScore >= fillThreshold ? commaIndex : -1;

    // 5c. Scan digits 0-9 (Rows 3 to 12 of the column, 3 columns)
    const digitsResults = [];
    const digitScoresMatrix = []; // [col][row]

    for (let c = 0; c < 3; c++) {
      const colScores = [];
      const digitX = colConfig.x + (colConfig.w / 2) * c;

      for (let r = 0; r < 10; r++) {
        const digitY = layout.part3.y + dyOffset + (layout.part3.h / 11) * (r + 2);
        const coords = getPixelCoords(digitX, digitY, adjustments);
        const score = getBubbleDarkness(ctx, imgData, coords.x, coords.y, bubbleRadius);
        colScores.push({ digit: r, score, coords });
      }
      digitScoresMatrix.push(colScores);

      // Find darkest digit in this column
      let maxDigitScore = -1;
      let selectedDigit = -1;
      for (let r = 0; r < 10; r++) {
        if (colScores[r].score > maxDigitScore) {
          maxDigitScore = colScores[r].score;
          selectedDigit = r;
        }
      }

      if (maxDigitScore >= fillThreshold) {
        digitsResults.push(selectedDigit);
      } else {
        digitsResults.push(null); // Missing
      }
    }
    qScores.digits = digitScoresMatrix;
    p3Scores.push({ question: qIdx + 1, scores: qScores });

    // Build the short answer text representation
    // We expect 3 columns. E.g. [1, 2, 5] and hasComma = 1 (second digit) -> "12.5"
    let ansText = "";
    let validDigits = 0;
    
    for (let c = 0; c < 3; c++) {
      if (digitsResults[c] !== null) {
        ansText += digitsResults[c].toString();
        validDigits++;
      }
    }

    if (validDigits > 0) {
      // Reconstruct value
      let numberStr = "";
      if (isNegative) numberStr += "-";

      // If a comma was detected, we format the digits
      // E.g. digits: [1, 2, 5]. If comma is at index 0 (after first digit) -> "1,25" (or 1.25)
      // If comma is at index 1 (after second digit) -> "12,5"
      // If no comma, we just output the digit string.
      // Usually:
      // - commaIndex = 0 means comma after column 1: e.g. "X,XX"
      // - commaIndex = 1 means comma after column 2: e.g. "XX,X"
      const d0 = digitsResults[0] !== null ? digitsResults[0].toString() : "";
      const d1 = digitsResults[1] !== null ? digitsResults[1].toString() : "";
      const d2 = digitsResults[2] !== null ? digitsResults[2].toString() : "";

      if (hasComma === 0 && d0 !== "" && (d1 !== "" || d2 !== "")) {
        numberStr += d0 + "." + d1 + d2;
      } else if (hasComma === 1 && d0 !== "" && d1 !== "" && d2 !== "") {
        numberStr += d0 + d1 + "." + d2;
      } else {
        // Just contact digits that exist
        numberStr += d0 + d1 + d2;
      }
      p3Results[qIdx] = numberStr;
    } else {
      p3Results[qIdx] = "";
    }
  }
  results.part3 = p3Results;
  results.bubbleScores.part3 = p3Scores;

  return results;
}
