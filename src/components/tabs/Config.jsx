import { useState, useRef } from "react";
import { Download, Upload, Trash2, FileSpreadsheet } from "lucide-react";

export default function Config({ activeExamCode, setActiveExamCode, answerKeys, setAnswerKeys, preset, activeTemplate, selectedSubject, showToast, showConfirm }) {
  const [codeError, setCodeError] = useState("");
  const [p3Errors, setP3Errors] = useState({});

  const validateCode = (val) => {
    if (!val) { setCodeError("Vui lòng nhập mã đề."); return false; }
    if (!/^\d{1,3}$/.test(val)) { setCodeError("Mã đề phải là 1-3 chữ số."); return false; }
    setCodeError("");
    return true;
  };

  const handleCodeChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 3);
    setActiveExamCode(clean);
    validateCode(clean);
  };

  const handleCreateCode = () => {
    if (!validateCode(activeExamCode)) return;
    if (answerKeys[activeExamCode]) {
      showToast(`Mã đề ${activeExamCode} đã tồn tại!`, "warning");
      return;
    }
    setAnswerKeys((prev) => ({
      ...prev,
      [activeExamCode]: {
        subject: selectedSubject,
        part1: Array(activeTemplate.part1Count).fill(""),
        part2: Array(activeTemplate.part2Count).fill(null).map(() => ({ a: "", b: "", c: "", d: "" })),
        part3: Array(activeTemplate.part3Count).fill(""),
      },
    }));
    showToast(`Đã tạo đáp án mới cho Mã đề: ${activeExamCode}`);
  };

  const setPart1Answer = (idx, opt) => {
    setAnswerKeys((prev) => {
      const updated = { ...prev };
      updated[activeExamCode] = { ...updated[activeExamCode] };
      updated[activeExamCode].part1 = [...updated[activeExamCode].part1];
      updated[activeExamCode].part1[idx] = opt;
      return updated;
    });
  };

  const setPart2Answer = (idx, sub, val) => {
    setAnswerKeys((prev) => {
      const updated = { ...prev };
      updated[activeExamCode] = { ...updated[activeExamCode] };
      updated[activeExamCode].part2 = [...updated[activeExamCode].part2];
      updated[activeExamCode].part2[idx] = { ...updated[activeExamCode].part2[idx], [sub]: val };
      return updated;
    });
  };

  const validateP3 = (idx, val) => {
    if (val === "") { setP3Errors((e) => ({ ...e, [idx]: "" })); return; }
    const num = parseFloat(val.replace(",", "."));
    if (isNaN(num)) {
      setP3Errors((e) => ({ ...e, [idx]: "Phải là số hợp lệ (vd: -1.5, 100)" }));
    } else {
      setP3Errors((e) => ({ ...e, [idx]: "" }));
    }
  };

  const setPart3Answer = (idx, val) => {
    setAnswerKeys((prev) => {
      const updated = { ...prev };
      updated[activeExamCode] = { ...updated[activeExamCode] };
      updated[activeExamCode].part3 = [...updated[activeExamCode].part3];
      updated[activeExamCode].part3[idx] = val;
      return updated;
    });
    validateP3(idx, val);
  };

  const csvImportRef = useRef(null);
  const currentKey = answerKeys[activeExamCode];

  // ── Delete current exam code ─────────────────────────────────────────────────
  const handleDeleteCode = () => {
    if (!currentKey) return;
    showConfirm?.(`Xóa toàn bộ đáp án mã đề ${activeExamCode}? Hành động không thể hoàn tác!`, () => {
      setAnswerKeys((prev) => {
        const next = { ...prev };
        delete next[activeExamCode];
        return next;
      });
      setActiveExamCode("");
      showToast(`Đã xóa mã đề ${activeExamCode}.`, "warning");
    });
  };

  // ── Export current code as CSV ────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!currentKey) { showToast("Chưa có đáp án để xuất!", "warning"); return; }
    const rows = [];
    rows.push(["part","question","answer","sub"]);
    currentKey.part1.forEach((a, i) => rows.push(["I", i + 1, a || "", ""]));
    currentKey.part2.forEach((q, i) => {
      ["a","b","c","d"].forEach((sub) => rows.push(["II", i + 1, q?.[sub] || "", sub]));
    });
    currentKey.part3.forEach((a, i) => rows.push(["III", i + 1, a || "", ""]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `Dap_an_ma_de_${activeExamCode}.csv` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất CSV đáp án mã đề ${activeExamCode}!`);
  };

  // ── Import CSV ────────────────────────────────────────────────────────────────
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!validateCode(activeExamCode)) { showToast("Vui lòng nhập mã đề trước khi import!", "warning"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result.replace(/^\uFEFF/, ""); // remove BOM
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        // Skip header if present
        const data = lines[0].toLowerCase().startsWith("part") ? lines.slice(1) : lines;
        const newKey = {
          subject: selectedSubject,
          part1: Array(activeTemplate.part1Count).fill(""),
          part2: Array(activeTemplate.part2Count).fill(null).map(() => ({ a: "", b: "", c: "", d: "" })),
          part3: Array(activeTemplate.part3Count).fill(""),
        };
        let importedCount = 0;
        for (const line of data) {
          const [part, qRaw, answer, sub] = line.split(",").map((s) => s.trim());
          const q = parseInt(qRaw, 10) - 1;
          const ans = (answer || "").toUpperCase();
          if (part === "I" || part === "1") {
            if (q >= 0 && q < newKey.part1.length) { newKey.part1[q] = ans; importedCount++; }
          } else if (part === "II" || part === "2") {
            const subKey = (sub || "").toLowerCase();
            if (q >= 0 && q < newKey.part2.length && ["a","b","c","d"].includes(subKey)) {
              newKey.part2[q][subKey] = ans === "T" || ans === "Đ" || ans === "TRUE" || ans === "ĐÚNG" ? "T" : "F";
              importedCount++;
            }
          } else if (part === "III" || part === "3") {
            if (q >= 0 && q < newKey.part3.length) { newKey.part3[q] = answer.replace(",", "."); importedCount++; }
          }
        }
        setAnswerKeys((prev) => ({ ...prev, [activeExamCode]: newKey }));
        showToast(`Import thành công: ${importedCount} đáp án từ file CSV!`);
      } catch (err) {
        console.error(err);
        showToast("Lỗi đọc file CSV! Kiểm tra định dạng file.", "error");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  return (
    <div className="space-y-5">
      {/* Exam Code Selector */}
      <div className="p-4 rounded-2xl glass-panel space-y-3 border border-slate-800">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-400 uppercase">Mã đề thi</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={activeExamCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              className={`w-16 text-center text-sm font-bold bg-slate-900 border rounded-lg px-2 py-1 text-slate-100 focus:outline-none ${
                codeError ? "border-red-500" : "border-slate-800 focus:border-blue-500"
              }`}
              placeholder="Mã đề"
            />
            <button
              onClick={handleCreateCode}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all"
            >
              Tạo mới
            </button>
          </div>
        </div>
        {codeError && <p className="text-[10px] text-red-400">{codeError}</p>}

        {Object.keys(answerKeys).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(answerKeys).map((code) => (
              <button
                key={code}
                onClick={() => { setActiveExamCode(code); setCodeError(""); }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  activeExamCode === code
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400">
          Đang cấu hình: <span className="text-blue-400 font-bold">{activeExamCode || "Chưa chọn"}</span>{" "}
          (Môn {preset.name})
        </p>

        {/* CSV actions */}
        {activeExamCode && (
          <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-800">
            <input type="file" ref={csvImportRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            <button
              onClick={() => csvImportRef.current?.click()}
              className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-indigo-900/30 border border-indigo-700/40 text-indigo-300 hover:bg-indigo-900/50 active:scale-95 transition-all"
            >
              <Upload size={11} /> Nhập CSV
            </button>
            {currentKey && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/50 active:scale-95 transition-all"
                >
                  <Download size={11} /> Xuất CSV
                </button>
                <button
                  onClick={handleDeleteCode}
                  className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 active:scale-95 transition-all ml-auto"
                >
                  <Trash2 size={11} /> Xóa mã đề
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* CSV format hint */}
      <div className="px-3 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-[10px] text-slate-500 space-y-0.5">
        <p className="font-bold text-slate-400 flex items-center gap-1"><FileSpreadsheet size={11} /> Định dạng CSV đáp án:</p>
        <p>Cột: <code className="text-indigo-400">part, question, answer, sub</code></p>
        <p>Ví dụ: <code className="text-emerald-400">I,1,A,</code> — <code className="text-emerald-400">II,2,T,b</code> — <code className="text-emerald-400">III,3,1.5,</code></p>
      </div>

      {currentKey && (
        <div className="space-y-6">
          {/* Part I */}
          {activeTemplate.part1Count > 0 && (
            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
              <h3 className="font-bold text-xs text-blue-400 border-b border-slate-800 pb-2">
                PHẦN I: TRẮC NGHIỆM ĐƠN ({activeTemplate.part1Count} câu)
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {Array(activeTemplate.part1Count).fill(0).map((_, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium shrink-0">Câu {idx + 1}:</span>
                    <div className="flex gap-1">
                      {["A", "B", "C", "D"].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setPart1Answer(idx, opt)}
                          className={`w-7 h-7 rounded-full font-bold text-[10px] flex items-center justify-center transition-all ${
                            currentKey.part1[idx] === opt
                              ? "bg-blue-600 text-white"
                              : "bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Part II */}
          {activeTemplate.part2Count > 0 && (
            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
              <h3 className="font-bold text-xs text-indigo-400 border-b border-slate-800 pb-2">
                PHẦN II: ĐÚNG/SAI ({activeTemplate.part2Count} câu)
              </h3>
              <div className="space-y-4">
                {Array(activeTemplate.part2Count).fill(0).map((_, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <span className="text-xs text-slate-300 font-bold">Câu {idx + 1}:</span>
                    <div className="grid grid-cols-4 gap-2">
                      {["a", "b", "c", "d"].map((sub) => {
                        const val = currentKey.part2[idx]?.[sub] || "";
                        return (
                          <div key={sub} className="flex flex-col items-center p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-slate-500 font-semibold mb-1 text-[10px] uppercase">{sub})</span>
                            <div className="flex gap-0.5 w-full">
                              <button
                                onClick={() => setPart2Answer(idx, sub, "T")}
                                className={`flex-1 py-1 rounded font-bold text-[10px] transition-all ${
                                  val === "T" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                              >
                                Đ
                              </button>
                              <button
                                onClick={() => setPart2Answer(idx, sub, "F")}
                                className={`flex-1 py-1 rounded font-bold text-[10px] transition-all ${
                                  val === "F" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                }`}
                              >
                                S
                              </button>
                            </div>
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
          {activeTemplate.part3Count > 0 && (
            <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
              <h3 className="font-bold text-xs text-pink-400 border-b border-slate-800 pb-2">
                PHẦN III: TRẢ LỜI NGẮN ({activeTemplate.part3Count} câu)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Array(activeTemplate.part3Count).fill(0).map((_, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block">Câu {idx + 1}:</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={currentKey.part3[idx] || ""}
                      onChange={(e) => setPart3Answer(idx, e.target.value)}
                      onBlur={(e) => validateP3(idx, e.target.value)}
                      placeholder="Nhập số (vd: -1.5)"
                      className={`w-full text-xs bg-slate-900 border rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-100 ${
                        p3Errors[idx] ? "border-red-500" : "border-slate-800 focus:border-pink-500"
                      }`}
                    />
                    {p3Errors[idx] && (
                      <p className="text-[9px] text-red-400">{p3Errors[idx]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!currentKey && activeExamCode && (
        <p className="text-center text-xs text-slate-500 py-6">
          Mã đề <span className="text-blue-400 font-bold">{activeExamCode}</span> chưa có đáp án.
          Nhấn <span className="text-blue-400">"Tạo mới"</span> để bắt đầu nhập.
        </p>
      )}
    </div>
  );
}
