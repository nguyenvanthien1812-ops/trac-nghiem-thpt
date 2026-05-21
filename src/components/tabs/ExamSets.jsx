import { useState, useRef } from "react";
import {
  BookOpen, Save, FolderOpen, Trash2, Download, Upload,
  Plus, ChevronRight, CheckCircle, AlertCircle, FileJson,
} from "lucide-react";

const STORAGE_KEY = "thpt_grader_examsets";

function loadExamSets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveExamSets(sets) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sets)); } catch (e) { console.warn(e); }
}

export default function ExamSets({
  answerKeys,
  setAnswerKeys,
  activeExamCode,
  setActiveExamCode,
  showToast,
  showConfirm,
}) {
  const [examSets, setExamSets] = useState(() => loadExamSets());
  const [newSetName, setNewSetName] = useState("");
  const [nameError, setNameError] = useState("");
  const importRef = useRef(null);

  // ── Persist helper ────────────────────────────────────────────────────────
  const persist = (sets) => {
    setExamSets(sets);
    saveExamSets(sets);
  };

  // ── Save current answerKeys as a named set ────────────────────────────────
  const handleSaveSet = () => {
    const name = newSetName.trim();
    if (!name) { setNameError("Vui lòng đặt tên cho bộ đề."); return; }
    if (Object.keys(answerKeys).length === 0) {
      showToast("Chưa có đáp án nào để lưu!", "warning");
      return;
    }

    const now = new Date().toLocaleString("vi-VN");
    const existing = examSets.findIndex((s) => s.name === name);

    if (existing !== -1) {
      showConfirm?.(`Bộ đề "${name}" đã tồn tại. Ghi đè?`, () => {
        const updated = [...examSets];
        updated[existing] = {
          ...updated[existing],
          answerKeys: JSON.parse(JSON.stringify(answerKeys)),
          updatedAt: now,
          codesCount: Object.keys(answerKeys).length,
        };
        persist(updated);
        showToast(`Đã cập nhật bộ đề "${name}"!`);
        setNewSetName("");
        setNameError("");
      });
    } else {
      const newSet = {
        id: Date.now(),
        name,
        answerKeys: JSON.parse(JSON.stringify(answerKeys)),
        createdAt: now,
        updatedAt: now,
        codesCount: Object.keys(answerKeys).length,
      };
      const updated = [...examSets, newSet];
      persist(updated);
      showToast(`Đã lưu bộ đề "${name}" (${newSet.codesCount} mã đề)!`);
      setNewSetName("");
      setNameError("");
    }
  };

  // ── Load a set into active answerKeys ──────────────────────────────────────
  const handleLoadSet = (set) => {
    showConfirm?.(
      `Tải bộ đề "${set.name}" (${set.codesCount} mã đề)? Đáp án hiện tại sẽ bị thay thế.`,
      () => {
        setAnswerKeys(JSON.parse(JSON.stringify(set.answerKeys)));
        const codes = Object.keys(set.answerKeys);
        if (codes.length > 0) setActiveExamCode(codes[0]);
        showToast(`Đã tải bộ đề "${set.name}" thành công!`);
      }
    );
  };

  // ── Delete a set ──────────────────────────────────────────────────────────
  const handleDeleteSet = (set) => {
    showConfirm?.(`Xóa bộ đề "${set.name}"? Hành động không thể hoàn tác!`, () => {
      const updated = examSets.filter((s) => s.id !== set.id);
      persist(updated);
      showToast(`Đã xóa bộ đề "${set.name}".`, "warning");
    });
  };

  // ── Export selected set as JSON file ──────────────────────────────────────
  const handleExportSet = (set) => {
    const blob = new Blob(
      [JSON.stringify({ name: set.name, answerKeys: set.answerKeys }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `BoDeThis_${set.name.replace(/\s+/g, "_")}.json`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất bộ đề "${set.name}" ra file JSON!`);
  };

  // ── Export ALL current answerKeys as JSON ──────────────────────────────────
  const handleExportCurrentJSON = () => {
    if (Object.keys(answerKeys).length === 0) {
      showToast("Chưa có đáp án nào để xuất!", "warning");
      return;
    }
    const blob = new Blob(
      [JSON.stringify({ answerKeys }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const now = new Date().toISOString().slice(0, 10);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `DapAn_${now}.json`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Đã xuất toàn bộ đáp án ra file JSON!");
  };

  // ── Import JSON file ────────────────────────────────────────────────────────
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        // Support two formats: { answerKeys: {...} }  OR  { name: "...", answerKeys: {...} }
        const keys = parsed.answerKeys || (typeof parsed === "object" && !parsed.name ? parsed : null);
        if (!keys || Object.keys(keys).length === 0) {
          showToast("File không hợp lệ hoặc không có đáp án!", "error");
          return;
        }
        const count = Object.keys(keys).length;
        const setName = parsed.name || file.name.replace(/\.json$/i, "");

        showConfirm?.(
          `Nhập ${count} mã đề từ file "${file.name}"? Đáp án hiện tại sẽ bị thay thế.`,
          () => {
            setAnswerKeys(JSON.parse(JSON.stringify(keys)));
            const codes = Object.keys(keys);
            if (codes.length > 0) setActiveExamCode(codes[0]);

            // Also save as a new set automatically
            const now = new Date().toLocaleString("vi-VN");
            const newSet = {
              id: Date.now(),
              name: setName,
              answerKeys: JSON.parse(JSON.stringify(keys)),
              createdAt: now,
              updatedAt: now,
              codesCount: count,
            };
            const existing = examSets.findIndex((s) => s.name === setName);
            let updated;
            if (existing !== -1) {
              updated = [...examSets];
              updated[existing] = { ...updated[existing], ...newSet };
            } else {
              updated = [...examSets, newSet];
            }
            persist(updated);
            showToast(`Đã nhập ${count} mã đề và lưu vào bộ đề "${setName}"!`);
          }
        );
      } catch {
        showToast("Lỗi đọc file JSON! Kiểm tra định dạng.", "error");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <BookOpen size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-100">Quản lý Bộ đề</h2>
          <p className="text-[10px] text-slate-400">Lưu, tải và chia sẻ bộ đáp án theo kỳ thi</p>
        </div>
      </div>

      {/* Quick export/import current keys */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đáp án hiện tại</p>
        <div className="flex gap-2">
          <div className="flex-1 text-center px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700">
            <p className="text-lg font-extrabold text-blue-400">{Object.keys(answerKeys).length}</p>
            <p className="text-[9px] text-slate-400">Mã đề</p>
          </div>
          <div className="flex-1 text-center px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700">
            <p className="text-lg font-extrabold text-emerald-400">{examSets.length}</p>
            <p className="text-[9px] text-slate-400">Bộ đề đã lưu</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCurrentJSON}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-400 rounded-xl transition-all active:scale-95"
          >
            <Download size={13} /> Xuất JSON
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 rounded-xl transition-all active:scale-95"
          >
            <Upload size={13} /> Nhập JSON
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
        </div>
      </div>

      {/* Save current as named set */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lưu thành bộ đề mới</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSetName}
            onChange={(e) => { setNewSetName(e.target.value); setNameError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSaveSet()}
            placeholder="VD: Đề Toán HK1 2025"
            className={`flex-1 text-sm bg-slate-900 border rounded-xl px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none transition-colors ${
              nameError ? "border-red-500" : "border-slate-700 focus:border-purple-500"
            }`}
          />
          <button
            onClick={handleSaveSet}
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-900/30"
          >
            <Save size={13} /> Lưu
          </button>
        </div>
        {nameError && <p className="text-[10px] text-red-400">{nameError}</p>}
      </div>

      {/* Saved sets list */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          Bộ đề đã lưu ({examSets.length})
        </p>

        {examSets.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel border border-slate-800 border-dashed text-center">
            <FileJson size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">Chưa có bộ đề nào được lưu.</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Tạo đáp án trong tab "Đáp án đề" rồi lưu ở đây.
            </p>
          </div>
        ) : (
          examSets.map((set) => (
            <div
              key={set.id}
              className="p-4 rounded-2xl glass-panel border border-slate-800 hover:border-slate-700 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} className="text-purple-400 shrink-0" />
                    <p className="text-sm font-bold text-slate-100 truncate">{set.name}</p>
                  </div>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[9px] text-blue-400 font-semibold">
                      {set.codesCount} mã đề
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {set.updatedAt}
                    </span>
                  </div>
                  {/* Preview of exam codes */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.keys(set.answerKeys).slice(0, 8).map((code) => (
                      <span
                        key={code}
                        className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-slate-800 text-slate-400 border border-slate-700"
                      >
                        {code}
                      </span>
                    ))}
                    {Object.keys(set.answerKeys).length > 8 && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-slate-800 text-slate-500 border border-slate-700">
                        +{Object.keys(set.answerKeys).length - 8}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleLoadSet(set)}
                    title="Tải bộ đề này"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-emerald-600/20 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-400 rounded-lg transition-all active:scale-95"
                  >
                    <FolderOpen size={11} /> Tải
                  </button>
                  <button
                    onClick={() => handleExportSet(set)}
                    title="Xuất file JSON"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-blue-600/20 hover:bg-blue-600/50 border border-blue-500/40 text-blue-400 rounded-lg transition-all active:scale-95"
                  >
                    <Download size={11} /> JSON
                  </button>
                  <button
                    onClick={() => handleDeleteSet(set)}
                    title="Xóa bộ đề"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-red-600/20 hover:bg-red-600/50 border border-red-500/40 text-red-400 rounded-lg transition-all active:scale-95"
                  >
                    <Trash2 size={11} /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tips */}
      <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/20">
        <p className="text-[10px] text-purple-300 font-semibold mb-1">💡 Hướng dẫn</p>
        <ul className="text-[9px] text-purple-200/70 space-y-0.5 list-disc list-inside">
          <li>Tạo đáp án ở tab <strong>"Đáp án đề"</strong>, sau đó quay lại đây để lưu.</li>
          <li><strong>Xuất JSON</strong>: chia sẻ bộ đề với đồng nghiệp qua file.</li>
          <li><strong>Nhập JSON</strong>: nhận bộ đề từ đồng nghiệp và tải vào ứng dụng.</li>
          <li>Mỗi bộ đề lưu toàn bộ các mã đề (101, 102, 103, 104...).</li>
        </ul>
      </div>
    </div>
  );
}
