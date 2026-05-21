import { useState, useMemo } from "react";
import { List, BarChart2, Database, Upload, Download, Trash2, X, Search, ChevronDown, Eye, Filter } from "lucide-react";

// ── Detail Modal for a single history record ──────────────────────────────────
function HistoryDetailModal({ item, onClose }) {
  if (!item) return null;
  const score = item.totalScore;
  const scoreColor =
    score >= 8.0 ? "from-emerald-400 to-teal-300"
    : score >= 5.0 ? "from-blue-400 to-indigo-300"
    : "from-red-400 to-rose-300";

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col overflow-y-auto">
      <div className="flex-1 p-5 pb-8 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Chi tiết bài thi</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Score */}
        <div className="text-center p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{item.studentName}</p>
          <div className={`text-5xl font-black bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
            {score.toFixed(2)}
          </div>
          <div className="flex justify-center gap-4 text-[10px] text-slate-500 font-mono flex-wrap">
            <span>SBD: <b className="text-slate-300">{item.sbd || "?"}</b></span>
            <span>Mã đề: <b className="text-slate-300">{item.examCode || "?"}</b></span>
            <span>Môn: <b className="text-slate-300">{item.subjectName}</b></span>
          </div>
          <p className="text-[9px] text-slate-600">{item.gradedAt}</p>
        </div>

        {/* Part I breakdown */}
        {item.breakdown?.part1?.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">Phần I: Trắc nghiệm đơn</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {item.breakdown.part1.map((q) => (
                <div
                  key={q.num}
                  className={`flex justify-between items-center p-2 rounded-lg border ${
                    q.isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <span className="font-medium text-slate-400">Câu {q.num}:</span>
                  <span className={`font-bold text-xs ${q.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {q.student || "Ø"} {q.isCorrect ? "✓" : `(ĐA: ${q.correct})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part II breakdown */}
        {item.breakdown?.part2?.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">Phần II: Đúng / Sai</h4>
            <div className="space-y-3 text-xs">
              {item.breakdown.part2.map((q) => (
                <div key={q.num} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400">Câu {q.num}:</span>
                    <span className="text-[10px] bg-slate-900 py-0.5 px-2 rounded border border-slate-800 text-indigo-400 font-bold">
                      {q.correctCount}/4 ý (+{q.score?.toFixed(2)}đ)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["a", "b", "c", "d"].map((sub) => {
                      const subData = q.subAnswers?.[sub];
                      return subData ? (
                        <div
                          key={sub}
                          className={`p-1.5 rounded text-center border flex flex-col gap-0.5 ${
                            subData.isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                          }`}
                        >
                          <span className="text-[9px] uppercase font-bold text-slate-500">{sub}</span>
                          <span className={`font-bold text-[10px] ${subData.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                            {subData.student === "T" ? "Đ" : subData.student === "F" ? "S" : "Ø"}
                            <span className="text-[8px] block text-slate-500 font-medium">
                              {subData.isCorrect ? "✓" : `(${subData.correct === "T" ? "Đ" : "S"})`}
                            </span>
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Part III breakdown */}
        {item.breakdown?.part3?.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300">Phần III: Trả lời ngắn</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {item.breakdown.part3.map((q) => (
                <div
                  key={q.num}
                  className={`flex justify-between items-center p-2 rounded-lg border ${
                    q.isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <span className="font-medium text-slate-400">Câu {q.num}:</span>
                  <span className={`font-bold text-xs ${q.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {q.student || "Ø"} {q.isCorrect ? "✓" : `(ĐA: ${q.correct})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main History Component ────────────────────────────────────────────────────
export default function History({
  historyList,
  historySubTab,
  onSetHistorySubTab,
  onDeleteItem,
  onClearAll,
  onExportCSV,
  onExportBackup,
  onImportBackup,
  backupImportRef,
  preset,
}) {
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterScore, setFilterScore] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Get unique subjects in history
  const subjects = useMemo(() => {
    const s = new Set(historyList.map((r) => r.subjectName));
    return ["all", ...s];
  }, [historyList]);

  // Filtered list
  const filtered = useMemo(() => {
    return historyList.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch = !q || item.studentName?.toLowerCase().includes(q) || (item.sbd || "").includes(q) || (item.examCode || "").includes(q);
      const matchSubject = filterSubject === "all" || item.subjectName === filterSubject;
      const matchScore =
        filterScore === "all" ? true
        : filterScore === "pass" ? item.totalScore >= 5.0
        : filterScore === "fail" ? item.totalScore < 5.0
        : filterScore === "excellent" ? item.totalScore >= 8.0
        : true;
      return matchSearch && matchSubject && matchScore;
    });
  }, [historyList, search, filterSubject, filterScore]);

  // Score distribution (5 bands)
  const bands = [0, 0, 0, 0, 0];
  historyList.forEach(({ totalScore: s }) => {
    if (s < 2.5) bands[0]++;
    else if (s < 5.0) bands[1]++;
    else if (s < 7.5) bands[2]++;
    else if (s < 9.0) bands[3]++;
    else bands[4]++;
  });
  const maxBand = Math.max(...bands, 1);

  // Question correct rates (Part I)
  const questionRates = (() => {
    if (historyList.length === 0) return [];
    const count = preset.part1Count;
    return Array.from({ length: count }, (_, i) => {
      const correct = historyList.filter((r) => r.breakdown?.part1?.[i]?.isCorrect).length;
      return { num: i + 1, rate: Math.round((correct / historyList.length) * 100) };
    }).sort((a, b) => a.rate - b.rate);
  })();

  // Stats per exam code
  const statsByCode = {};
  historyList.forEach((item) => {
    const code = item.examCode || "?";
    if (!statsByCode[code]) statsByCode[code] = { count: 0, sum: 0, pass: 0 };
    statsByCode[code].count++;
    statsByCode[code].sum += item.totalScore;
    if (item.totalScore >= 5.0) statsByCode[code].pass++;
  });

  const WARN_THRESHOLD = 400;

  const hasActiveFilter = search || filterSubject !== "all" || filterScore !== "all";

  // Trend by Date (from item.id)
  const trendByDate = useMemo(() => {
    if (historyList.length === 0) return [];
    const map = {};
    // Sort oldest to newest for trend
    [...historyList].sort((a, b) => a.id - b.id).forEach((item) => {
      const d = new Date(item.id);
      const dateKey = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      if (!map[dateKey]) map[dateKey] = { count: 0, sum: 0 };
      map[dateKey].count++;
      map[dateKey].sum += item.totalScore;
    });
    const keys = Object.keys(map);
    // Return last 10 days max to avoid crowding
    return keys.slice(-10).map((date) => ({
      date,
      avg: map[date].sum / map[date].count,
      count: map[date].count,
    }));
  }, [historyList]);

  return (
    <>
      {/* Detail Modal */}
      {detailItem && <HistoryDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}

      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSetHistorySubTab("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                historySubTab === "list" ? "bg-slate-800 text-slate-100 shadow" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <List size={13} /> Danh sách
            </button>
            <button
              onClick={() => onSetHistorySubTab("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                historySubTab === "analytics" ? "bg-slate-800 text-slate-100 shadow" : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <BarChart2 size={13} /> Phân tích
            </button>
          </div>

          <div className="flex gap-1.5">
            <button onClick={onExportBackup} title="Sao lưu" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
              <Database size={14} />
            </button>
            <button onClick={() => backupImportRef.current?.click()} title="Khôi phục" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
              <Upload size={14} />
            </button>
            <input type="file" ref={backupImportRef} onChange={onImportBackup} accept=".json" className="hidden" />
            <button onClick={onExportCSV} title="Xuất CSV" className="p-2 rounded-lg bg-emerald-950 border border-emerald-900 text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all">
              <Download size={14} />
            </button>
            <button onClick={onClearAll} title="Xóa toàn bộ" className="p-2 rounded-lg bg-red-950 border border-red-900 text-red-400 hover:text-red-300 active:scale-95 transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Storage warning */}
        {historyList.length >= WARN_THRESHOLD && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
            Lịch sử đã có <b>{historyList.length}</b> bản ghi. Hãy xuất CSV và xóa bớt để tránh đầy bộ nhớ.
          </div>
        )}

        {/* LIST TAB */}
        {historySubTab === "list" && (
          <div className="space-y-3">
            {/* Search + Filter bar */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên, SBD, mã đề..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-600"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                    showFilter || hasActiveFilter
                      ? "bg-blue-600/20 border-blue-600/40 text-blue-400"
                      : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}
                >
                  <Filter size={13} />
                  {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>
              </div>

              {showFilter && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Môn học</label>
                      <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
                      >
                        <option value="all">Tất cả môn</option>
                        {subjects.filter(s => s !== "all").map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Điểm số</label>
                      <select
                        value={filterScore}
                        onChange={(e) => setFilterScore(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none"
                      >
                        <option value="all">Tất cả</option>
                        <option value="excellent">Giỏi (≥8.0)</option>
                        <option value="pass">Đạt (≥5.0)</option>
                        <option value="fail">Chưa đạt (&lt;5.0)</option>
                      </select>
                    </div>
                  </div>
                  {hasActiveFilter && (
                    <button
                      onClick={() => { setSearch(""); setFilterSubject("all"); setFilterScore("all"); }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              )}

              {/* Results count */}
              {historyList.length > 0 && (
                <p className="text-[10px] text-slate-600 text-right">
                  {hasActiveFilter ? `${filtered.length} / ${historyList.length} kết quả` : `${historyList.length} bài thi`}
                </p>
              )}
            </div>

            {historyList.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">Chưa có bài thi nào được chấm.</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">Không có kết quả phù hợp.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-200 truncate">{item.studentName}</h4>
                      <p className="text-[10px] text-slate-500 flex gap-2 flex-wrap">
                        <span>SBD: <b>{item.sbd || "?"}</b></span>
                        <span>Mã đề: <b>{item.examCode || "?"}</b></span>
                        <span>{item.subjectName}</span>
                      </p>
                      <p className="text-[9px] text-slate-600">{item.gradedAt}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`text-center py-1 px-3 rounded-lg font-extrabold text-sm ${
                        item.totalScore >= 8.0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : item.totalScore >= 5.0
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {item.totalScore.toFixed(2)}
                      </div>
                      <button
                        onClick={() => setDetailItem(item)}
                        className="text-slate-500 hover:text-blue-400 p-1.5 transition-colors rounded"
                        title="Xem chi tiết"
                      >
                        <Eye size={14} />
                      </button>
                      <button onClick={() => onDeleteItem(item.id)} className="text-slate-600 hover:text-red-400 p-1.5 transition-colors rounded">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {historySubTab === "analytics" && (
          <div className="space-y-5">
            {historyList.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">Cần ít nhất một bài thi để hiển thị phân tích.</p>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Tổng bài", value: historyList.length, color: "text-blue-400" },
                    { label: "Điểm TB", value: (historyList.reduce((s,i) => s+i.totalScore,0)/historyList.length).toFixed(2), color: "text-emerald-400" },
                    { label: "Tỉ lệ đạt", value: Math.round(historyList.filter(i=>i.totalScore>=5).length/historyList.length*100)+"%", color: "text-indigo-400" },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                      <span className={`block text-xl font-extrabold ${s.color}`}>{s.value}</span>
                      <span className="text-[10px] text-slate-400">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Score Distribution Histogram */}
                <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">PHỔ ĐIỂM HỌC SINH</h4>
                  <div className="w-full flex justify-center">
                    <svg width="280" height="160" className="overflow-visible font-mono text-[9px] fill-slate-400">
                      <line x1="30" y1="120" x2="270" y2="120" stroke="#334155" strokeWidth="1" />
                      <line x1="30" y1="80" x2="270" y2="80" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />
                      <line x1="30" y1="40" x2="270" y2="40" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />
                      {bands.map((val, idx) => {
                        const barH = (val / maxBand) * 90;
                        const x = 38 + idx * 46;
                        const y = 120 - barH;
                        const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];
                        return (
                          <g key={idx}>
                            <rect x={x} y={y} width="30" height={barH} fill={colors[idx]} rx="3" opacity="0.85" />
                            {val > 0 && <text x={x + 15} y={y - 5} textAnchor="middle" className="font-extrabold fill-slate-200">{val}</text>}
                          </g>
                        );
                      })}
                      <text x="53" y="135" textAnchor="middle">0-2.5</text>
                      <text x="99" y="135" textAnchor="middle">2.5-5</text>
                      <text x="145" y="135" textAnchor="middle">5-7.5</text>
                      <text x="191" y="135" textAnchor="middle">7.5-9</text>
                      <text x="237" y="135" textAnchor="middle">9-10</text>
                    </svg>
                  </div>
                </div>

                {/* Trend Chart */}
                {trendByDate.length > 1 && (
                  <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">XU HƯỚNG ĐIỂM TB THEO NGÀY</h4>
                    <div className="w-full flex justify-center">
                      <svg width="280" height="120" className="overflow-visible font-mono text-[9px] fill-slate-400">
                        {/* Grid lines */}
                        <line x1="30" y1="100" x2="270" y2="100" stroke="#334155" strokeWidth="1" />
                        <line x1="30" y1="50" x2="270" y2="50" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />
                        <text x="20" y="103" textAnchor="end">0</text>
                        <text x="20" y="53" textAnchor="end">5</text>
                        <text x="20" y="5" textAnchor="end">10</text>

                        {/* Line and Points */}
                        {trendByDate.map((item, idx) => {
                          const x = 40 + idx * ((270 - 40) / Math.max(trendByDate.length - 1, 1));
                          const y = 100 - (item.avg / 10) * 100;
                          
                          // Line to next point
                          if (idx < trendByDate.length - 1) {
                            const nextItem = trendByDate[idx + 1];
                            const nx = 40 + (idx + 1) * ((270 - 40) / Math.max(trendByDate.length - 1, 1));
                            const ny = 100 - (nextItem.avg / 10) * 100;
                            return <line key={`l-${idx}`} x1={x} y1={y} x2={nx} y2={ny} stroke="#60a5fa" strokeWidth="2" />;
                          }
                          return null;
                        })}

                        {/* Points & Labels */}
                        {trendByDate.map((item, idx) => {
                          const x = 40 + idx * ((270 - 40) / Math.max(trendByDate.length - 1, 1));
                          const y = 100 - (item.avg / 10) * 100;
                          return (
                            <g key={`p-${idx}`}>
                              <circle cx={x} cy={y} r="3" fill="#3b82f6" />
                              <text x={x} y={y - 8} textAnchor="middle" className="font-extrabold fill-slate-200">{item.avg.toFixed(1)}</text>
                              <text x={x} y="115" textAnchor="middle">{item.date}</text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                )}

                {/* Stats by Exam Code */}
                {Object.keys(statsByCode).length > 1 && (
                  <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">THỐNG KÊ THEO MÃ ĐỀ</h4>
                    <div className="space-y-2">
                      {Object.entries(statsByCode).map(([code, s]) => (
                        <div key={code} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <span className="font-bold text-blue-400">Mã đề {code}</span>
                          <div className="flex gap-3 text-[10px] text-slate-400">
                            <span><b className="text-slate-200">{s.count}</b> bài</span>
                            <span>TB <b className="text-emerald-400">{(s.sum / s.count).toFixed(2)}</b></span>
                            <span>Đạt <b className="text-indigo-400">{Math.round((s.pass / s.count) * 100)}%</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hardest Questions */}
                {questionRates.length > 0 && (
                  <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2">
                      CÂU HỎI KHÓ NHẤT (Phần I — tỷ lệ đúng thấp)
                    </h4>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {questionRates.slice(0, 8).map((item) => (
                        <div key={item.num} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <span className="font-bold text-slate-300">Câu {item.num}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.rate < 40 ? "bg-red-500" : item.rate < 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${item.rate}%` }}
                              />
                            </div>
                            <span className={`font-bold ${item.rate < 45 ? "text-red-400" : "text-slate-300"}`}>
                              {item.rate}% đúng
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      Hiển thị các câu có tỷ lệ đúng thấp nhất. Màu đỏ = dưới 40%.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
