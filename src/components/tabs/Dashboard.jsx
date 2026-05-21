import { Camera, Upload, Play, CheckCircle, HelpCircle } from "lucide-react";

export default function Dashboard({ historyList, onLoadDemo, onStartCamera, onTriggerFileInput, fileInputRef, onFileUpload }) {
  const total = historyList.length;
  const avgScore = total > 0
    ? (historyList.reduce((s, i) => s + i.totalScore, 0) / total).toFixed(2)
    : "0.0";
  const passRate = total > 0
    ? ((historyList.filter((i) => i.totalScore >= 5.0).length / total) * 100).toFixed(0) + "%"
    : "0%";

  return (
    <div className="space-y-6">
      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onLoadDemo}
          className="col-span-2 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-700/40 text-left hover:scale-[1.01] active:scale-95 transition-all shadow-lg"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full">
              Dùng thử ngay
            </span>
            <h3 className="font-bold text-sm text-slate-100">Phiếu giả lập để test</h3>
            <p className="text-[11px] text-indigo-200/70">Không cần in phiếu, test thử app trong 2 giây</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500 text-white shrink-0">
            <Play size={20} fill="white" />
          </div>
        </button>

        <button
          onClick={onStartCamera}
          className="flex flex-col items-center justify-center p-5 rounded-2xl glass-card border border-blue-500/20 text-center hover:scale-[1.02] active:scale-95 transition-all"
        >
          <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 mb-3">
            <Camera size={24} />
          </div>
          <span className="font-bold text-xs">Mở Camera</span>
          <span className="text-[10px] text-slate-400 mt-1">Quét phiếu trực tiếp</span>
        </button>

        <button
          onClick={onTriggerFileInput}
          className="flex flex-col items-center justify-center p-5 rounded-2xl glass-card border border-emerald-500/20 text-center hover:scale-[1.02] active:scale-95 transition-all"
        >
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
            <Upload size={24} />
          </div>
          <span className="font-bold text-xs">Tải ảnh lên</span>
          <span className="text-[10px] text-slate-400 mt-1">Ảnh từ thư viện</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileUpload}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Quick Stats Panel */}
      <div className="p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
          <CheckCircle size={14} className="text-blue-400" /> Thống kê hoạt động
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="block text-xl font-extrabold text-blue-400">{total}</span>
            <span className="text-[10px] text-slate-400">Đã chấm</span>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="block text-xl font-extrabold text-emerald-400">{avgScore}</span>
            <span className="text-[10px] text-slate-400">Điểm TB</span>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="block text-xl font-extrabold text-indigo-400">{passRate}</span>
            <span className="text-[10px] text-slate-400">Đạt (≥5.0)</span>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="p-5 rounded-2xl glass-card space-y-3 text-xs border border-slate-800 text-slate-300">
        <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
          <HelpCircle size={14} className="text-slate-400" /> Hướng dẫn chấm điểm hiệu quả
        </h4>
        <ul className="list-disc pl-4 space-y-1.5 text-slate-400 text-[11px]">
          <li>Đặt phiếu trên mặt phẳng tương phản, đủ ánh sáng.</li>
          <li>Tránh để bóng tay che khuất phiếu khi chụp.</li>
          <li>Sau khi chụp, dùng nút <b>Tự động căn chỉnh</b> hoặc điều chỉnh lưới thủ công trước khi chấm.</li>
        </ul>
      </div>
    </div>
  );
}
