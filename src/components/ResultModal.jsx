import { useState } from "react";
import { CheckCircle, X, Edit3, Save, AlertTriangle, ImageDown, Loader } from "lucide-react";

export default function ResultModal({
  gradingResult,
  scanResult,
  tempStudentName,
  onSetTempStudentName,
  isEditingResult,
  onSetEditingResult,
  onSave,
  onClose,
  onEditChange,
}) {
  const [isExporting, setIsExporting] = useState(false);
  if (!gradingResult) return null;

  // Collect warnings for problematic answers
  const warnings = [];
  if (scanResult) {
    scanResult.part1.forEach((ans, i) => {
      if (i >= gradingResult.p1Breakdown.length) return;
      if (ans === "MULTIPLE") warnings.push(`Phần I Câu ${i + 1}: Tô nhiều ô`);
      else if (ans === "") warnings.push(`Phần I Câu ${i + 1}: Bỏ trống`);
    });
    scanResult.part2.forEach((q, i) => {
      if (i >= gradingResult.p2Breakdown.length) return;
      ["a", "b", "c", "d"].forEach((sub) => {
        if (q[sub] === "BOTH") warnings.push(`Phần II Câu ${i + 1}${sub}: Tô cả Đ lẫn S`);
      });
    });
    scanResult.part3.forEach((ans, i) => {
      if (i >= gradingResult.p3Breakdown.length) return;
      if (ans === "") warnings.push(`Phần III Câu ${i + 1}: Bỏ trống`);
    });
  }

  const score = gradingResult.totalScore;
  const scoreColor =
    score >= 8.0 ? "from-emerald-400 to-teal-300"
    : score >= 5.0 ? "from-blue-400 to-indigo-300"
    : "from-red-400 to-rose-300";

  // ── Export to PNG via Canvas ────────────────────────────────────────────────
  const exportResultImage = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const W = 540, PAD = 32;
        const p1 = gradingResult.p1Breakdown || [];
        const p2 = gradingResult.p2Breakdown || [];
        const p3 = gradingResult.p3Breakdown || [];
        // Estimate height
        const p1Rows = Math.ceil(p1.length / 4);
        const p2Rows = p2.length;
        const p3Rows = Math.ceil(p3.length / 4);
        const H = 320 + p1Rows * 28 + p2Rows * 52 + p3Rows * 28 + 60;

        const canvas = document.createElement("canvas");
        canvas.width = W * 2; canvas.height = H * 2; // retina
        const ctx = canvas.getContext("2d");
        ctx.scale(2, 2);

        // Background
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);

        // Header bar
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, "#1e3a8a"); grad.addColorStop(1, "#312e81");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.roundRect(PAD, PAD, W - PAD * 2, 68, 14); ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 15px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("PHIẾU KẾT QUẢ THI", W / 2, PAD + 24);
        ctx.font = "11px system-ui";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`Môn: ${gradingResult.subjectName || "---"} — Mã đề: ${gradingResult.examCode || "?"}`, W / 2, PAD + 44);
        ctx.fillStyle = "#7dd3fc";
        ctx.fillText(`SBD: ${gradingResult.sbd || "?"}  |  Thí sinh: ${tempStudentName || "(chưa điền)"}`, W / 2, PAD + 62);

        // Score circle
        let cy = PAD + 68 + 58;
        ctx.beginPath(); ctx.arc(W / 2, cy, 46, 0, Math.PI * 2);
        ctx.strokeStyle = score >= 8 ? "#10b981" : score >= 5 ? "#3b82f6" : "#ef4444";
        ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = score >= 8 ? "#10b981" : score >= 5 ? "#60a5fa" : "#f87171";
        ctx.font = "bold 28px system-ui"; ctx.textAlign = "center";
        ctx.fillText(score.toFixed(2), W / 2, cy + 10);
        ctx.fillStyle = "#64748b"; ctx.font = "10px system-ui";
        ctx.fillText(`I: ${gradingResult.part1Score.toFixed(2)}  II: ${gradingResult.part2Score.toFixed(2)}  III: ${gradingResult.part3Score.toFixed(2)}`, W / 2, cy + 32);

        let y = cy + 58;

        const drawSection = (title, color) => {
          ctx.fillStyle = color; ctx.font = "bold 11px system-ui"; ctx.textAlign = "left";
          ctx.fillText(title, PAD, y);
          ctx.strokeStyle = color + "44"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(PAD + ctx.measureText(title).width + 8, y - 4); ctx.lineTo(W - PAD, y - 4); ctx.stroke();
          y += 14;
        };

        const drawGrid = (items, cols, render) => {
          const cellW = (W - PAD * 2) / cols;
          items.forEach((item, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const x = PAD + col * cellW;
            const cy2 = y + row * 26;
            ctx.fillStyle = item.isCorrect ? "#052e16" : "#3f0f1a";
            ctx.beginPath(); ctx.roundRect(x + 2, cy2 - 14, cellW - 4, 22, 5); ctx.fill();
            ctx.fillStyle = item.isCorrect ? "#6ee7b7" : "#fca5a5";
            ctx.font = "10px system-ui"; ctx.textAlign = "center";
            render(item, x + cellW / 2, cy2);
          });
          y += Math.ceil(items.length / cols) * 26 + 6;
        };

        if (p1.length) {
          drawSection("PHẦN I — Trắc nghiệm đơn", "#60a5fa");
          drawGrid(p1, 4, (q, x, cy2) => {
            ctx.fillText(`Câu ${q.num}: ${q.student || "Ø"} ${q.isCorrect ? "✓" : "✗"}`, x, cy2 + 1);
          });
        }
        if (p2.length) {
          drawSection("PHẦN II — Đúng / Sai", "#818cf8");
          p2.forEach((q) => {
            ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.roundRect(PAD, y - 14, W - PAD * 2, 40, 6); ctx.fill();
            ctx.fillStyle = "#94a3b8"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "left";
            ctx.fillText(`Câu ${q.num} (${q.correctCount}/4 ý) +${(q.score || 0).toFixed(2)}đ`, PAD + 8, y + 2);
            const subs = ["a","b","c","d"];
            subs.forEach((s, si) => {
              const sub = q.subAnswers?.[s];
              if (!sub) return;
              const sx = PAD + 8 + si * 80;
              ctx.fillStyle = sub.isCorrect ? "#6ee7b7" : "#fca5a5";
              ctx.font = "10px system-ui"; ctx.textAlign = "left";
              ctx.fillText(`${s}) ${sub.student === "T" ? "Đ" : "S"} ${sub.isCorrect ? "✓" : "✗"}`, sx, y + 22);
            });
            y += 50;
          });
          y += 4;
        }
        if (p3.length) {
          drawSection("PHẦN III — Trả lời ngắn", "#f472b6");
          drawGrid(p3, 4, (q, x, cy2) => {
            ctx.fillText(`Câu ${q.num}: ${q.student || "Ø"} ${q.isCorrect ? "✓" : "✗"}`, x, cy2 + 1);
          });
        }

        // Footer
        ctx.fillStyle = "#334155"; ctx.font = "9px system-ui"; ctx.textAlign = "center";
        ctx.fillText(`Xuất bởi THPT Grader — ${new Date().toLocaleString("vi-VN")}`, W / 2, H - 14);

        // Download
        const name = tempStudentName.trim() || `SBD_${gradingResult.sbd || "unknown"}`;
        const link = document.createElement("a");
        link.download = `KetQua_${name.replace(/\s+/g, "_")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (err) {
        console.error("Export error:", err);
      } finally {
        setIsExporting(false);
      }
    }, 20);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col p-5 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <CheckCircle size={16} className="text-emerald-400" /> Kết quả chấm thi
        </h2>
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Score Header */}
      <div className="text-center p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 relative overflow-hidden mb-5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Điểm tổng kết</span>
        <div className={`text-5xl font-black bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
          {score.toFixed(2)}
        </div>
        <div className="flex justify-center gap-4 text-[10px] text-slate-500 font-mono">
          <span>I: <b className="text-slate-300">{gradingResult.part1Score.toFixed(2)}</b></span>
          {gradingResult.p2Breakdown.length > 0 && (
            <span>II: <b className="text-slate-300">{gradingResult.part2Score.toFixed(2)}</b></span>
          )}
          {gradingResult.p3Breakdown.length > 0 && (
            <span>III: <b className="text-slate-300">{gradingResult.part3Score.toFixed(2)}</b></span>
          )}
        </div>
        <div className="pt-2 max-w-xs mx-auto space-y-1.5">
          <label className="text-[10px] text-slate-500 font-bold block text-left">HỌ TÊN THÍ SINH:</label>
          <input
            type="text"
            value={tempStudentName}
            onChange={(e) => onSetTempStudentName(e.target.value)}
            placeholder="Nhập tên học sinh (tuỳ chọn)..."
            maxLength={60}
            className="w-full text-xs font-semibold text-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4 space-y-1.5">
          <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={13} /> {warnings.length} câu cần kiểm tra — hãy dùng "Sửa bài lỗi"
          </p>
          <ul className="space-y-0.5 max-h-[80px] overflow-y-auto">
            {warnings.map((w, i) => (
              <li key={i} className="text-[10px] text-amber-300">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detail section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-800 pb-1">
          <span>BÀI LÀM CHI TIẾT</span>
          <button
            onClick={() => onSetEditingResult(!isEditingResult)}
            className="text-xs text-blue-400 font-semibold hover:underline flex items-center gap-1"
          >
            <Edit3 size={12} /> {isEditingResult ? "Hoàn tất sửa" : "Sửa bài lỗi"}
          </button>
        </div>

        {/* SBD / Code edit */}
        {isEditingResult && scanResult && (
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">SỐ BÁO DANH:</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={scanResult.sbd}
                onChange={(e) => onEditChange("sbd", null, e.target.value.replace(/\D/g, ""))}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">MÃ ĐỀ THI:</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={scanResult.code}
                onChange={(e) => onEditChange("code", null, e.target.value.replace(/\D/g, ""))}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Part I */}
        {gradingResult.p1Breakdown.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">Phần I: Trắc nghiệm đơn</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {gradingResult.p1Breakdown.map((q, idx) => {
                const rawAns = scanResult?.part1?.[idx];
                const isMultiple = rawAns === "MULTIPLE";
                return (
                  <div
                    key={idx}
                    className={`flex justify-between items-center p-2 rounded-lg border ${
                      isMultiple
                        ? "bg-amber-500/5 border-amber-500/40"
                        : q.isCorrect
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    }`}
                  >
                    <span className="font-medium text-slate-400">Câu {q.num}:</span>
                    {isEditingResult ? (
                      <select
                        value={rawAns === "MULTIPLE" || rawAns === "" ? "" : rawAns}
                        onChange={(e) => onEditChange("part1", idx, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5"
                      >
                        <option value="">Trống</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    ) : (
                      <span className={`font-bold text-xs ${isMultiple ? "text-amber-400" : q.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                        {isMultiple ? "⚠ Nhiều ô" : q.student || "Ø"}{" "}
                        {!isMultiple && (q.isCorrect ? "✓" : `(ĐA: ${q.correct})`)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Part II */}
        {gradingResult.p2Breakdown.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <div className="flex justify-between items-start">
              <h4 className="text-xs font-bold text-slate-300">Phần II: Đúng / Sai</h4>
              <span className="text-[9px] text-slate-500 text-right leading-relaxed">
                1ý=0.1đ · 2ý=0.25đ<br/>3ý=0.5đ · 4ý=1.0đ
              </span>
            </div>
            <div className="space-y-3 text-xs">
              {gradingResult.p2Breakdown.map((q, qIdx) => (
                <div key={qIdx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400">Câu {q.num}:</span>
                    <span className="text-[10px] bg-slate-900 py-0.5 px-2 rounded border border-slate-800 text-indigo-400 font-bold">
                      {q.correctCount}/4 ý (+{q.score.toFixed(2)}đ)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["a", "b", "c", "d"].map((sub) => {
                      const subData = q.subAnswers[sub];
                      const rawSub = scanResult?.part2?.[qIdx]?.[sub];
                      const isBoth = rawSub === "BOTH";
                      return (
                        <div
                          key={sub}
                          className={`p-1.5 rounded text-center border flex flex-col gap-0.5 ${
                            isBoth
                              ? "bg-amber-500/5 border-amber-500/40"
                              : subData.isCorrect
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-red-500/5 border-red-500/20"
                          }`}
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-500">{sub}</span>
                          {isEditingResult ? (
                            <select
                              value={rawSub === "BOTH" || rawSub === "" ? "" : rawSub}
                              onChange={(e) => onEditChange("part2", qIdx, e.target.value, sub)}
                              className="bg-slate-800 border border-slate-700 text-slate-200 text-[8px] rounded w-full"
                            >
                              <option value="">Trống</option>
                              <option value="T">Đúng</option>
                              <option value="F">Sai</option>
                            </select>
                          ) : (
                            <span className={`font-bold text-[10px] ${isBoth ? "text-amber-400" : subData.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                              {isBoth ? "⚠" : subData.student === "T" ? "Đ" : subData.student === "F" ? "S" : "Ø"}
                              <span className="text-[8px] block text-slate-500 font-medium">
                                {!isBoth && (subData.isCorrect ? "✓" : `(ĐA: ${subData.correct === "T" ? "Đ" : "S"})`)}
                              </span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part III */}
        {gradingResult.p3Breakdown.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">Phần III: Trả lời ngắn</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {gradingResult.p3Breakdown.map((q, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center p-2 rounded-lg border ${
                    q.isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <span className="font-medium text-slate-400">Câu {q.num}:</span>
                  {isEditingResult ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={scanResult?.part3?.[idx] ?? ""}
                      onChange={(e) => onEditChange("part3", idx, e.target.value)}
                      className="w-16 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded text-center px-1 py-0.5"
                    />
                  ) : (
                    <span className={`font-bold text-xs ${q.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                      {q.student || "Ø"} {q.isCorrect ? "✓" : `(ĐA: ${q.correct})`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-8 space-y-2 pb-8">
        {/* Export */}
        <button
          onClick={exportResultImage}
          disabled={isExporting}
          className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
        >
          {isExporting
            ? <><Loader size={14} className="animate-spin" /> Đang xuất...</>
            : <><ImageDown size={14} className="text-emerald-400" /> Xuất ảnh kết quả (.png)</>
          }
        </button>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-slate-900 border border-slate-800 font-bold text-slate-300 text-xs active:scale-95 transition-all"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Save size={15} /> Lưu kết quả
          </button>
        </div>
        <p className="text-center text-[9px] text-slate-700">Ctrl+S để lưu nhanh</p>
      </div>
    </div>
  );
}
