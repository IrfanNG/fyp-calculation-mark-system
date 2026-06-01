import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

export interface GradeRow {
  studentName: string;
  studentId: string | null;
  marks: Record<string, number>;
  totalWeighted: number;
  grade: string;
  gpa: number;
}

export interface AssessmentInfo {
  id: string;
  name: string;
  weightage: number;
  fullMark: number | null;
}

export function generateTranscriptPDF(data: {
  courseName: string;
  courseCode: string;
  className?: string;
  assessments: AssessmentInfo[];
  grades: GradeRow[];
}) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text("UniKL - Course Transcript", 14, 20);
  
  doc.setFontSize(12);
  doc.text(`${data.courseCode} - ${data.courseName}`, 14, 30);
  if (data.className) {
    doc.text(`Class: ${data.className}`, 14, 37);
  }

  // Table
  const headers = [
    "Student ID",
    "Student Name",
    ...data.assessments.map((a) => `${a.name}\n(${a.weightage}%)`),
    "Total",
    "Grade",
    "GPA",
  ];

  const rows = data.grades.map((g) => [
    g.studentId || "-",
    g.studentName,
    ...data.assessments.map((a) => {
      const mark = g.marks[a.id];
      return mark != null ? mark.toFixed(2) : "-";
    }),
    g.totalWeighted.toFixed(2),
    g.grade,
    g.gpa.toFixed(2),
  ]);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: data.className ? 45 : 38,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 51, 102] },
  });

  return doc;
}

export async function generateTranscriptExcel(data: {
  courseName: string;
  courseCode: string;
  className?: string;
  assessments: AssessmentInfo[];
  grades: GradeRow[];
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Transcript");

  // Title
  worksheet.mergeCells("A1:E1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `UniKL - ${data.courseCode} - ${data.courseName}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center" };

  if (data.className) {
    worksheet.mergeCells("A2:E2");
    const classCell = worksheet.getCell("A2");
    classCell.value = `Class: ${data.className}`;
    classCell.font = { size: 12 };
    classCell.alignment = { horizontal: "center" };
  }

  const startRow = data.className ? 4 : 3;

  // Headers
  const headers = [
    "Student ID",
    "Student Name",
    ...data.assessments.map((a) => `${a.name} (${a.weightage}%)`),
    "Total",
    "Grade",
    "GPA",
  ];

  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(startRow);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF003366" },
  };
  headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };

  // Data
  data.grades.forEach((g) => {
    worksheet.addRow([
      g.studentId || "-",
      g.studentName,
      ...data.assessments.map((a) => g.marks[a.id] ?? "-"),
      g.totalWeighted.toFixed(2),
      g.grade,
      g.gpa.toFixed(2),
    ]);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 15;
  });

  return workbook;
}

export async function exportToExcelBuffer(workbook: ExcelJS.Workbook): Promise<ArrayBuffer> {
  return workbook.xlsx.writeBuffer();
}
