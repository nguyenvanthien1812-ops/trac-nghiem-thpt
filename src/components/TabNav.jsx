import { Settings, Camera, Key, History } from "lucide-react";

const TABS = [
  { id: "dashboard", icon: Settings, label: "Bảng điều khiển" },
  { id: "scanner",   icon: Camera,   label: "Quét phiếu" },
  { id: "config",    icon: Key,      label: "Đáp án đề" },
  { id: "history",   icon: History,  label: "Lịch sử" },
];

export default function TabNav({ activeTab, onTabChange }) {
  return (
    <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/90 backdrop-blur-md border-t border-slate-800 py-2.5 px-6 flex justify-between items-center z-40">
      {TABS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 min-w-[52px] ${
            activeTab === id ? "text-blue-500 scale-105" : "text-slate-500 hover:text-slate-400"
          }`}
        >
          <Icon size={18} />
          <span className="text-[9px] font-bold leading-tight text-center">{label}</span>
        </button>
      ))}
    </footer>
  );
}
