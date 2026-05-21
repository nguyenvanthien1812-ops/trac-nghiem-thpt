import { useMemo } from "react";
import { AlertCircle } from "lucide-react";

export default function ItemAnalysis({ historyList }) {
  const stats = useMemo(() => {
    if (!historyList || historyList.length === 0) return null;

    const total = historyList.length;
    // Assuming part1 count is uniform in the filtered list (since it's usually filtered by exam code or subject)
    // We take the max length found in part1
    let p1Count = 0;
    historyList.forEach(r => {
      if (r.breakdown?.part1?.length > p1Count) p1Count = r.breakdown.part1.length;
    });

    if (p1Count === 0) return null;

    const p1Stats = Array.from({ length: p1Count }, (_, i) => ({
      num: i + 1,
      correct: 0,
      a: 0, b: 0, c: 0, d: 0,
      other: 0, // empty or multiple
      correctAns: "",
    }));

    historyList.forEach(r => {
      const p1 = r.breakdown?.part1;
      if (!p1) return;
      p1Stats.forEach((stat, i) => {
        const q = p1[i];
        if (!q) return;
        if (q.isCorrect) stat.correct++;
        if (q.correct) stat.correctAns = q.correct;

        if (q.student === "A") stat.a++;
        else if (q.student === "B") stat.b++;
        else if (q.student === "C") stat.c++;
        else if (q.student === "D") stat.d++;
        else stat.other++;
      });
    });

    return { total, p1Stats };
  }, [historyList]);

  if (!stats) {
    return (
      <div className="text-center py-10 text-slate-500 text-xs">
        Không có dữ liệu phân tích. Hãy chấm bài hoặc lọc danh sách để xem.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
        <h4 className="text-xs font-bold text-slate-300 border-b border-slate-800 pb-2 flex justify-between items-center">
          <span>PHÂN TÍCH CÂU HỎI (Phần I)</span>
          <span className="text-[10px] text-slate-500 font-normal">Tổng: {stats.total} bài</span>
        </h4>

        <div className="space-y-3">
          {stats.p1Stats.map((q) => {
            const rate = Math.round((q.correct / stats.total) * 100) || 0;
            const rateColor = rate < 40 ? "text-red-400" : rate < 70 ? "text-amber-400" : "text-emerald-400";
            const barColor = rate < 40 ? "bg-red-500" : rate < 70 ? "bg-amber-500" : "bg-emerald-500";

            // Identify strongest distractor
            const choices = [
              { label: "A", count: q.a }, { label: "B", count: q.b },
              { label: "C", count: q.c }, { label: "D", count: q.d }
            ];
            const distractors = choices.filter(c => c.label !== q.correctAns);
            distractors.sort((x, y) => y.count - x.count);
            const topDistractor = distractors[0];

            return (
              <div key={q.num} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs">Câu {q.num}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      ĐA: {q.correctAns || "?"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${rate}%` }} />
                    </div>
                    <span className={`font-bold text-xs ${rateColor} w-10 text-right`}>{rate}%</span>
                  </div>
                </div>

                <div className="flex justify-between gap-1">
                  {choices.map(c => {
                    const isCorrect = c.label === q.correctAns;
                    const isTopDistractor = !isCorrect && c.count > 0 && c.label === topDistractor?.label && topDistractor.count >= (stats.total * 0.2); // Only flag if > 20% chose it
                    const pct = Math.round((c.count / stats.total) * 100) || 0;
                    
                    return (
                      <div key={c.label} className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg border ${
                        isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : 
                        isTopDistractor ? "bg-red-500/10 border-red-500/30" : 
                        "bg-slate-950 border-slate-800"
                      }`}>
                        <span className={`text-[10px] font-bold ${
                          isCorrect ? "text-emerald-400" :
                          isTopDistractor ? "text-red-400" : "text-slate-500"
                        }`}>{c.label}</span>
                        <span className={`text-[9px] ${
                          isCorrect ? "text-emerald-300" :
                          isTopDistractor ? "text-red-300" : "text-slate-600"
                        }`}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                {topDistractor && topDistractor.count >= (stats.total * 0.2) && (
                  <div className="flex items-center gap-1.5 text-[10px] text-red-400 mt-1">
                    <AlertCircle size={10} />
                    <span>Nhiều học sinh chọn nhầm đáp án <b>{topDistractor.label}</b> ({Math.round(topDistractor.count/stats.total*100)}%)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
