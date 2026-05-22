import { useMemo } from "react";
import { AlertCircle } from "lucide-react";

export default function ItemAnalysis({ historyList }) {
  const stats = useMemo(() => {
    if (!historyList || historyList.length === 0) return null;
    const total = historyList.length;

    // ── Part I ─────────────────────────────────────────────────────────────────
    let p1Count = 0;
    historyList.forEach(r => {
      if (r.breakdown?.part1?.length > p1Count) p1Count = r.breakdown.part1.length;
    });
    const p1Stats = p1Count > 0
      ? Array.from({ length: p1Count }, (_, i) => ({
          num: i + 1, correct: 0, a: 0, b: 0, c: 0, d: 0, other: 0, correctAns: "",
        }))
      : [];
    historyList.forEach(r => {
      r.breakdown?.part1?.forEach((q, i) => {
        if (!q || !p1Stats[i]) return;
        if (q.isCorrect) p1Stats[i].correct++;
        if (q.correct) p1Stats[i].correctAns = q.correct;
        if (q.student === "A") p1Stats[i].a++;
        else if (q.student === "B") p1Stats[i].b++;
        else if (q.student === "C") p1Stats[i].c++;
        else if (q.student === "D") p1Stats[i].d++;
        else p1Stats[i].other++;
      });
    });

    // ── Part II ────────────────────────────────────────────────────────────────
    let p2Count = 0;
    historyList.forEach(r => {
      if (r.breakdown?.part2?.length > p2Count) p2Count = r.breakdown.part2.length;
    });
    const p2Stats = p2Count > 0
      ? Array.from({ length: p2Count }, (_, i) => ({
          num: i + 1,
          subs: { a: { correct: 0, T: 0, F: 0, blank: 0, correctAns: "" },
                  b: { correct: 0, T: 0, F: 0, blank: 0, correctAns: "" },
                  c: { correct: 0, T: 0, F: 0, blank: 0, correctAns: "" },
                  d: { correct: 0, T: 0, F: 0, blank: 0, correctAns: "" } },
          fullCorrect: 0,
        }))
      : [];
    historyList.forEach(r => {
      r.breakdown?.part2?.forEach((q, i) => {
        if (!q || !p2Stats[i]) return;
        if (q.correctCount === 4) p2Stats[i].fullCorrect++;
        ["a", "b", "c", "d"].forEach(sub => {
          const sd = q.subAnswers?.[sub];
          if (!sd) return;
          const s = p2Stats[i].subs[sub];
          if (sd.isCorrect) s.correct++;
          if (sd.correct) s.correctAns = sd.correct;
          if (sd.student === "T") s.T++;
          else if (sd.student === "F") s.F++;
          else s.blank++;
        });
      });
    });

    // ── Part III ───────────────────────────────────────────────────────────────
    let p3Count = 0;
    historyList.forEach(r => {
      if (r.breakdown?.part3?.length > p3Count) p3Count = r.breakdown.part3.length;
    });
    const p3Stats = p3Count > 0
      ? Array.from({ length: p3Count }, (_, i) => ({
          num: i + 1, correct: 0, correctAns: "",
          wrongAnswers: {},  // Map<answer, count>
        }))
      : [];
    historyList.forEach(r => {
      r.breakdown?.part3?.forEach((q, i) => {
        if (!q || !p3Stats[i]) return;
        if (q.correct) p3Stats[i].correctAns = q.correct;
        if (q.isCorrect) {
          p3Stats[i].correct++;
        } else if (q.student) {
          const ans = q.student.trim();
          p3Stats[i].wrongAnswers[ans] = (p3Stats[i].wrongAnswers[ans] || 0) + 1;
        }
      });
    });

    return { total, p1Stats, p2Stats, p3Stats };
  }, [historyList]);

  if (!stats) {
    return (
      <div className="text-center py-10 text-slate-500 text-xs">
        Không có dữ liệu phân tích. Hãy chấm bài hoặc lọc danh sách để xem.
      </div>
    );
  }

  const rateColor = (rate) => rate < 40 ? "text-red-400" : rate < 70 ? "text-amber-400" : "text-emerald-400";
  const barColor  = (rate) => rate < 40 ? "bg-red-500"  : rate < 70 ? "bg-amber-500"  : "bg-emerald-500";

  return (
    <div className="space-y-4">

      {/* ── Part I ── */}
      {stats.p1Stats.length > 0 && (
        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex justify-between items-center">
            <span>PHÂN TÍCH CÂU HỎI (Phần I — Trắc nghiệm)</span>
            <span className="text-[10px] text-slate-500 font-normal">Tổng: {stats.total} bài</span>
          </h4>
          <div className="space-y-3">
            {stats.p1Stats.map((q) => {
              const rate = Math.round((q.correct / stats.total) * 100) || 0;
              const choices = [
                { label: "A", count: q.a }, { label: "B", count: q.b },
                { label: "C", count: q.c }, { label: "D", count: q.d }
              ];
              const distractors = choices.filter(c => c.label !== q.correctAns).sort((x, y) => y.count - x.count);
              const topDistractor = distractors[0];
              const flagTop = topDistractor?.count >= stats.total * 0.2;

              return (
                <div key={q.num} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-xs">Câu {q.num}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">ĐA: {q.correctAns || "?"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(rate)}`} style={{ width: `${rate}%` }} />
                      </div>
                      <span className={`font-bold text-xs ${rateColor(rate)} w-10 text-right`}>{rate}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between gap-1">
                    {choices.map(c => {
                      const isCorrect = c.label === q.correctAns;
                      const isTop = !isCorrect && flagTop && c.label === topDistractor?.label;
                      const pct = Math.round((c.count / stats.total) * 100) || 0;
                      return (
                        <div key={c.label} className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg border ${
                          isCorrect ? "bg-emerald-500/10 border-emerald-500/30" :
                          isTop ? "bg-red-500/10 border-red-500/30" : "bg-slate-950 border-slate-800"
                        }`}>
                          <span className={`text-[10px] font-bold ${isCorrect ? "text-emerald-400" : isTop ? "text-red-400" : "text-slate-500"}`}>{c.label}</span>
                          <span className={`text-[9px] ${isCorrect ? "text-emerald-300" : isTop ? "text-red-300" : "text-slate-600"}`}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                  {flagTop && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-400 mt-1">
                      <AlertCircle size={10} />
                      <span>Nhiều học sinh chọn nhầm đáp án <b>{topDistractor.label}</b> ({Math.round(topDistractor.count / stats.total * 100)}%)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Part II ── */}
      {stats.p2Stats.length > 0 && (
        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex justify-between items-center">
            <span>PHÂN TÍCH CÂU HỎI (Phần II — Đúng/Sai)</span>
            <span className="text-[10px] text-slate-500 font-normal">{stats.total} bài</span>
          </h4>
          <div className="space-y-3">
            {stats.p2Stats.map((q) => {
              const fullRate = Math.round((q.fullCorrect / stats.total) * 100) || 0;
              return (
                <div key={q.num} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200 text-xs">Câu {q.num}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500">Đúng 4/4:</span>
                      <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(fullRate)}`} style={{ width: `${fullRate}%` }} />
                      </div>
                      <span className={`font-bold text-[10px] ${rateColor(fullRate)}`}>{fullRate}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["a", "b", "c", "d"].map(sub => {
                      const s = q.subs[sub];
                      const rate = Math.round((s.correct / stats.total) * 100) || 0;
                      const correctLabel = s.correctAns === "T" ? "Đ" : s.correctAns === "F" ? "S" : "?";
                      return (
                        <div key={sub} className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{sub}</span>
                            <span className={`text-[9px] font-bold px-1 rounded ${s.correctAns === "T" ? "bg-emerald-900/50 text-emerald-400" : s.correctAns === "F" ? "bg-red-900/50 text-red-400" : "bg-slate-800 text-slate-500"}`}>
                              ĐA:{correctLabel}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                            <div className={`h-full rounded-full ${barColor(rate)}`} style={{ width: `${rate}%` }} />
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-500">
                            <span>Đ:{Math.round(s.T / stats.total * 100)}%</span>
                            <span>S:{Math.round(s.F / stats.total * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Part III ── */}
      {stats.p3Stats.length > 0 && (
        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex justify-between items-center">
            <span>PHÂN TÍCH CÂU HỎI (Phần III — Trả lời ngắn)</span>
            <span className="text-[10px] text-slate-500 font-normal">{stats.total} bài</span>
          </h4>
          <div className="space-y-2">
            {stats.p3Stats.map((q) => {
              const rate = Math.round((q.correct / stats.total) * 100) || 0;
              const topWrong = Object.entries(q.wrongAnswers)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
              return (
                <div key={q.num} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-xs">Câu {q.num}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400 font-mono">ĐA: {q.correctAns || "?"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(rate)}`} style={{ width: `${rate}%` }} />
                      </div>
                      <span className={`font-bold text-xs ${rateColor(rate)} w-10 text-right`}>{rate}%</span>
                    </div>
                  </div>
                  {topWrong.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {topWrong.map(([ans, cnt]) => (
                        <span key={ans} className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/30 border border-red-800/40 text-red-400 font-mono">
                          {ans} ({Math.round(cnt / stats.total * 100)}%)
                        </span>
                      ))}
                      <span className="text-[9px] text-slate-500 self-center">sai phổ biến</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
