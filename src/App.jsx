import React, { useState, useEffect, useRef } from "react";
import { SHEET_WIDTH, SHEET_HEIGHT, SUBJECT_PRESETS, TEMPLATES, calculatePart2Score } from "./utils/constants";
import Toast from "./components/Toast";
import Header from "./components/Header";
import TabNav from "./components/TabNav";
import ResultModal from "./components/ResultModal";
import Dashboard from "./components/tabs/Dashboard";
import Scanner from "./components/tabs/Scanner";
import Config from "./components/tabs/Config";
import History from "./components/tabs/History";

const MAX_HISTORY = 500;

// Safe localStorage write — warns on QuotaExceededError
function safeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
    if (e && e.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded for key:", key);
    }
  }
}

function loadStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

const DEFAULT_ADJUSTMENTS = { nudgeX: 0, nudgeY: 0, scaleX: 1.0, scaleY: 1.0, rotation: 0 };

export default function App() {
  // ── Navigation ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedSubject, setSelectedSubject] = useState("math");
  const [activeTemplateId, setActiveTemplateId] = useState(() => loadStore("thpt_grader_template", "2025_STANDARD"));
  const [toast, setToast] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  // ── Confirm Dialog ───────────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }

  // ── Answer Keys ─────────────────────────────────────────────────────────────
  const [answerKeys, setAnswerKeys] = useState(() =>
    loadStore("thpt_grader_keys", {
      "101": {
        subject: "math",
        part1: ["A", "B", "C", "D", "A", "B", "C", "D", "A", "B", "C", "D"],
        part2: [
          { a: "T", b: "F", c: "T", d: "F" },
          { a: "F", b: "T", c: "F", d: "T" },
          { a: "T", b: "T", c: "F", d: "F" },
          { a: "F", b: "F", c: "T", d: "T" },
        ],
        part3: ["1.5", "-2.5", "100", "0.75", "-50", "3.5"],
      },
    })
  );
  const [activeExamCode, setActiveExamCode] = useState("101");

  // ── History ──────────────────────────────────────────────────────────────────
  const [historyList, setHistoryList] = useState(() => loadStore("thpt_grader_history", []));
  const [historySubTab, setHistorySubTab] = useState("list");

  // ── Camera / Image ───────────────────────────────────────────────────────────
  const [imageSrc, setImageSrc] = useState(null);
  const [isLiveCamera, setIsLiveCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isBatchMode, setIsBatchMode] = useState(false);

  // ── Calibration ──────────────────────────────────────────────────────────────
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);
  const [savedCalibrations, setSavedCalibrations] = useState(() =>
    loadStore("thpt_grader_calibrations", {})
  );

  // ── Scan / Grade ─────────────────────────────────────────────────────────────
  const [scanResult, setScanResult] = useState(null);
  const [gradingResult, setGradingResult] = useState(null);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [tempStudentName, setTempStudentName] = useState("");

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const videoRef       = useRef(null);
  const fileInputRef   = useRef(null);
  const backupImportRef = useRef(null);

  const preset = SUBJECT_PRESETS[selectedSubject];

  // ── Persist to localStorage ──────────────────────────────────────────────────
  useEffect(() => { safeStore("thpt_grader_keys",         answerKeys);        }, [answerKeys]);
  useEffect(() => { safeStore("thpt_grader_history",      historyList);       }, [historyList]);
  useEffect(() => { safeStore("thpt_grader_calibrations", savedCalibrations); }, [savedCalibrations]);
  useEffect(() => { safeStore("thpt_grader_template",     activeTemplateId);  }, [activeTemplateId]);

  // ── Reset scan khi đổi mẫu phiếu ──────────────────────────────────────────────
  const prevTemplateRef = useRef(activeTemplateId);
  useEffect(() => {
    if (prevTemplateRef.current !== activeTemplateId) {
      prevTemplateRef.current = activeTemplateId;
      if (imageSrc) {
        setScanResult(null);
        showToast("Đã đổi mẫu phiếu — kết quả quét được làm mới.", "warning");
      }
      // Apply calibration of the new template if it exists
      setAdjustments(savedCalibrations[activeTemplateId] ?? DEFAULT_ADJUSTMENTS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplateId]);


  // ── Save/reset calibration profile keyed by templateId ──────────────────────
  const saveCalibration = () => {
    setSavedCalibrations((prev) => ({ ...prev, [activeTemplateId]: adjustments }));
    showToast(`Đã lưu căn chỉnh cho mẫu phiếu "${TEMPLATES[activeTemplateId].name}"!`);
  };

  const resetCalibration = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setSavedCalibrations((prev) => {
      const next = { ...prev };
      delete next[activeTemplateId];
      return next;
    });
    showToast("Đã xóa cấu hình căn chỉnh đã lưu.", "warning");
  };

  // ── Custom Confirm Dialog ─────────────────────────────────────────────────────
  const showConfirm = (message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  };

  const handleConfirmDialogClose = (confirmed) => {
    if (confirmed && confirmDialog?.onConfirm) confirmDialog.onConfirm();
    setConfirmDialog(null);
  };

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Don't fire shortcuts when typing in an input/textarea/select
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;

      // Esc — close any open modal/dialog
      if (e.key === "Escape") {
        if (confirmDialog) { setConfirmDialog(null); return; }
        if (gradingResult) { setGradingResult(null); stopCamera(); return; }
        if (isLiveCamera) { stopCamera(); return; }
      }

      // Ctrl / Cmd combos
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "g": // Ctrl+G → Grade sheet
            e.preventDefault();
            if (activeTab === "scanner" && imageSrc && !gradingResult) gradeSheet();
            break;
          case "s": // Ctrl+S → Save result
            e.preventDefault();
            if (gradingResult) { setIsEditingResult(false); saveToHistory(); }
            break;
          case "h": // Ctrl+H → History tab
            e.preventDefault();
            handleTabChange("history");
            break;
          case "k": // Ctrl+K → Scanner tab
            e.preventDefault();
            handleTabChange("scanner");
            break;
          case "d": // Ctrl+D → Dashboard tab
            e.preventDefault();
            handleTabChange("dashboard");
            break;
          default: break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmDialog, gradingResult, isLiveCamera, activeTab, imageSrc]);

  // ── Confetti ──────────────────────────────────────────────────────────────────
  const triggerConfetti = () => {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
    const particles = Array.from({ length: 100 }, () => ({
      x: canvas.width / 2, y: canvas.height * 0.8,
      vx: (Math.random() - 0.5) * 15,
      vy: -Math.random() * 20 - 5,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1, gravity: 0.5,
    }));
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach((p) => {
        if (p.alpha <= 0) return;
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.alpha -= 0.015;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        alive = true;
      });
      if (alive) requestAnimationFrame(animate); else canvas.remove();
    };
    animate();
  };

  // ── Demo Sheet ────────────────────────────────────────────────────────────────
  const loadDemoSheet = () => {
    const canvas = document.createElement("canvas");
    canvas.width = SHEET_WIDTH;
    canvas.height = SHEET_HEIGHT;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#fafaf7";
    ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);

    // Corner markers
    ctx.fillStyle = "#0f172a";
    const sq = 25;
    ctx.fillRect(15, 15, sq, sq);
    ctx.fillRect(SHEET_WIDTH - 15 - sq, 15, sq, sq);
    ctx.fillRect(15, SHEET_HEIGHT - 15 - sq, sq, sq);
    ctx.fillRect(SHEET_WIDTH - 15 - sq, SHEET_HEIGHT - 15 - sq, sq, sq);

    ctx.strokeStyle = "rgba(239,68,68,0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 110, 480, 200);
    ctx.strokeRect(520, 110, 250, 200);

    ctx.fillStyle = "rgba(220,38,38,0.8)";
    ctx.font = "bold 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("PHIẾU TRẢ LỜI TRẮC NGHIỆM", SHEET_WIDTH / 2 - 100, 70);
    ctx.font = "14px system-ui";
    ctx.fillText("PHẦN I", 80, 345);
    ctx.fillText("PHẦN II", 80, 555);
    ctx.fillText("PHẦN III", 85, 715);

    const mockSBD  = "123456";
    const mockCode = "101";
    const activeTemplate = TEMPLATES[activeTemplateId];

    // Sinh đáp án demo đủ số câu cho mỗi phần theo template đang chọn
    const p1Opts = ["A", "B", "C", "D"];
    const targetP1 = Array.from({ length: activeTemplate.part1Count }, (_, i) => p1Opts[i % 4]);

    const p2Pattern = [
      { a:"T", b:"F", c:"T", d:"F" },
      { a:"F", b:"T", c:"F", d:"T" },
      { a:"T", b:"T", c:"F", d:"F" },
      { a:"F", b:"F", c:"T", d:"T" },
    ];
    const targetP2 = Array.from({ length: activeTemplate.part2Count }, (_, i) => ({ ...p2Pattern[i % 4] }));

    const p3Samples = ["1.5", "-2.5", "100", "0.75", "-50", "3.5", "8", "25", "0.5", "-7",
                       "12", "4.5", "-3", "50", "9", "6.5"];
    const targetP3 = Array.from({ length: activeTemplate.part3Count }, (_, i) => p3Samples[i % p3Samples.length]);

    // Cập nhật đáp án mã đề "101" khớp với dữ liệu demo để chấm đúng
    setAnswerKeys((prev) => ({
      ...prev,
      [mockCode]: {
        subject: selectedSubject,
        part1: [...targetP1],
        part2: targetP2.map((q) => ({ ...q })),
        part3: [...targetP3],
      },
    }));

    const drawBubble = (cx, cy, label, filled, r = 7) => {
      ctx.strokeStyle = "rgba(239,68,68,0.75)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(239,68,68,0.5)";
      ctx.font = "8px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy);
      if (filled) {
        ctx.fillStyle = "#334155";
        ctx.beginPath(); ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1e293b";
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(cx + (Math.random() - 0.5) * 4, cy + (Math.random() - 0.5) * 4, r / 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const { sbd: sbdC, code: codeC, part1: p1C, part2: p2C, part3: p3C } = TEMPLATES[activeTemplateId].layout;

    for (let c = 0; c < sbdC.cols; c++) {
      const cx = (sbdC.x / 100 * SHEET_WIDTH) + (sbdC.w / 100 * SHEET_WIDTH / (sbdC.cols - 1)) * c;
      const td = parseInt(mockSBD[c]);
      for (let r = 0; r < sbdC.rows; r++) {
        const cy = (sbdC.y / 100 * SHEET_HEIGHT) + (sbdC.h / 100 * SHEET_HEIGHT / (sbdC.rows - 1)) * r;
        drawBubble(cx, cy, r.toString(), r === td);
      }
    }
    for (let c = 0; c < codeC.cols; c++) {
      const cx = (codeC.x / 100 * SHEET_WIDTH) + (codeC.w / 100 * SHEET_WIDTH / (codeC.cols - 1)) * c;
      const td = parseInt(mockCode[c]);
      for (let r = 0; r < codeC.rows; r++) {
        const cy = (codeC.y / 100 * SHEET_HEIGHT) + (codeC.h / 100 * SHEET_HEIGHT / (codeC.rows - 1)) * r;
        drawBubble(cx, cy, r.toString(), r === td);
      }
    }
    if (p1C) {
      for (let q = 0; q < activeTemplate.part1Count; q++) {
        const col = Math.floor(q / p1C.rows), row = q % p1C.rows;
        if (col >= p1C.cols.length) continue;
        const colCfg = p1C.cols[col];
        const qY = (p1C.y / 100 * SHEET_HEIGHT) + (p1C.h / 100 * SHEET_HEIGHT / (p1C.rows - 1)) * row;
        const ans = targetP1[q] || "";
        for (let o = 0; o < 4; o++) {
          const opt = p1C.options[o];
          const cx = (colCfg.x / 100 * SHEET_WIDTH) + (colCfg.w / 100 * SHEET_WIDTH / (p1C.options.length - 1)) * o;
          drawBubble(cx, qY, opt, opt === ans);
        }
      }
    }
    
    if (p2C) {
      const subQKeys = ["a","b","c","d"];
      const qsPerCol = activeTemplate.part2Count / p2C.cols.length;
      for (let q = 0; q < activeTemplate.part2Count; q++) {
        const col = Math.floor(q / qsPerCol), sg = q % qsPerCol;
        if (col >= p2C.cols.length) continue;
        const colCfg = p2C.cols[col];
        const qa = targetP2[q] || { a:"",b:"",c:"",d:"" };
        for (let s = 0; s < 4; s++) {
          const ri = sg * 4 + s;
          const numRows = p2C.rows * qsPerCol;
          const qY = (p2C.y / 100 * SHEET_HEIGHT) + (p2C.h / 100 * SHEET_HEIGHT / (numRows - 1 || 1)) * ri;
          const sub = subQKeys[s];
          for (let o = 0; o < 2; o++) {
            const opt = p2C.options[o];
            const cx = (colCfg.x / 100 * SHEET_WIDTH) + (colCfg.w / 100 * SHEET_WIDTH) * o;
            drawBubble(cx, qY, opt === "T" ? "Đ" : "S", opt === qa[sub]);
          }
        }
      }
    }

    if (p3C) {
      for (let q = 0; q < activeTemplate.part3Count; q++) {
        if (q >= p3C.cols.length) continue;
        const colCfg = p3C.cols[q];
        const ans = targetP3[q] || "";
        const neg = ans.startsWith("-");
        const clean = ans.replace("-", "");
        const hasDot = clean.includes(".");
        const digits = clean.replace(".", "").split("");
        const [d0,d1,d2] = [digits[0]||"", digits[1]||"", digits[2]||""];
        const commaIdx = hasDot ? clean.indexOf(".") - 1 : -1;

        const signY = (p3C.y / 100 * SHEET_HEIGHT);
        const yOffset = colCfg.dy ? (colCfg.dy / 100 * SHEET_HEIGHT) : 0;
        const actualSignY = signY + yOffset;
        drawBubble((colCfg.x / 100 * SHEET_WIDTH), actualSignY, "-", neg);

        const commaY = actualSignY + (p3C.h / 100 * SHEET_HEIGHT / 11);
        for (let c = 0; c < 3; c++) {
          const cx = (colCfg.x / 100 * SHEET_WIDTH) + (colCfg.w / 100 * SHEET_WIDTH / 2) * c;
          drawBubble(cx, commaY, ",", c === commaIdx);
        }
        const filledDigits = [d0,d1,d2];
        for (let c = 0; c < 3; c++) {
          const cx = (colCfg.x / 100 * SHEET_WIDTH) + (colCfg.w / 100 * SHEET_WIDTH / 2) * c;
          const fd = filledDigits[c] !== "" ? parseInt(filledDigits[c]) : -1;
          for (let r = 0; r < 10; r++) {
            const cy = actualSignY + (p3C.h / 100 * SHEET_HEIGHT / 11) * (r + 2);
            drawBubble(cx, cy, r.toString(), r === fd);
          }
        }
      }
    }

    setImageSrc(canvas.toDataURL("image/jpeg"));
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setScanResult(null);
    setActiveTab("scanner");
    showToast("Đã tải phiếu mẫu giả lập để chấm thử!");
  };

  // ── Camera ────────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("Trình duyệt không hỗ trợ camera. Thử Chrome/Safari hoặc dùng HTTPS.", "error");
      setActiveTab("scanner");
      return;
    }
    setIsLiveCamera(true);
    setImageSrc(null);
    setScanResult(null);
    setActiveTab("scanner");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      let msg = "Không thể truy cập camera. ";
      if      (err.name === "NotAllowedError")   msg += "Cấp quyền camera trong cài đặt trình duyệt.";
      else if (err.name === "NotFoundError")     msg += "Không tìm thấy camera trên thiết bị.";
      else if (err.name === "NotReadableError")  msg += "Camera đang dùng bởi ứng dụng khác.";
      else                                       msg += "Thử tải ảnh lên thay thế.";
      showToast(msg, "error");
      setIsLiveCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) { cameraStream.getTracks().forEach((t) => t.stop()); setCameraStream(null); }
    setIsLiveCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = SHEET_WIDTH;
    canvas.height = SHEET_HEIGHT;
    const ctx = canvas.getContext("2d");
    // Preserve A4 aspect ratio: letterbox horizontally if needed
    const videoAspect = video.videoWidth / video.videoHeight;
    const sheetAspect = SHEET_WIDTH / SHEET_HEIGHT;
    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
    if (videoAspect > sheetAspect) {
      // Video is wider — crop sides
      sw = video.videoHeight * sheetAspect;
      sx = (video.videoWidth - sw) / 2;
    } else {
      // Video is taller — crop top/bottom
      sh = video.videoWidth / sheetAspect;
      sy = (video.videoHeight - sh) / 2;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    setImageSrc(canvas.toDataURL("image/jpeg", 0.92));
    setAdjustments(savedCalibrations[activeTemplateId] ?? DEFAULT_ADJUSTMENTS);
    setScanResult(null);
    stopCamera();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target.result);
      setAdjustments(savedCalibrations[activeTemplateId] ?? DEFAULT_ADJUSTMENTS);
      setScanResult(null);
      stopCamera();
      setActiveTab("scanner");
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset so same file can be re-selected
  };

  // ── Grading ───────────────────────────────────────────────────────────────────
  // Accepts optional scanOverride to avoid stale-state issue when editing results
  const gradeSheet = (scanOverride = null) => {
    const result = scanOverride ?? scanResult;
    if (!result) return;

    const key = answerKeys[result.code] || answerKeys["101"];
    if (!key) {
      showToast(`Mã đề ${result.code || "Trống"} chưa có đáp án. Dùng mã đề 101.`, "warning");
    }
    const keyToUse = key || Object.values(answerKeys)[0];
    if (!keyToUse) return;

    let p1Score = 0, p2Score = 0, p3Score = 0;
    const p1BD = [], p2BD = [], p3BD = [];

    const activeTemplate = TEMPLATES[activeTemplateId];

    // Cảnh báo nếu số câu môn học không khớp với mẫu phiếu
    if (activeTemplate.part1Count !== preset.part1Count ||
        activeTemplate.part2Count !== preset.part2Count ||
        activeTemplate.part3Count !== preset.part3Count) {
      showToast(
        `⚠️ Môn ${preset.name} không khớp mẫu phiếu (${activeTemplate.name}). Điểm có thể sai.`,
        "warning"
      );
    }

    for (let i = 0; i < activeTemplate.part1Count; i++) {
      const s = result.part1[i] || "", c = keyToUse.part1[i] || "";
      const ok = s !== "" && s !== "MULTIPLE" && s === c;
      if (ok) p1Score += preset.part1Weight;
      p1BD.push({ num: i + 1, student: s, correct: c, isCorrect: ok });
    }

    for (let i = 0; i < activeTemplate.part2Count; i++) {
      const sa = result.part2[i] || { a:"",b:"",c:"",d:"" };
      const ca = keyToUse.part2[i]  || { a:"",b:"",c:"",d:"" };
      let cc = 0;
      const subBD = {};
      ["a","b","c","d"].forEach((sub) => {
        const ss = sa[sub] || "", cs = ca[sub] || "";
        const ok = ss !== "" && ss !== "BOTH" && ss === cs;
        if (ok) cc++;
        subBD[sub] = { student: ss, correct: cs, isCorrect: ok };
      });
      const qScore = calculatePart2Score(cc);
      p2Score += qScore;
      p2BD.push({ num: i + 1, subAnswers: subBD, correctCount: cc, score: qScore });
    }

    for (let i = 0; i < activeTemplate.part3Count; i++) {
      const s = result.part3[i] || "", c = keyToUse.part3[i] || "";
      const parse = (v) => v ? parseFloat(v.replace(",", ".")) : null;
      const sn = parse(s), cn = parse(c);
      const ok = sn !== null && cn !== null && sn === cn;
      if (ok) p3Score += preset.part3Weight;
      p3BD.push({ num: i + 1, student: s, correct: c, isCorrect: ok });
    }

    const total = Math.round(Math.min(10.0, p1Score + p2Score + p3Score) * 100) / 100;

    const summary = {
      subject: selectedSubject,
      sbd:        result.sbd.replace(/\?/g, ""),
      examCode:   result.code.replace(/\?/g, ""),
      part1Score: p1Score, part2Score: p2Score, part3Score: p3Score,
      totalScore: total,
      p1Breakdown: p1BD, p2Breakdown: p2BD, p3Breakdown: p3BD,
    };

    if (isBatchMode) {
      addToHistory({
        studentName: `Thí sinh SBD ${summary.sbd || "Trống"}`,
        sbd: summary.sbd, examCode: summary.examCode,
        subjectName: preset.name,
        templateId: activeTemplateId,
        templateName: activeTemplate.name,
        totalScore: total,
        gradedAt: new Date().toLocaleString("vi-VN"),
        breakdown: { part1: p1BD, part2: p2BD, part3: p3BD },
      });
      showToast(`Chấm xong! SBD: ${summary.sbd || "?"} — Điểm: ${total.toFixed(2)}`);
      setImageSrc(null); setScanResult(null);
      setTimeout(startCamera, 1500);
    } else {
      setGradingResult(summary);
      setTempStudentName("");
      setIsEditingResult(false);
      if (total === 10) triggerConfetti();
    }
  };

  const addToHistory = (record) => {
    setHistoryList((prev) => {
      const next = [{ id: Date.now(), ...record }, ...prev];
      if (next.length > MAX_HISTORY) {
        showToast(`Đã đạt ${MAX_HISTORY} bài. Xóa bớt lịch sử cũ để tránh mất dữ liệu.`, "warning");
        return next.slice(0, MAX_HISTORY);
      }
      return next;
    });
  };

  const saveToHistory = () => {
    if (!gradingResult) return;
    addToHistory({
      studentName: tempStudentName.trim() || `Thí sinh SBD ${gradingResult.sbd || "Trống"}`,
      sbd:          gradingResult.sbd,
      examCode:     gradingResult.examCode,
      subjectName:  preset.name,
      templateId:   activeTemplateId,
      templateName: TEMPLATES[activeTemplateId].name,
      totalScore:   gradingResult.totalScore,
      gradedAt:     new Date().toLocaleString("vi-VN"),
      breakdown:    { part1: gradingResult.p1Breakdown, part2: gradingResult.p2Breakdown, part3: gradingResult.p3Breakdown },
    });
    showToast("Đã lưu kết quả chấm điểm!");
    setGradingResult(null);
    setImageSrc(null);
    setActiveTab("history");
    setHistorySubTab("list");
  };

  // ── Edit Scan Result ──────────────────────────────────────────────────────────
  const handleEditResultChange = (part, index, value, subKey = null) => {
    if (!scanResult) return;
    // Clone deeply enough to avoid mutation
    const updated = {
      ...scanResult,
      part1: [...scanResult.part1],
      part2: scanResult.part2.map((q) => ({ ...q })),
      part3: [...scanResult.part3],
    };
    if (part === "part1")      updated.part1[index] = value;
    else if (part === "part2") updated.part2[index][subKey] = value;
    else if (part === "part3") updated.part3[index] = value;
    else if (part === "sbd")   updated.sbd = value;
    else if (part === "code")  updated.code = value;

    setScanResult(updated);
    gradeSheet(updated); // Pass directly — avoids stale state, no setTimeout needed
  };

  // ── History Actions ───────────────────────────────────────────────────────────
  const deleteHistoryItem = (id) => {
    showConfirm("Xóa bản ghi này?", () => {
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
      showToast("Đã xóa bản ghi!");
    });
  };

  const clearAllHistory = () => {
    if (historyList.length === 0) return;
    showConfirm(`Xóa toàn bộ ${historyList.length} bản ghi? Hành động này KHÔNG thể hoàn tác!`, () => {
      setHistoryList([]);
      showToast("Đã xóa sạch lịch sử!", "warning");
    });
  };

  const exportHistoryToCSV = () => {
    if (historyList.length === 0) { showToast("Lịch sử trống!", "error"); return; }
    let csv = "﻿STT,Thời gian,Họ và tên,Môn thi,Số báo danh,Mã đề,Điểm số\n";
    historyList.forEach((item, i) => {
      csv += `${i + 1},"${item.gradedAt}","${item.studentName}","${item.subjectName}","${item.sbd}","${item.examCode}",${item.totalScore}\n`;
    });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `Ket_Qua_${Date.now()}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const exportBackup = () => {
    const data = JSON.stringify({ history: historyList, keys: answerKeys }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `THPT_Backup_${Date.now()}.json` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast("Đã xuất tệp sao lưu!");
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        // Validate schema
        const validHistory = Array.isArray(parsed.history) &&
          parsed.history.every((r) => typeof r.id !== "undefined" && typeof r.totalScore === "number");
        const validKeys = parsed.keys && typeof parsed.keys === "object" &&
          Object.values(parsed.keys).every((k) => Array.isArray(k.part1));
        if (validHistory && validKeys) {
          setHistoryList(parsed.history);
          setAnswerKeys(parsed.keys);
          showToast(`Khôi phục thành công: ${parsed.history.length} bài thi, ${Object.keys(parsed.keys).length} mã đề!`);
        } else {
          showToast("File sao lưu không hợp lệ hoặc bị hỏng!", "error");
        }
      } catch {
        showToast("Lỗi đọc file sao lưu! File không đúng định dạng JSON.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Tab navigation ────────────────────────────────────────────────────────────
  const handleTabChange = (tab) => {
    if (tab !== "scanner") stopCamera();
    setActiveTab(tab);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto relative overflow-x-hidden border-x border-slate-800 shadow-2xl">
      <Toast toast={toast} />

      <Header 
        selectedSubject={selectedSubject} 
        setSelectedSubject={setSelectedSubject} 
        activeTemplateId={activeTemplateId}
        setActiveTemplateId={setActiveTemplateId}
      />

      <main className="flex-1 p-5 pb-24 overflow-y-auto">
        {activeTab === "dashboard" && (
          <Dashboard
            historyList={historyList}
            onLoadDemo={loadDemoSheet}
            onStartCamera={startCamera}
            onTriggerFileInput={() => fileInputRef.current?.click()}
            onFileUpload={handleFileUpload}
            fileInputRef={fileInputRef}
            onNavigateHistory={() => { handleTabChange("history"); setHistorySubTab("list"); }}
          />
        )}

        {activeTab === "scanner" && (
          <Scanner
            imageSrc={imageSrc}
            scanResult={scanResult}
            activeTemplate={TEMPLATES[activeTemplateId]}
            adjustments={adjustments}
            onAdjustmentsChange={setAdjustments}
            isLiveCamera={isLiveCamera}
            isBatchMode={isBatchMode}
            onSetBatchMode={setIsBatchMode}
            preset={preset}
            selectedSubject={selectedSubject}
            videoRef={videoRef}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onCapturePhoto={capturePhoto}
            onScanResult={setScanResult}
            onGradeSheet={gradeSheet}
            onSetImageSrc={(src) => { setImageSrc(src); setScanResult(null); }}
            onFileUpload={handleFileUpload}
            fileInputRef={fileInputRef}
            showToast={showToast}
            isScanning={isScanning}
            onScanningChange={setIsScanning}
            hasSavedCalibration={!!savedCalibrations[activeTemplateId]}
            onSaveCalibration={saveCalibration}
            onResetCalibration={resetCalibration}
          />
        )}

        {activeTab === "config" && (
          <Config
            activeExamCode={activeExamCode}
            setActiveExamCode={setActiveExamCode}
            answerKeys={answerKeys}
            setAnswerKeys={setAnswerKeys}
            preset={preset}
            activeTemplate={TEMPLATES[activeTemplateId]}
            selectedSubject={selectedSubject}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        )}

        {activeTab === "history" && (
          <History
            historyList={historyList}
            historySubTab={historySubTab}
            onSetHistorySubTab={setHistorySubTab}
            onDeleteItem={deleteHistoryItem}
            onClearAll={clearAllHistory}
            onExportCSV={exportHistoryToCSV}
            onExportBackup={exportBackup}
            onImportBackup={importBackup}
            backupImportRef={backupImportRef}
            preset={preset}
          />
        )}
      </main>

      {gradingResult && (
        <ResultModal
          gradingResult={gradingResult}
          scanResult={scanResult}
          tempStudentName={tempStudentName}
          onSetTempStudentName={setTempStudentName}
          isEditingResult={isEditingResult}
          onSetEditingResult={setIsEditingResult}
          onSave={saveToHistory}
          onClose={() => { setGradingResult(null); stopCamera(); }}
          onEditChange={handleEditResultChange}
        />
      )}

      {/* ── Custom Confirm Dialog ── */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-5">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
            <p className="text-sm text-slate-200 font-medium leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmDialogClose(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={() => handleConfirmDialogClose(true)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      <TabNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
