import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, X, ArrowLeft, RefreshCw, RotateCcw, RotateCw, Upload, Save, Loader } from "lucide-react";
import { SHEET_WIDTH, SHEET_HEIGHT } from "../../utils/constants";
import { scanSheet, preprocessImage, findCornerMarkers, computeAutoCalibration, computeHomography, warpPerspective } from "../../utils/cvEngine";

export default function Scanner({
  imageSrc,
  scanResult,
  adjustments,
  onAdjustmentsChange,
  isLiveCamera,
  isBatchMode,
  onSetBatchMode,
  preset,
  activeTemplate,
  selectedSubject,
  videoRef,
  onStartCamera,
  onStopCamera,
  onCapturePhoto,
  onScanResult,
  onGradeSheet,
  onSetImageSrc,
  onFileUpload,
  fileInputRef,
  showToast,
  isScanning,
  onScanningChange,
  hasSavedCalibration,
  onSaveCalibration,
  onResetCalibration,
}) {
  const previewCanvasRef = useRef(null);
  const debounceRef = useRef(null);
  const autoGradedRef = useRef(false); // chỉ tự chấm 1 lần sau khi ảnh mới được scan

  const [detectedCorners, setDetectedCorners] = useState({ tl: false, tr: false, bl: false, br: false });
  const [isAutoCapture, setIsAutoCapture] = useState(true);
  const autoCaptureIntervalRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const [perspStatus, setPerspStatus] = useState(null); // null | "ok" | "manual"

  const [autoCaptureStatus, setAutoCaptureStatus] = useState("searching"); // "searching" | "holding" | "capturing"
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0); // 0 to 4
  const previousCornersRef = useRef(null);

  const playBeep = () => {
    if (isMutedRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1000, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.1);
      
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
      console.error("Audio beep failed", err);
    }
  };

  useEffect(() => {
    if (!isLiveCamera || !isAutoCapture) {
      setDetectedCorners({ tl: false, tr: false, bl: false, br: false });
      setAutoCaptureStatus("searching");
      setAutoCaptureProgress(0);
      previousCornersRef.current = null;
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
      return;
    }

    const checkCanvas = document.createElement("canvas");
    checkCanvas.width = 400;
    checkCanvas.height = Math.round(400 * (SHEET_HEIGHT / SHEET_WIDTH));
    const checkCtx = checkCanvas.getContext("2d");

    let stableFrames = 0; // Tracks consecutive stable frames with steady alignment

    autoCaptureIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      const videoAspect = video.videoWidth / video.videoHeight;
      const sheetAspect = SHEET_WIDTH / SHEET_HEIGHT;
      let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
      if (videoAspect > sheetAspect) {
        sw = video.videoHeight * sheetAspect;
        sx = (video.videoWidth - sw) / 2;
      } else {
        sh = video.videoWidth / sheetAspect;
        sy = (video.videoHeight - sh) / 2;
      }

      checkCtx.drawImage(video, sx, sy, sw, sh, 0, 0, checkCanvas.width, checkCanvas.height);
      
      // Auto-contrast stretch
      preprocessImage(checkCtx, checkCanvas.width, checkCanvas.height);

      const imgData = checkCtx.getImageData(0, 0, checkCanvas.width, checkCanvas.height);
      
      // Find corner markers using the robust BFS connected-component detector
      const corners = findCornerMarkers(imgData, checkCanvas.width, checkCanvas.height);

      const detection = {
        tl: !!(corners && corners.tl),
        tr: !!(corners && corners.tr),
        bl: !!(corners && corners.bl),
        br: !!(corners && corners.br)
      };
      setDetectedCorners(detection);

      if (corners && corners.tl && corners.tr && corners.bl && corners.br) {
        // 1. Geometrical/alignment sanity checks ("ngay ngắn" check)
        const { tl, tr, bl, br } = corners;
        const wTop = tr.x - tl.x;
        const wBot = br.x - bl.x;
        const hLeft = bl.y - tl.y;
        const hRight = br.y - tr.y;

        const wAvg = (wTop + wBot) / 2;
        const hAvg = (hLeft + hRight) / 2;
        const aspect = wAvg / hAvg;

        const validOrientation = 
          tl.x < tr.x && bl.x < br.x &&
          tl.y < bl.y && tr.y < br.y;

        const validSize = wAvg > 180 && hAvg > 250; // Ensure sheet is close enough
        const validAspect = aspect > 0.58 && aspect < 0.85; // Normal sheet aspect ratio
        const validAlignment = 
          Math.abs(tl.x - bl.x) < 50 && // upright sides not too tilted
          Math.abs(tr.x - br.x) < 50 &&
          Math.abs(tl.y - tr.y) < 40 && // horizontal sides not too tilted
          Math.abs(bl.y - br.y) < 40;

        const isWellAligned = validOrientation && validSize && validAspect && validAlignment;

        if (isWellAligned) {
          // 2. Coordinate stability check (hand-shake check)
          let isSteady = true;
          if (previousCornersRef.current) {
            const prev = previousCornersRef.current;
            const tlDist = Math.hypot(tl.x - prev.tl.x, tl.y - prev.tl.y);
            const trDist = Math.hypot(tr.x - prev.tr.x, tr.y - prev.tr.y);
            const blDist = Math.hypot(bl.x - prev.bl.x, bl.y - prev.bl.y);
            const brDist = Math.hypot(br.x - prev.br.x, br.y - prev.br.y);
            
            // Tolerance is 7 pixels on 400px canvas (approx 1.7% change)
            if (tlDist > 7 || trDist > 7 || blDist > 7 || brDist > 7) {
              isSteady = false;
            }
          }

          if (isSteady) {
            stableFrames++;
            setAutoCaptureStatus("holding");
            setAutoCaptureProgress(stableFrames);

            if (stableFrames >= 4) { // Require 4 consecutive stable ticks (~1000ms)
              clearInterval(autoCaptureIntervalRef.current);
              autoCaptureIntervalRef.current = null;
              setAutoCaptureStatus("capturing");
              playBeep();
              onCapturePhoto();
              showToast("📸 Đã định vị ổn định & tự động chụp!");
            }
          } else {
            stableFrames = 0;
            setAutoCaptureStatus("holding"); // Still trying to align steady
            setAutoCaptureProgress(0);
          }
        } else {
          stableFrames = 0;
          setAutoCaptureStatus("searching"); // Not upright or too far/small
          setAutoCaptureProgress(0);
        }
        previousCornersRef.current = corners;
      } else {
        stableFrames = 0;
        setAutoCaptureStatus("searching");
        setAutoCaptureProgress(0);
        previousCornersRef.current = null;
      }
    }, 250);

    return () => {
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
        autoCaptureIntervalRef.current = null;
      }
    };
  }, [isLiveCamera, isAutoCapture, videoRef, onCapturePhoto, showToast]);

  const runScan = useCallback(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      onScanningChange?.(true);

      // Use setTimeout to let the loading state render before heavy work
      setTimeout(() => {
        canvas.width = SHEET_WIDTH;
        canvas.height = SHEET_HEIGHT;
        const ctx = canvas.getContext("2d");

        // Draw image without rotation — perspective correction will handle alignment
        ctx.drawImage(img, 0, 0, SHEET_WIDTH, SHEET_HEIGHT);
        preprocessImage(ctx, SHEET_WIDTH, SHEET_HEIGHT);

        // Attempt perspective correction using corner markers
        const imgDataForCorners = ctx.getImageData(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
        const corners = findCornerMarkers(imgDataForCorners, SHEET_WIDTH, SHEET_HEIGHT);
        let perspectiveCorrected = false;

        if (corners) {
          const MARGIN = 27;
          // H maps canonical output coords → source (distorted photo) coords (backward mapping)
          const H = computeHomography(
            [{ x: MARGIN, y: MARGIN }, { x: SHEET_WIDTH - MARGIN, y: MARGIN },
             { x: MARGIN, y: SHEET_HEIGHT - MARGIN }, { x: SHEET_WIDTH - MARGIN, y: SHEET_HEIGHT - MARGIN }],
            [corners.tl, corners.tr, corners.bl, corners.br]
          );
          if (H) {
            warpPerspective(imgDataForCorners, ctx, H, SHEET_WIDTH, SHEET_HEIGHT);
            preprocessImage(ctx, SHEET_WIDTH, SHEET_HEIGHT);
            perspectiveCorrected = true;
          }
        }

        // If perspective correction failed, fall back to manual rotation + saved calibration
        if (!perspectiveCorrected && (adjustments.rotation || 0) !== 0) {
          ctx.clearRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
          const rad = (adjustments.rotation * Math.PI) / 180;
          ctx.save();
          ctx.translate(SHEET_WIDTH / 2, SHEET_HEIGHT / 2);
          ctx.rotate(rad);
          ctx.translate(-SHEET_WIDTH / 2, -SHEET_HEIGHT / 2);
          ctx.drawImage(img, 0, 0, SHEET_WIDTH, SHEET_HEIGHT);
          ctx.restore();
          preprocessImage(ctx, SHEET_WIDTH, SHEET_HEIGHT);
        }

        const effectiveAdjustments = perspectiveCorrected
          ? { nudgeX: 0, nudgeY: 0, scaleX: 1, scaleY: 1, rotation: 0 }
          : adjustments;

        setPerspStatus(perspectiveCorrected ? "ok" : "manual");

        // Scan bubbles
        const results = scanSheet(ctx, activeTemplate.layout, effectiveAdjustments, activeTemplate);
        onScanResult(results);

        // Draw overlay on top of preprocessed image
        drawOverlay(ctx, results);
        onScanningChange?.(false);

        // Tự động chấm điểm sau lần scan đầu tiên của mỗi ảnh mới
        if (!autoGradedRef.current) {
          autoGradedRef.current = true;
          onGradeSheet(results);
        }
      }, 16); // one frame delay
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, adjustments, selectedSubject, activeTemplate]);

  // Debounced scan: wait 350ms after last change before running
  useEffect(() => {
    if (!imageSrc) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runScan();
    }, 350);
    return () => clearTimeout(debounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, adjustments, selectedSubject, activeTemplate]);

  // Reset auto-grade flag khi có ảnh mới
  useEffect(() => {
    autoGradedRef.current = false;
  }, [imageSrc]);

  function drawOverlay(ctx, results) {
    const r = 7.5;

    function circle(cx, cy, color, lw) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // SBD
    results.bubbleScores.sbd.forEach((col, colIdx) => {
      col.forEach((b) => {
        const sel = results.sbd[colIdx] === b.row.toString();
        circle(b.coords.x, b.coords.y, sel ? "#10b981" : "rgba(245,158,11,0.4)", sel ? 2 : 1);
      });
    });

    // Exam Code
    results.bubbleScores.code.forEach((col, colIdx) => {
      col.forEach((b) => {
        const sel = results.code[colIdx] === b.row.toString();
        circle(b.coords.x, b.coords.y, sel ? "#10b981" : "rgba(245,158,11,0.4)", sel ? 2 : 1);
      });
    });

    // Part I — orange for MULTIPLE answers
    results.bubbleScores.part1.forEach((q) => {
      const ans = results.part1[q.question - 1];
      const isMultiple = ans === "MULTIPLE";
      q.scores.forEach((b) => {
        const sel = ans === b.option;
        let color = sel ? "#10b981" : "rgba(59,130,246,0.35)";
        if (isMultiple) color = "rgba(245,158,11,0.75)";
        circle(b.coords.x, b.coords.y, color, sel || isMultiple ? 2.2 : 1);
      });
    });

    // Part II
    results.bubbleScores.part2.forEach((q) => {
      const qAns = results.part2[q.question - 1];
      ["a", "b", "c", "d"].forEach((sub) => {
        const subScores = q.scores[sub];
        if (!subScores) return;
        const subAns = qAns?.[sub];
        const isBoth = subAns === "BOTH";
        subScores.forEach((b) => {
          const sel = subAns === b.option;
          let color = sel ? "#10b981" : "rgba(139,92,246,0.35)";
          if (isBoth) color = "rgba(245,158,11,0.75)";
          circle(b.coords.x, b.coords.y, color, sel || isBoth ? 2.2 : 1);
        });
      });
    });

    // Part III
    results.bubbleScores.part3.forEach((q) => {
      const txt = results.part3[q.question - 1] || "";
      const signed = txt.startsWith("-");
      circle(q.scores.sign.coords.x, q.scores.sign.coords.y, signed ? "#10b981" : "rgba(236,72,153,0.35)", signed ? 2.2 : 1);

      const clean = txt.replace("-", "");
      const dotIdx = clean.indexOf(".");
      q.scores.comma.forEach((c) => {
        const sel = dotIdx !== -1 && dotIdx - 1 === c.col;
        circle(c.coords.x, c.coords.y, sel ? "#10b981" : "rgba(236,72,153,0.35)", sel ? 2.2 : 1);
      });

      const cleanNoDot = clean.replace(".", "");
      q.scores.digits.forEach((col, colIdx) => {
        col.forEach((b) => {
          const sel = cleanNoDot[colIdx] !== undefined && parseInt(cleanNoDot[colIdx]) === b.digit;
          circle(b.coords.x, b.coords.y, sel ? "#10b981" : "rgba(236,72,153,0.35)", sel ? 2.2 : 1);
        });
      });
    });
  }

  const handleAutoCalibrate = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.getImageData(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    const corners = findCornerMarkers(imgData, SHEET_WIDTH, SHEET_HEIGHT);
    const calibration = computeAutoCalibration(corners, SHEET_WIDTH, SHEET_HEIGHT);
    if (calibration) {
      onAdjustmentsChange(calibration);
      showToast("Đã tự động căn chỉnh theo góc phiếu!");
    } else {
      showToast("Không phát hiện góc phiếu. Hãy căn chỉnh thủ công.", "warning");
    }
  };

  const resetAdj = () =>
    onAdjustmentsChange({ nudgeX: 0, nudgeY: 0, scaleX: 1.0, scaleY: 1.0, rotation: 0 });

  const nudge = (axis, delta) =>
    onAdjustmentsChange((prev) => ({ ...prev, [axis]: +(prev[axis] + delta).toFixed(4) }));

  const scaleAxis = (axis, delta) =>
    onAdjustmentsChange((prev) => ({
      ...prev,
      [axis]: +(Math.max(0.5, Math.min(2.0, prev[axis] + delta))).toFixed(4),
    }));

  const rotate = (delta) =>
    onAdjustmentsChange((prev) => ({
      ...prev,
      rotation: +(Math.max(-20, Math.min(20, (prev.rotation || 0) + delta))).toFixed(2),
    }));

  const btnBase = "rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 transition-all text-slate-200 font-bold flex items-center justify-center";

  return (
    <div className="space-y-5">
      {/* ── Live Camera ── */}
      {isLiveCamera && (
        <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-black border border-slate-800">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          
          {/* Shutter flash animation overlay */}
          {autoCaptureStatus === "capturing" && (
            <div className="absolute inset-0 bg-white/95 animate-out fade-out duration-300 pointer-events-none z-10" />
          )}

          {/* Alignment guide */}
          <div className={`absolute inset-4 border-2 border-dashed rounded-xl pointer-events-none flex flex-col justify-between p-4 transition-all duration-300 ${
            autoCaptureStatus === "holding"
              ? "border-emerald-400/90 bg-emerald-500/5 shadow-[inset_0_0_30px_rgba(16,185,129,0.25)] animate-pulse"
              : autoCaptureStatus === "capturing"
              ? "border-white bg-white/10"
              : "border-slate-700/50 bg-slate-950/5"
          }`}>
            <div className="flex justify-between">
              <div className={`w-8 h-8 border-t-4 border-l-4 transition-all duration-300 ${detectedCorners.tl ? "border-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-110" : "border-blue-400"}`} />
              <div className={`w-8 h-8 border-t-4 border-r-4 transition-all duration-300 ${detectedCorners.tr ? "border-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-110" : "border-blue-400"}`} />
            </div>
            
            {isAutoCapture ? (
              <div className="flex flex-col gap-2 items-center mx-auto pointer-events-none">
                {autoCaptureStatus === "holding" ? (
                  <div className="text-center text-[10px] bg-emerald-950/95 border border-emerald-500/30 backdrop-blur-md py-1.5 px-3 rounded-full text-emerald-300 font-bold flex items-center gap-1.5 justify-center shadow-lg shadow-emerald-950/50 scale-105 transition-all">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>📸 GIỮ YÊN MÁY... {Math.round((autoCaptureProgress / 4) * 100)}%</span>
                  </div>
                ) : (
                  <div className="text-center text-[9px] bg-slate-950/85 border border-slate-800/80 backdrop-blur-sm py-1.5 px-3 rounded-full text-slate-300 font-semibold flex items-center gap-1.5 justify-center transition-all">
                    {Object.values(detectedCorners).filter(Boolean).length < 4 ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400"></span>
                        </span>
                        <span>Căn 4 góc phiếu vào khung nét đứt ({Object.values(detectedCorners).filter(Boolean).length}/4)</span>
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                        </span>
                        <span>Đang cân chỉnh thẳng góc...</span>
                      </>
                    )}
                  </div>
                )}

                {/* Progress bar */}
                {autoCaptureStatus === "holding" && (
                  <div className="w-36 h-1 bg-slate-950/60 rounded-full overflow-hidden border border-emerald-500/10">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-200" 
                      style={{ width: `${(autoCaptureProgress / 4) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-[10px] bg-slate-900/80 backdrop-blur-sm py-1 px-3 rounded-full text-blue-300 mx-auto font-semibold">
                Căn phiếu vừa khít khung nét đứt
              </p>
            )}

            <div className="flex justify-between">
              <div className={`w-8 h-8 border-b-4 border-l-4 transition-all duration-300 ${detectedCorners.bl ? "border-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-110" : "border-blue-400"}`} />
              <div className={`w-8 h-8 border-b-4 border-r-4 transition-all duration-300 ${detectedCorners.br ? "border-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-110" : "border-blue-400"}`} />
            </div>
          </div>

          {/* Batch toggle */}
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm py-2 px-3 rounded-xl border border-slate-700 flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-300">Chấm liên tục:</span>
            <button
              onClick={() => onSetBatchMode(!isBatchMode)}
              className={`w-10 h-5 rounded-full relative transition-colors ${isBatchMode ? "bg-blue-600" : "bg-slate-700"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isBatchMode ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Smart Auto-Capture Toggle + Mute */}
          <div className="absolute top-4 right-4 flex flex-col gap-1.5">
            <div className="bg-slate-900/80 backdrop-blur-sm py-2 px-3 rounded-xl border border-slate-700 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-300">Tự động chụp:</span>
              <button
                onClick={() => setIsAutoCapture(!isAutoCapture)}
                className={`w-10 h-5 rounded-full relative transition-colors ${isAutoCapture ? "bg-emerald-600" : "bg-slate-700"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isAutoCapture ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <button
              onClick={() => setIsMuted(m => !m)}
              className={`bg-slate-900/80 backdrop-blur-sm py-1.5 px-3 rounded-xl border text-[10px] font-bold transition-all ${isMuted ? "border-amber-700 text-amber-400" : "border-slate-700 text-slate-400"}`}
            >
              {isMuted ? "🔇 Tắt tiếng" : "🔔 Âm thanh"}
            </button>
          </div>

          {/* Capture controls */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-5">
            <button onClick={onStopCamera} className="p-4 rounded-full bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all">
              <X size={22} />
            </button>
            <button onClick={onCapturePhoto} className="p-5 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-90 transition-all border-2 border-blue-400">
              <Camera size={28} />
            </button>
          </div>
        </div>
      )}

      {/* ── Image + Calibration ── */}
      {imageSrc && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => { onSetImageSrc(null); onStopCamera(); }}
              className="flex items-center gap-1 text-xs text-slate-400 font-semibold py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:text-white active:scale-95 transition-all"
            >
              <ArrowLeft size={14} /> Chụp lại
            </button>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold">Liên tục:</span>
              <button
                onClick={() => onSetBatchMode(!isBatchMode)}
                className={`w-9 h-4 rounded-full relative transition-colors ${isBatchMode ? "bg-blue-600" : "bg-slate-700"}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isBatchMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Canvas preview with loading overlay */}
          <div className="relative rounded-2xl overflow-hidden aspect-[800/1130] bg-slate-900 border border-slate-800 shadow-xl">
            <canvas ref={previewCanvasRef} className="w-full h-full object-contain" />
            {isScanning && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <Loader size={28} className="text-blue-400 animate-spin" />
                <span className="text-xs text-slate-300 font-semibold">Đang quét phiếu...</span>
              </div>
            )}
          </div>

          {/* Calibration panel */}
          <div className="p-4 rounded-2xl glass-panel space-y-4 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800 pb-2">
              <span>HIỆU CHỈNH LƯỚI</span>
              <div className="flex gap-3">
                <button onClick={handleAutoCalibrate} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[10px] font-bold">
                  🎯 Tự động
                </button>
                <button onClick={resetAdj} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px] font-bold">
                  <RefreshCw size={10} /> Đặt lại
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Nudge */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 font-bold text-center">DỊCH CHUYỂN</p>
                <div className="grid grid-cols-3 gap-1 max-w-[116px] mx-auto">
                  <div />
                  <button onClick={() => nudge("nudgeY", -0.25)} className={`${btnBase} p-3 text-base`}>↑</button>
                  <div />
                  <button onClick={() => nudge("nudgeX", -0.25)} className={`${btnBase} p-3 text-base`}>←</button>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-[9px] text-slate-500">●</div>
                  <button onClick={() => nudge("nudgeX", 0.25)} className={`${btnBase} p-3 text-base`}>→</button>
                  <div />
                  <button onClick={() => nudge("nudgeY", 0.25)} className={`${btnBase} p-3 text-base`}>↓</button>
                  <div />
                </div>
              </div>

              {/* Scale */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 font-bold text-center">CO GIÃN</p>
                <div className="space-y-1.5 max-w-[116px] mx-auto">
                  <div className="flex gap-1">
                    <button onClick={() => scaleAxis("scaleX", -0.005)} className={`${btnBase} flex-1 py-3 text-[11px]`}>H−</button>
                    <button onClick={() => scaleAxis("scaleX", 0.005)} className={`${btnBase} flex-1 py-3 text-[11px]`}>H+</button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => scaleAxis("scaleY", -0.005)} className={`${btnBase} flex-1 py-3 text-[11px]`}>V−</button>
                    <button onClick={() => scaleAxis("scaleY", 0.005)} className={`${btnBase} flex-1 py-3 text-[11px]`}>V+</button>
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-500 font-bold text-center">XOAY ẢNH</p>
                <div className="flex flex-col items-center gap-1.5 max-w-[116px] mx-auto">
                  <div className="flex gap-1 w-full">
                    <button onClick={() => rotate(-0.5)} className={`${btnBase} flex-1 py-3`}>
                      <RotateCcw size={15} />
                    </button>
                    <button onClick={() => rotate(0.5)} className={`${btnBase} flex-1 py-3`}>
                      <RotateCw size={15} />
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(adjustments.rotation || 0).toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>

            {/* Save calibration row */}
            <div className="flex gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={onSaveCalibration}
                className="flex-1 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 text-[10px] font-bold hover:bg-emerald-900/60 active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <Save size={11} /> Lưu căn chỉnh cho môn này
              </button>
              {hasSavedCalibration && (
                <button
                  onClick={onResetCalibration}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-bold hover:text-red-400 active:scale-95 transition-all"
                  title="Xóa căn chỉnh đã lưu"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Scan info */}
            <div className="border-t border-slate-800 pt-2 space-y-1.5">
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 text-center">
                <div>SBD: <span className="text-emerald-400 font-bold">{scanResult?.sbd || "—"}</span></div>
                <div>Mã đề: <span className="text-emerald-400 font-bold">{scanResult?.code || "—"}</span></div>
              </div>
              {perspStatus && (
                <div className={`text-center text-[9px] font-bold py-0.5 px-2 rounded-lg ${
                  perspStatus === "ok"
                    ? "bg-emerald-900/30 text-emerald-400"
                    : "bg-amber-900/30 text-amber-400"
                }`}>
                  {perspStatus === "ok" ? "✓ Căn chỉnh phối cảnh tự động" : "⚠ Không tìm thấy góc — dùng căn chỉnh thủ công"}
                </div>
              )}
            </div>

            <button
              onClick={() => onGradeSheet()}
              disabled={isScanning}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isScanning
                ? <><Loader size={16} className="animate-spin" /> Đang quét...</>
                : <><RefreshCw size={15} /> Chấm lại</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLiveCamera && !imageSrc && (
        <div className="space-y-4">
          <p className="text-center py-8 text-slate-400 text-sm">Mở camera hoặc tải ảnh lên để bắt đầu.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onStartCamera}
              className="flex flex-col items-center justify-center p-5 rounded-2xl glass-card border border-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Camera size={24} className="text-blue-400 mb-2" />
              <span className="font-bold text-xs text-slate-200">Mở Camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-5 rounded-2xl glass-card border border-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Upload size={24} className="text-emerald-400 mb-2" />
              <span className="font-bold text-xs text-slate-200">Tải ảnh lên</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} onChange={onFileUpload} accept="image/*" className="hidden" />
        </div>
      )}
    </div>
  );
}

