import { useState, useRef } from "react";
import {
  Users, Plus, Trash2, Edit3, Check, X, Upload,
  ChevronDown, ChevronRight, UserPlus, Search, Printer
} from "lucide-react";

// ── Add/Edit Student Modal ────────────────────────────────────────────────────
function StudentModal({ classId, student, onSave, onClose }) {
  const [sbd, setSbd] = useState(student?.sbd || "");
  const [name, setName] = useState(student?.name || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sbd.trim() || !name.trim()) return;
    onSave(classId, student?.sbd || null, sbd, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-200">
            {student ? "Sửa học sinh" : "Thêm học sinh"}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Số Báo Danh (SBD)</label>
            <input
              type="text"
              value={sbd}
              onChange={(e) => setSbd(e.target.value)}
              placeholder="VD: 123456"
              className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Họ và tên</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nguyễn Văn An"
              className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 active:scale-95 transition-all">
              Hủy
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
              {student ? "Lưu" : "Thêm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Single Class Card ──────────────────────────────────────────────────────────
function ClassCard({
  cls, historyList, onRename, onDelete, onAddStudent, onEditStudent, onDeleteStudent, onImportCSV,
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(cls.name);
  const [studentModal, setStudentModal] = useState(null); // null | { student? }
  const [search, setSearch] = useState("");
  const csvInputRef = useRef(null);

  const handleExportPDF = () => {
    const classHistory = historyList.filter(h => h.className === cls.name);
    const totalGraded = classHistory.length;
    const avgScore = totalGraded > 0 ? (classHistory.reduce((s, h) => s + h.totalScore, 0) / totalGraded).toFixed(2) : "--";
    const passCount = classHistory.filter(h => h.totalScore >= 5).length;
    const passRate = totalGraded > 0 ? Math.round((passCount / totalGraded) * 100) : 0;
    const maxScore = totalGraded > 0 ? Math.max(...classHistory.map(h => h.totalScore)).toFixed(2) : "--";

    // Score distribution bands
    const bands = [0, 0, 0, 0, 0];
    classHistory.forEach(({ totalScore: s }) => {
      if (s < 2.5) bands[0]++;
      else if (s < 5.0) bands[1]++;
      else if (s < 7.5) bands[2]++;
      else if (s < 9.0) bands[3]++;
      else bands[4]++;
    });
    const maxBand = Math.max(...bands, 1);

    // SVG Histogram
    const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];
    let barsHtml = "";
    bands.forEach((val, idx) => {
      const barH = (val / maxBand) * 90;
      const x = 38 + idx * 46;
      const y = 120 - barH;
      const color = colors[idx];
      barsHtml += `
        <g>
          <rect x="${x}" y="${y}" width="30" height="${barH}" fill="${color}" rx="3" opacity="0.85" />
          ${val > 0 ? `<text x="${x + 15}" y="${y - 5}" text-anchor="middle" font-weight="bold" fill="#1e293b" style="font-size: 9px; font-family: sans-serif;">${val}</text>` : ""}
        </g>
      `;
    });

    const svgHtml = `
      <svg width="280" height="160" class="chart-svg" style="overflow: visible; font-family: sans-serif; font-size: 9px; fill: #64748b;">
        <line x1="30" y1="120" x2="270" y2="120" stroke="#cbd5e1" stroke-width="1" />
        <line x1="30" y1="80" x2="270" y2="80" stroke="#cbd5e1" stroke-width="0.5" stroke-dasharray="2" />
        <line x1="30" y1="40" x2="270" y2="40" stroke="#cbd5e1" stroke-width="0.5" stroke-dasharray="2" />
        ${barsHtml}
        <text x="53" y="135" text-anchor="middle">0-2.5</text>
        <text x="99" y="135" text-anchor="middle">2.5-5</text>
        <text x="145" y="135" text-anchor="middle">5-7.5</text>
        <text x="191" y="135" text-anchor="middle">7.5-9</text>
        <text x="237" y="135" text-anchor="middle">9-10</text>
      </svg>
    `;

    // Map student records (graded + absent)
    const studentRecords = [];
    cls.students.forEach(student => {
      const records = classHistory.filter(h => h.sbd === student.sbd);
      if (records.length > 0) {
        records.forEach(r => {
          studentRecords.push({
            sbd: r.sbd,
            name: student.name,
            subjectName: r.subjectName,
            examCode: r.examCode,
            totalScore: r.totalScore,
            gradedAt: r.gradedAt,
            isGraded: true,
          });
        });
      } else {
        studentRecords.push({
          sbd: student.sbd,
          name: student.name,
          subjectName: "--",
          examCode: "--",
          totalScore: null,
          gradedAt: "--",
          isGraded: false,
        });
      }
    });

    // Include graded items for SBDs NOT in the class roster (if any)
    const rosterSbds = new Set(cls.students.map(s => s.sbd));
    classHistory.forEach(r => {
      if (!rosterSbds.has(r.sbd)) {
        studentRecords.push({
          sbd: r.sbd,
          name: r.studentName || `Thí sinh SBD ${r.sbd}`,
          subjectName: r.subjectName,
          examCode: r.examCode,
          totalScore: r.totalScore,
          gradedAt: r.gradedAt,
          isGraded: true,
        });
      }
    });

    // Sort: graded first, then by SBD
    studentRecords.sort((a, b) => {
      if (a.isGraded !== b.isGraded) {
        return b.isGraded ? -1 : 1;
      }
      return a.sbd.localeCompare(b.sbd);
    });

    let tableRowsHtml = "";
    studentRecords.forEach((r, idx) => {
      const scoreStr = r.totalScore !== null ? r.totalScore.toFixed(2) : "--";
      const statusHtml = r.totalScore !== null
        ? (r.totalScore >= 5.0
            ? `<span class="badge badge-pass">Đạt</span>`
            : `<span class="badge badge-fail">Chưa đạt</span>`)
        : `<span class="badge badge-none">Vắng/Chưa chấm</span>`;
      
      tableRowsHtml += `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td class="text-center" style="font-family: monospace; font-weight: bold; color: #2563eb;">${r.sbd}</td>
          <td>${r.name}</td>
          <td class="text-center">${r.subjectName}</td>
          <td class="text-center">${r.examCode}</td>
          <td class="text-center" style="font-weight: 800; color: ${r.totalScore !== null ? (r.totalScore >= 8.0 ? '#10b981' : r.totalScore >= 5.0 ? '#3b82f6' : '#ef4444') : '#64748b'}">${scoreStr}</td>
          <td class="text-center">${statusHtml}</td>
          <td class="text-center" style="font-size: 10px; color: #64748b;">${r.gradedAt}</td>
        </tr>
      `;
    });

    // Item Analysis calculations
    let p1Count = 0;
    classHistory.forEach(r => {
      if (r.breakdown?.part1?.length > p1Count) p1Count = r.breakdown.part1.length;
    });

    let itemAnalysisHtml = "";
    if (p1Count > 0) {
      const p1Stats = Array.from({ length: p1Count }, (_, i) => ({
        num: i + 1,
        correct: 0,
        a: 0, b: 0, c: 0, d: 0,
        other: 0,
        correctAns: "",
      }));

      classHistory.forEach(r => {
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

      let analysisCards = "";
      p1Stats.forEach(q => {
        const rate = Math.round((q.correct / totalGraded) * 100) || 0;
        const rateColor = rate < 40 ? "#ef4444" : rate < 70 ? "#d97706" : "#16a34a";

        const choices = [
          { label: "A", count: q.a }, { label: "B", count: q.b },
          { label: "C", count: q.c }, { label: "D", count: q.d }
        ];

        const distractors = choices.filter(c => c.label !== q.correctAns);
        distractors.sort((x, y) => y.count - x.count);
        const topDistractor = distractors[0];
        const isTopDistractor = topDistractor && topDistractor.count > 0 && topDistractor.count >= (totalGraded * 0.2);

        let choicesHtml = "";
        choices.forEach(c => {
          const isCorrect = c.label === q.correctAns;
          const isTop = !isCorrect && isTopDistractor && c.label === topDistractor?.label;
          const pct = Math.round((c.count / totalGraded) * 100) || 0;

          let bgStyle = "";
          let textStyle = "color: #64748b;";
          if (isCorrect) {
            bgStyle = "background-color: #dcfce7; border-color: #bbf7d0;";
            textStyle = "color: #15803d; font-weight: bold;";
          } else if (isTop) {
            bgStyle = "background-color: #fee2e2; border-color: #fca5a5;";
            textStyle = "color: #b91c1c; font-weight: bold;";
          }

          choicesHtml += `
            <div class="choice-box" style="${bgStyle}">
              <div style="${textStyle}">${c.label}</div>
              <div style="font-size: 8px; ${isCorrect ? 'color: #16a34a;' : isTop ? 'color: #ef4444;' : 'color: #94a3b8;'}">${pct}%</div>
            </div>
          `;
        });

        let warningHtml = "";
        if (isTopDistractor) {
          warningHtml = `
            <div style="display: flex; align-items: center; gap: 4px; font-size: 8px; color: #ef4444; margin-top: 6px;">
              ⚠️ Lựa chọn sai phổ biến: <b>${topDistractor.label}</b> (${Math.round(topDistractor.count/totalGraded*100)}%)
            </div>
          `;
        }

        analysisCards += `
          <div class="analysis-card">
            <div class="analysis-header">
              <span>Câu ${q.num} <span style="font-size: 9px; color: #64748b; font-weight: normal; margin-left: 4px;">ĐA: ${q.correctAns || "?"}</span></span>
              <span style="color: ${rateColor}; font-weight: bold;">${rate}% đúng</span>
            </div>
            <div class="analysis-choices">
              ${choicesHtml}
            </div>
            ${warningHtml}
          </div>
        `;
      });

      itemAnalysisHtml = `
        <div class="section-title page-break">Phân tích chi tiết câu hỏi (Phần I — Trắc nghiệm)</div>
        <p style="font-size: 11px; color: #64748b; margin-top: -10px; margin-bottom: 15px;">
          💡 <b>Cách đọc:</b> Ô màu xanh lá cây là đáp án đúng. Ô màu đỏ thể hiện lựa chọn sai phổ biến mà trên 20% học sinh chọn nhầm (mồi nhử mạnh).
        </p>
        <div class="item-analysis-grid">
          ${analysisCards}
        </div>
      `;
    }

    // ── Part II analysis ──────────────────────────────────────────────────────
    let p2AnalysisHtml = "";
    let p2Count = 0;
    classHistory.forEach(r => { if (r.breakdown?.part2?.length > p2Count) p2Count = r.breakdown.part2.length; });
    if (p2Count > 0) {
      const p2Stats = Array.from({ length: p2Count }, (_, i) => ({
        num: i + 1, fullCorrect: 0,
        subs: { a: { correct: 0, T: 0, F: 0, blank: 0, correctAns: "" },
                b: { correct: 0, T: 0, F: 0, blank: 0, correctAns: "" },
                c: { correct: 0, T: 0, F: 0, blank: 0, correctAns: "" },
                d: { correct: 0, T: 0, F: 0, blank: 0, correctAns: "" } },
      }));
      classHistory.forEach(r => {
        r.breakdown?.part2?.forEach((q, i) => {
          if (!q || !p2Stats[i]) return;
          if (q.correctCount === 4) p2Stats[i].fullCorrect++;
          ["a", "b", "c", "d"].forEach(sub => {
            const sd = q.subAnswers?.[sub];
            if (!sd) return;
            const s = p2Stats[i].subs[sub];
            if (sd.isCorrect) s.correct++;
            if (sd.correct) s.correctAns = sd.correct;
            if (sd.student === "T") s.T++; else if (sd.student === "F") s.F++; else s.blank++;
          });
        });
      });

      let p2Cards = "";
      p2Stats.forEach(q => {
        const fullRate = totalGraded > 0 ? Math.round(q.fullCorrect / totalGraded * 100) : 0;
        const rateCol = fullRate < 40 ? "#ef4444" : fullRate < 70 ? "#d97706" : "#16a34a";
        let subHtml = "";
        ["a", "b", "c", "d"].forEach(sub => {
          const s = q.subs[sub];
          const rate = totalGraded > 0 ? Math.round(s.correct / totalGraded * 100) : 0;
          const ans = s.correctAns === "T" ? "Đ" : s.correctAns === "F" ? "S" : "?";
          const col = rate < 40 ? "#ef4444" : rate < 70 ? "#d97706" : "#16a34a";
          subHtml += `
            <div style="flex:1; padding:6px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
              <div style="display:flex; justify-content:space-between; font-size:9px;">
                <b style="color:#334155;">${sub.toUpperCase()}</b>
                <span style="color:#64748b;">ĐA:${ans}</span>
              </div>
              <div style="font-weight:800; color:${col}; font-size:10px; margin-top:2px;">${rate}%</div>
              <div style="font-size:8px; color:#94a3b8;">Đ:${Math.round(s.T/totalGraded*100)}% S:${Math.round(s.F/totalGraded*100)}%</div>
            </div>`;
        });
        p2Cards += `
          <div class="analysis-card">
            <div class="analysis-header">
              <span>Câu ${q.num}</span>
              <span style="color:${rateCol}; font-weight:bold;">${fullRate}% đúng 4/4</span>
            </div>
            <div style="display:flex; gap:4px; margin-top:6px;">${subHtml}</div>
          </div>`;
      });

      p2AnalysisHtml = `
        <div class="section-title page-break">Phân tích chi tiết câu hỏi (Phần II — Đúng/Sai)</div>
        <div class="item-analysis-grid">${p2Cards}</div>`;
    }

    // ── Part III analysis ─────────────────────────────────────────────────────
    let p3AnalysisHtml = "";
    let p3Count = 0;
    classHistory.forEach(r => { if (r.breakdown?.part3?.length > p3Count) p3Count = r.breakdown.part3.length; });
    if (p3Count > 0) {
      const p3Stats = Array.from({ length: p3Count }, (_, i) => ({
        num: i + 1, correct: 0, correctAns: "", wrongAnswers: {},
      }));
      classHistory.forEach(r => {
        r.breakdown?.part3?.forEach((q, i) => {
          if (!q || !p3Stats[i]) return;
          if (q.correct) p3Stats[i].correctAns = q.correct;
          if (q.isCorrect) { p3Stats[i].correct++; }
          else if (q.student) { const a = q.student.trim(); p3Stats[i].wrongAnswers[a] = (p3Stats[i].wrongAnswers[a] || 0) + 1; }
        });
      });

      let p3Rows = "";
      p3Stats.forEach(q => {
        const rate = totalGraded > 0 ? Math.round(q.correct / totalGraded * 100) : 0;
        const rateCol = rate < 40 ? "#ef4444" : rate < 70 ? "#d97706" : "#16a34a";
        const topWrong = Object.entries(q.wrongAnswers).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const wrongStr = topWrong.map(([ans, cnt]) => `<span style="background:#fee2e2;color:#b91c1c;padding:1px 5px;border-radius:4px;font-family:monospace;">${ans} (${Math.round(cnt/totalGraded*100)}%)</span>`).join(" ");
        p3Rows += `
          <tr>
            <td style="font-weight:bold;">Câu ${q.num}</td>
            <td style="font-family:monospace; color:#16a34a; font-weight:bold;">${q.correctAns || "?"}</td>
            <td style="font-weight:800; color:${rateCol};">${rate}%</td>
            <td>${wrongStr || "—"}</td>
          </tr>`;
      });

      p3AnalysisHtml = `
        <div class="section-title page-break">Phân tích chi tiết câu hỏi (Phần III — Trả lời ngắn)</div>
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-top:8px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:6px; text-align:left; border:1px solid #e2e8f0;">Câu</th>
            <th style="padding:6px; text-align:center; border:1px solid #e2e8f0;">Đáp án</th>
            <th style="padding:6px; text-align:center; border:1px solid #e2e8f0;">Tỉ lệ đúng</th>
            <th style="padding:6px; text-align:left; border:1px solid #e2e8f0;">Sai phổ biến</th>
          </tr></thead>
          <tbody>${p3Rows}</tbody>
        </table>`;
    }

    const printWin = window.open("", "_blank");
    if (!printWin) {
      alert("Hãy cho phép cửa sổ bật lên (pop-up) để xuất báo cáo!");
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Báo cáo kết quả - Lớp ${cls.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&display=swap');
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.5;
          }
          
          .no-print {
            background-color: #0f172a;
            color: #f8fafc;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            font-family: 'Outfit', sans-serif;
          }
          
          .no-print-btn {
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            transition: all 0.2s;
          }
          
          .no-print-btn:hover {
            background-color: #4338ca;
          }
          
          .no-print-btn-secondary {
            background-color: #334155;
            color: #cbd5e1;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            font-size: 13px;
            margin-left: 8px;
            transition: all 0.2s;
          }
          
          .no-print-btn-secondary:hover {
            background-color: #475569;
            color: #f1f5f9;
          }
          
          .report-container {
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
          }
          
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .header-school {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
          }
          
          .header-title {
            text-align: center;
            margin: 25px 0;
          }
          
          .header-title h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 24px;
            font-weight: 800;
            color: #1e1b4b;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .header-title p {
            font-size: 13px;
            color: #64748b;
            margin: 6px 0 0 0;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 30px;
          }
          
          .stat-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            text-align: center;
          }
          
          .stat-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
          }
          
          .stat-value {
            font-family: 'Outfit', sans-serif;
            font-size: 20px;
            font-weight: 800;
            color: #312e81;
          }
          
          .section-title {
            font-family: 'Outfit', sans-serif;
            font-size: 14px;
            font-weight: 700;
            color: #1e1b4b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
            margin: 30px 0 15px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .chart-flex {
            display: flex;
            gap: 20px;
            align-items: center;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 30px;
          }
          
          .chart-info {
            flex: 1;
            font-size: 12px;
            color: #475569;
          }
          
          .chart-info ul {
            margin: 8px 0 0 0;
            padding-left: 20px;
          }
          
          .chart-info li {
            margin-bottom: 4px;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          
          .table th {
            background-color: #f1f5f9;
            border-bottom: 2px solid #cbd5e1;
            color: #334155;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
            padding: 10px 12px;
            text-align: left;
          }
          
          .table td {
            border-bottom: 1px solid #e2e8f0;
            padding: 10px 12px;
            font-size: 12px;
            color: #334155;
          }
          
          .table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          .text-center {
            text-align: center !important;
          }
          
          .text-right {
            text-align: right !important;
          }
          
          .badge {
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            display: inline-block;
          }
          
          .badge-pass {
            background-color: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          
          .badge-fail {
            background-color: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fca5a5;
          }
          
          .badge-none {
            background-color: #f1f5f9;
            color: #64748b;
            border: 1px solid #cbd5e1;
          }
          
          .item-analysis-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          
          .analysis-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            background-color: #ffffff;
            break-inside: avoid;
          }
          
          .analysis-header {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          
          .analysis-choices {
            display: flex;
            gap: 4px;
          }
          
          .choice-box {
            flex: 1;
            text-align: center;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 4px;
            font-size: 10px;
          }
          
          .signature-block {
            margin-top: 40px;
            display: flex;
            justify-content: flex-end;
            text-align: center;
            break-inside: avoid;
          }
          
          .signature-wrap {
            width: 220px;
          }
          
          .signature-title {
            font-size: 11px;
            font-weight: bold;
            color: #334155;
            margin-bottom: 50px;
          }
          
          .signature-name {
            font-size: 11px;
            font-weight: bold;
            color: #1e293b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 5px;
          }
          
          @media print {
            body {
              background-color: #ffffff;
              color: #000000;
            }
            .no-print {
              display: none !important;
            }
            .report-container {
              margin: 0;
              padding: 0;
              max-width: 100%;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <div style="font-weight: 800; font-size: 14px;">Báo cáo Lớp ${cls.name} — THPT Grader</div>
          <div>
            <button class="no-print-btn" onclick="window.print()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              In / Lưu PDF
            </button>
            <button class="no-print-btn-secondary" onclick="window.close()">Đóng</button>
          </div>
        </div>
        
        <div class="report-container">
          <table class="header-table">
            <tr>
              <td class="header-school" style="width: 50%;">SỞ GD&ĐT: .....................................................</td>
              <td class="header-school text-right" style="width: 50%;">MẪU BÁO CÁO THPT GRADER</td>
            </tr>
          </table>
          
          <div class="header-title">
            <h1>Báo cáo kết quả học tập lớp ${cls.name}</h1>
            <p>Dữ liệu tổng hợp từ hệ thống chấm trắc nghiệm THPT Grader • Ngày lập: ${new Date().toLocaleDateString("vi-VN")}</p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">SĨ SỐ LỚP</div>
              <div class="stat-value">${cls.students.length}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">ĐÃ CHẤM</div>
              <div class="stat-value">${totalGraded}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">ĐIỂM TRUNG BÌNH</div>
              <div class="stat-value" style="color: #4f46e5;">${avgScore}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">TỈ LỆ ĐẠT (≥5)</div>
              <div class="stat-value" style="color: #10b981;">${passRate}%</div>
            </div>
          </div>
          
          ${totalGraded > 0 ? `
            <div class="section-title">Phổ điểm lớp học</div>
            <div class="chart-flex">
              <div>
                ${svgHtml}
              </div>
              <div class="chart-info">
                <p style="margin: 0; font-weight: bold; color: #1e1b4b;">Nhận xét phân bố điểm:</p>
                <ul>
                  <li>Điểm cao nhất đạt được: <b>${maxScore}</b>/10</li>
                  <li>Số lượng học sinh đạt loại Giỏi (≥8.5): <b>${classHistory.filter(h => h.totalScore >= 8.5).length}</b> học sinh.</li>
                  <li>Số lượng học sinh chưa đạt (&lt;5.0): <b>${classHistory.filter(h => h.totalScore < 5.0).length}</b> học sinh.</li>
                  <li>Phổ điểm tập trung chủ yếu ở khoảng <b>${
                    bands[2] === Math.max(...bands) ? 'Trung bình (5.0 - 7.5)' :
                    bands[3] === Math.max(...bands) ? 'Khá (7.5 - 9.0)' :
                    bands[4] === Math.max(...bands) ? 'Giỏi (9.0 - 10.0)' : 'Dưới trung bình (&lt;5.0)'
                  }</b>.</li>
                </ul>
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 30px; border: 1px dashed #cbd5e1; border-radius: 12px; margin-bottom: 30px; color: #64748b;">
              Chưa có dữ liệu bài thi được chấm cho lớp này. Hãy tiến hành quét chấm điểm học sinh để xem phổ điểm và phân tích.
            </div>
          `}
          
          <div class="section-title">Bảng điểm chi tiết lớp học</div>
          <table class="table">
            <thead>
              <tr>
                <th class="text-center" style="width: 5%;">STT</th>
                <th class="text-center" style="width: 12%;">SBD</th>
                <th style="width: 25%;">Họ và tên</th>
                <th class="text-center" style="width: 15%;">Môn học</th>
                <th class="text-center" style="width: 10%;">Mã đề</th>
                <th class="text-center" style="width: 10%;">Điểm</th>
                <th class="text-center" style="width: 13%;">Kết quả</th>
                <th class="text-center" style="width: 15%;">Ngày chấm</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          
          ${itemAnalysisHtml}
          ${p2AnalysisHtml}
          ${p3AnalysisHtml}

          <div class="signature-block">
            <div class="signature-wrap">
              <div class="signature-title">Người lập báo cáo<br><span style="font-weight: normal; font-size: 10px; color: #64748b;">(Ký, ghi rõ họ tên)</span></div>
              <div class="signature-name">Giáo viên bộ môn</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== cls.name) {
      onRename(cls.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onImportCSV(cls.id, ev.target.result);
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const filteredStudents = cls.students.filter(
    (s) => !search || s.sbd.includes(search) || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const avg = cls.students.length > 0 ? cls.students.length : 0;

  return (
    <>
      {studentModal !== null && (
        <StudentModal
          classId={cls.id}
          student={studentModal.student}
          onSave={(classId, oldSbd, newSbd, newName) => {
            if (oldSbd) onEditStudent(classId, oldSbd, newSbd, newName);
            else onAddStudent(classId, newSbd, newName);
          }}
          onClose={() => setStudentModal(null)}
        />
      )}

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {/* Class Header */}
        <div className="flex items-center gap-2 p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsEditing(false); }}
              className="flex-1 bg-slate-800 border border-blue-500 rounded-lg px-2 py-1 text-sm font-bold text-slate-200 focus:outline-none"
              autoFocus
            />
          ) : (
            <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
              <span className="font-bold text-sm text-slate-200">{cls.name}</span>
              <span className="ml-2 text-[10px] text-slate-500">{cls.students.length} học sinh</span>
            </button>
          )}

          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => { setIsEditing(true); setEditName(cls.name); }}
              className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors rounded"
              title="Đổi tên lớp"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={() => onDelete(cls.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded"
              title="Xóa lớp"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Expanded: Student List & Stats */}
        {expanded && (
          <div className="border-t border-slate-800 p-4 space-y-4">
            
            {/* Class Stats */}
            {(() => {
              const classHistory = historyList.filter(h => h.className === cls.name);
              const avgScore = classHistory.length > 0 ? (classHistory.reduce((s, h) => s + h.totalScore, 0) / classHistory.length).toFixed(2) : "--";
              const passCount = classHistory.filter(h => h.totalScore >= 5).length;
              const passRate = classHistory.length > 0 ? Math.round((passCount / classHistory.length) * 100) : 0;
              const maxScore = classHistory.length > 0 ? Math.max(...classHistory.map(h => h.totalScore)).toFixed(2) : "--";

              return classHistory.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-violet-950/20 border border-violet-900/30">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold mb-1">ĐÃ CHẤM</div>
                    <div className="text-sm font-black text-slate-200">{classHistory.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold mb-1">ĐIỂM TB</div>
                    <div className="text-sm font-black text-violet-400">{avgScore}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold mb-1">TỈ LỆ ĐẠT</div>
                    <div className="text-sm font-black text-emerald-400">{passRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold mb-1">CAO NHẤT</div>
                    <div className="text-sm font-black text-blue-400">{maxScore}</div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Actions row */}
            <div className="flex gap-2">
              <button
                onClick={() => setStudentModal({})}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-400 text-[11px] font-bold hover:bg-blue-600/30 active:scale-95 transition-all"
              >
                <UserPlus size={12} /> Thêm học sinh
              </button>
              <button
                onClick={() => csvInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/30 text-emerald-400 text-[11px] font-bold hover:bg-emerald-900/50 active:scale-95 transition-all"
                title="Nhập từ file CSV (SBD,Họ tên)"
              >
                <Upload size={12} /> Nhập CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 text-[11px] font-bold hover:bg-indigo-600/30 active:scale-95 transition-all"
                title="Xuất báo cáo PDF kết quả và phân tích đáp án"
              >
                <Printer size={12} /> Xuất PDF
              </button>
              <input type="file" ref={csvInputRef} onChange={handleCSVUpload} accept=".csv,.txt" className="hidden" />
            </div>

            {/* CSV format hint */}
            <p className="text-[9px] text-slate-600">
              📄 File CSV: mỗi dòng gồm <code className="text-slate-500">SBD,Họ tên</code> (UTF-8, có thể có hàng tiêu đề)
            </p>

            {/* Search */}
            {cls.students.length > 5 && (
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo SBD hoặc tên..."
                  className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-slate-800 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Student list */}
            {cls.students.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-xs">
                Chưa có học sinh. Nhấn "Thêm học sinh" hoặc nhập CSV.
              </p>
            ) : filteredStudents.length === 0 ? (
              <p className="text-center py-4 text-slate-500 text-xs">Không tìm thấy.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {filteredStudents.map((s) => (
                  <div key={s.sbd} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/60 group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-blue-400 shrink-0">{s.sbd}</span>
                      <span className="text-xs text-slate-300 truncate">{s.name}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setStudentModal({ student: s })}
                        className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                        title="Sửa"
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        onClick={() => onDeleteStudent(cls.id, s.sbd)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Xóa"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Student count */}
            {cls.students.length > 0 && (
              <p className="text-[10px] text-slate-600 text-right">
                {search ? `${filteredStudents.length} / ${cls.students.length} học sinh` : `${cls.students.length} học sinh`}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Classes Component ─────────────────────────────────────────────────────
export default function Classes({
  classes,
  historyList,
  onAddClass,
  onRenameClass,
  onDeleteClass,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onImportCSV,
  showConfirm,
}) {
  const [newClassName, setNewClassName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddClass = (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    onAddClass(newClassName);
    setNewClassName("");
    setShowAddForm(false);
  };

  const handleDeleteClass = (classId) => {
    const cls = classes.find((c) => c.id === classId);
    const msg = cls?.students.length > 0
      ? `Xóa lớp "${cls.name}" sẽ xóa luôn ${cls.students.length} học sinh. Tiếp tục?`
      : `Xóa lớp "${cls?.name}"?`;
    showConfirm(msg, () => onDeleteClass(classId));
  };

  const handleDeleteStudent = (classId, sbd) => {
    showConfirm(`Xóa học sinh SBD ${sbd}?`, () => onDeleteStudent(classId, sbd));
  };

  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
            <Users size={16} className="text-violet-400" /> Quản lý Lớp học
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {classes.length} lớp • {totalStudents} học sinh
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
        >
          <Plus size={14} /> Tạo lớp
        </button>
      </div>

      {/* Add Class Form */}
      {showAddForm && (
        <form onSubmit={handleAddClass} className="flex gap-2 p-4 rounded-2xl bg-slate-900 border border-slate-700">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Tên lớp, VD: 12A1 Toán HK2..."
            className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
            autoFocus
          />
          <button type="submit" className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-500 active:scale-95 transition-all">
            <Check size={16} />
          </button>
          <button type="button" onClick={() => setShowAddForm(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
            <X size={16} />
          </button>
        </form>
      )}

      {/* Info box */}
      <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 text-[11px] text-violet-300 space-y-1.5">
        <p className="font-bold text-violet-200">💡 Cách sử dụng:</p>
        <ul className="list-disc pl-4 space-y-1 text-slate-400">
          <li>Tạo lớp học rồi thêm học sinh với SBD và họ tên.</li>
          <li>Khi chấm điểm, app tự tra SBD để điền tên học sinh.</li>
          <li>Nhập nhanh cả lớp bằng file CSV: mỗi dòng <code className="text-slate-500">SBD,Họ tên</code>.</li>
        </ul>
      </div>

      {/* Class list */}
      {classes.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Users size={32} className="text-slate-700 mx-auto" />
          <p className="text-slate-500 text-xs">Chưa có lớp học nào.</p>
          <p className="text-slate-600 text-[10px]">Nhấn "Tạo lớp" để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              historyList={historyList}
              onRename={onRenameClass}
              onDelete={handleDeleteClass}
              onAddStudent={onAddStudent}
              onEditStudent={onEditStudent}
              onDeleteStudent={handleDeleteStudent}
              onImportCSV={onImportCSV}
            />
          ))}
        </div>
      )}
    </div>
  );
}
