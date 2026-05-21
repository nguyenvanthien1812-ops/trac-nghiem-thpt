import { useState } from "react";
import { Award, Keyboard, X } from "lucide-react";
import { SUBJECT_PRESETS, TEMPLATES } from "../utils/constants";

const SHORTCUTS = [
  { key: "Ctrl+G",   desc: "Chấm điểm (khi có ảnh)" },
  { key: "Ctrl+S",   desc: "Lưu kết quả vào lịch sử" },
  { key: "Ctrl+K",   desc: "Chuyển tab Scanner" },
  { key: "Ctrl+H",   desc: "Chuyển tab Lịch sử" },
  { key: "Ctrl+D",   desc: "Chuyển tab Dashboard" },
  { key: "Esc",      desc: "Đóng modal / dừng camera" },
];

export default function Header({ selectedSubject, setSelectedSubject, activeTemplateId, setActiveTemplateId }) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <header className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 py-4 px-5 flex justify-between items-center z-40">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/25">
            <Award size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              THPT GRADER
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Chấm điểm trắc nghiệm 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShortcuts(true)}
            title="Phím tắt (Keyboard shortcuts)"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
          >
            <Keyboard size={16} />
          </button>

          <select
            value={activeTemplateId}
            onChange={(e) => setActiveTemplateId(e.target.value)}
            className="text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer max-w-[110px] truncate"
            title="Mẫu phiếu"
          >
            {Object.values(TEMPLATES).map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="text-xs font-semibold bg-blue-900 border border-blue-700 text-blue-100 px-2 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            title="Môn thi"
          >
            {Object.values(SUBJECT_PRESETS).map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[90] flex items-center justify-center p-5"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-blue-400" />
                <h3 className="text-sm font-extrabold text-slate-200">Phím tắt</h3>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="p-1 text-slate-500 hover:text-slate-300 rounded">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                  <span className="text-xs text-slate-400">{desc}</span>
                  <kbd className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 italic">Phím tắt không hoạt động khi đang nhập liệu.</p>
          </div>
        </div>
      )}
    </>
  );
}
