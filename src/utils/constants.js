// Constants and layouts for the THPT exam bubble sheet (A4 aspect ratio: 800 x 1130)

export const SHEET_WIDTH = 800;
export const SHEET_HEIGHT = 1130;

export const SUBJECT_PRESETS = {
  math: {
    id: "math",
    name: "Toán học",
    part1Count: 12, // 12 questions (Part 1)
    part2Count: 4,  // 4 questions (Part 2)
    part3Count: 6,  // 6 questions (Part 3)
    part1Weight: 0.25, // 0.25 pts per question = 3.0 pts
    part3Weight: 0.5,  // 0.5 pts per question = 3.0 pts
    // Part 2 is graded using the MoET standard formula: 0.1, 0.25, 0.5, 1.0 (Total: 4.0 pts)
  },
  physics: {
    id: "physics",
    name: "Vật lý",
    part1Count: 18, // 18 questions (Part 1)
    part2Count: 4,  // 4 questions (Part 2)
    part3Count: 6,  // 6 questions (Part 3)
    part1Weight: 0.25, // 0.25 pts per question = 4.5 pts
    part3Weight: 0.25, // 0.25 pts per question = 1.5 pts
    // Part 2: 0.1, 0.25, 0.5, 1.0 (Total: 4.0 pts)
  },
  chemistry: {
    id: "chemistry",
    name: "Hóa học",
    part1Count: 18,
    part2Count: 4,
    part3Count: 6,
    part1Weight: 0.25,
    part3Weight: 0.25,
  },
  biology: {
    id: "biology",
    name: "Sinh học",
    part1Count: 18,
    part2Count: 4,
    part3Count: 6,
    part1Weight: 0.25,
    part3Weight: 0.25,
  },
  english: {
    id: "english",
    name: "Tiếng Anh",
    part1Count: 40, // Part 1 only (40 questions)
    part2Count: 0,
    part3Count: 0,
    part1Weight: 0.25, // 0.25 pts per question = 10.0 pts
    part3Weight: 0,
  },
  history: {
    id: "history",
    name: "Lịch sử",
    part1Count: 40,
    part2Count: 0,
    part3Count: 0,
    part1Weight: 0.25,
    part3Weight: 0,
  },
  geography: {
    id: "geography",
    name: "Địa lý",
    part1Count: 40,
    part2Count: 0,
    part3Count: 0,
    part1Weight: 0.25,
    part3Weight: 0,
  },
  civics: {
    id: "civics",
    name: "GDCD",
    part1Count: 40,
    part2Count: 0,
    part3Count: 0,
    part1Weight: 0.25,
    part3Weight: 0,
  },
  informatics: {
    id: "informatics",
    name: "Tin học",
    part1Count: 18,
    part2Count: 4,
    part3Count: 6,
    part1Weight: 0.25,
    part3Weight: 0.25,
  },
  technology: {
    id: "technology",
    name: "Công nghệ",
    part1Count: 18,
    part2Count: 4,
    part3Count: 6,
    part1Weight: 0.25,
    part3Weight: 0.25,
  },
};

// Default layout offsets (in percentages of SHEET_WIDTH and SHEET_HEIGHT)
// These define the standard position of every bubble grid, relative to the 4 corner anchors.
// The user can nudge (offset) and stretch (scale) these values using UI controls.
export const TEMPLATES = {
  "2025_STANDARD": {
    id: "2025_STANDARD",
    name: "Mẫu BGD 2025 (40-8-6)",
    part1Count: 40,
    part2Count: 8,
    part3Count: 6,
    subjectBounded: true,
    layout: {
      sbd: { x: 65.5, y: 9.8, w: 13.5, h: 18.0, cols: 6, rows: 10 },
      code: { x: 82.5, y: 9.8, w: 9.0, h: 18.0, cols: 4, rows: 10 },
      part1: {
        y: 35.8, h: 17.5,
        cols: [
          { x: 14.8, w: 12.0 },
          { x: 32.8, w: 12.0 },
          { x: 50.8, w: 12.0 },
          { x: 68.8, w: 12.0 }
        ],
        rows: 10, options: ["A", "B", "C", "D"]
      },
      part2: {
        y: 56.5, h: 10.0,
        cols: [
          { x: 13.6, w: 14.4 },
          { x: 31.8, w: 14.4 },
          { x: 49.8, w: 14.4 },
          { x: 67.8, w: 14.4 }
        ],
        rows: 4, options: ["T", "F"]
      },
      part3: {
        y: 72.8, h: 19.0,
        cols: [
          { x: 13.5, w: 10.5 },
          { x: 26.0, w: 10.5 },
          { x: 38.5, w: 10.5 },
          { x: 51.0, w: 10.5 },
          { x: 63.5, w: 10.5 },
          { x: 76.0, w: 10.5 }
        ],
        rows: 10
      }
    }
  },
  "2026_GRADE10": {
    id: "2026_GRADE10",
    name: "Phiếu Tuyển Sinh 10 (40-8-6)",
    part1Count: 40,
    part2Count: 8,
    part3Count: 6,
    subjectBounded: true,
    layout: {
      sbd: { x: 65.5, y: 9.8, w: 13.5, h: 18.0, cols: 6, rows: 10 },
      code: { x: 82.5, y: 9.8, w: 9.0, h: 18.0, cols: 4, rows: 10 },
      part1: {
        y: 35.8, h: 17.5,
        cols: [
          { x: 14.8, w: 12.0 },
          { x: 32.8, w: 12.0 },
          { x: 50.8, w: 12.0 },
          { x: 68.8, w: 12.0 }
        ],
        rows: 10, options: ["A", "B", "C", "D"]
      },
      part2: {
        y: 56.5, h: 10.0,
        cols: [
          { x: 13.6, w: 14.4 },
          { x: 31.8, w: 14.4 },
          { x: 49.8, w: 14.4 },
          { x: 67.8, w: 14.4 }
        ],
        rows: 4, options: ["T", "F"]
      },
      part3: {
        y: 72.8, h: 19.0,
        cols: [
          { x: 13.5, w: 10.5 },
          { x: 26.0, w: 10.5 },
          { x: 38.5, w: 10.5 },
          { x: 51.0, w: 10.5 },
          { x: 63.5, w: 10.5 },
          { x: 76.0, w: 10.5 }
        ],
        rows: 10
      }
    }
  },
  "80_QUESTIONS": {
    id: "80_QUESTIONS",
    name: "Mẫu 80 Câu (80-0-0)",
    part1Count: 80,
    part2Count: 0,
    part3Count: 0,
    layout: {
      sbd: { x: 70.0, y: 9.0, w: 12.0, h: 18.0, cols: 6, rows: 10 }, 
      code: { x: 85.0, y: 9.0, w: 6.0, h: 18.0, cols: 3, rows: 10 }, 
      part1: {
        y: 32.0, h: 50.0,
        cols: [
          { x: 12.0, w: 15.0 }, // Q1-20
          { x: 32.0, w: 15.0 }, // Q21-40
          { x: 52.0, w: 15.0 }, // Q41-60
          { x: 72.0, w: 15.0 }  // Q61-80
        ],
        rows: 20, options: ["A", "B", "C", "D"]
      }
    }
  },
  "2025_EXTENDED": {
    id: "2025_EXTENDED",
    name: "Mẫu Mở rộng (24-6-16)",
    part1Count: 24,
    part2Count: 6,
    part3Count: 16,
    layout: {
      sbd: { x: 73.0, y: 5.0, w: 10.0, h: 12.0, cols: 6, rows: 10 }, 
      code: { x: 86.0, y: 5.0, w: 5.0, h: 12.0, cols: 3, rows: 10 }, 
      part1: {
        y: 28.0, h: 12.0,
        cols: [
          { x: 10.0, w: 14.0 }, // 1-5
          { x: 26.0, w: 14.0 }, // 6-10
          { x: 42.0, w: 14.0 }, // 11-15
          { x: 58.0, w: 14.0 }, // 16-20
          { x: 74.0, w: 14.0 }  // 21-24 
        ],
        rows: 5, options: ["A", "B", "C", "D"]
      },
      part2: {
        y: 43.0, h: 12.0,
        cols: [
          { x: 10.0, w: 10.0 },
          { x: 24.0, w: 10.0 },
          { x: 38.0, w: 10.0 },
          { x: 52.0, w: 10.0 },
          { x: 66.0, w: 10.0 },
          { x: 80.0, w: 10.0 }
        ],
        rows: 4, options: ["T", "F"]
      },
      part3: {
        y: 60.0, h: 32.0,
        cols: [
          // Row 1
          { x: 10.0, w: 9.0 },
          { x: 20.0, w: 9.0 },
          { x: 30.0, w: 9.0 },
          { x: 40.0, w: 9.0 },
          { x: 50.0, w: 9.0 },
          { x: 60.0, w: 9.0 },
          { x: 70.0, w: 9.0 },
          { x: 80.0, w: 9.0 },
          // Row 2
          { x: 10.0, w: 9.0, dy: 18.0 },
          { x: 20.0, w: 9.0, dy: 18.0 },
          { x: 30.0, w: 9.0, dy: 18.0 },
          { x: 40.0, w: 9.0, dy: 18.0 },
          { x: 50.0, w: 9.0, dy: 18.0 },
          { x: 60.0, w: 9.0, dy: 18.0 },
          { x: 70.0, w: 9.0, dy: 18.0 },
          { x: 80.0, w: 9.0, dy: 18.0 }
        ],
        rows: 10
      }
    }
  }
};

// Compute standard grading logic for Part II
// Returns the score for a single Part II question based on how many sub-questions are correct.
export function calculatePart2Score(correctCount) {
  if (correctCount === 1) return 0.1;
  if (correctCount === 2) return 0.25;
  if (correctCount === 3) return 0.5;
  if (correctCount === 4) return 1.0;
  return 0.0;
}

// Danh sách file PDF mẫu phiếu để người dùng tải về in
// File phải nằm trong thư mục public/sheets/
export const SHEET_DOWNLOADS = [
  {
    id: "bgd-2025",
    name: "Phiếu TLTN BGD 2025",
    description: "Mẫu phiếu chuẩn Bộ GD&ĐT (40 TN đơn + 8 Đúng/Sai + 6 TLN)",
    filename: "Phieu-TLTN-BGD.pdf",
    templateId: "2025_STANDARD",
  },
  {
    id: "haiphong-toan",
    name: "Phiếu TLTN Hải Phòng – Toán",
    description: "Phiếu vào lớp 10 TP. Hải Phòng môn Toán",
    filename: "Phieu-TLTN-HaiPhong-Toan.pdf",
    templateId: "80_QUESTIONS",
  },
  {
    id: "haiphong-cacmon",
    name: "Phiếu TLTN Hải Phòng – Các môn khác",
    description: "Phiếu vào lớp 10 TP. Hải Phòng các môn còn lại",
    filename: "Phieu-TLTN-HaiPhong-CacMon.pdf",
    templateId: "80_QUESTIONS",
  },
  {
    id: "ts10-2026",
    name: "Phiếu Tuyển Sinh Lớp 10 (40-8-6)",
    description: "Phiếu tuyển sinh lớp 10 THPT năm học 2026 - 2027",
    filename: "Phieu-TLTN-BGD.pdf",
    templateId: "2026_GRADE10",
  },
];
