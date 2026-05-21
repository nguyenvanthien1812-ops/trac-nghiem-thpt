import { Check, X } from "lucide-react";

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-semibold z-50 shadow-lg flex items-center gap-2 transition-all duration-300 max-w-[320px] text-center ${
      toast.type === "error"
        ? "bg-red-500 text-white"
        : toast.type === "warning"
        ? "bg-amber-500 text-slate-950"
        : "bg-emerald-500 text-white"
    }`}>
      {toast.type === "error" ? <X size={16} className="shrink-0" /> : <Check size={16} className="shrink-0" />}
      <span>{toast.message}</span>
    </div>
  );
}
