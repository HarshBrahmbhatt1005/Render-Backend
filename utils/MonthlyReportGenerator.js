import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

/**
 * Generate month-wise excel FROM master excel
 * @param {string} month - YYYY-MM (e.g. 2026-01)
 * @param {string} masterFilePath - path of master excel
 * @returns {string} month-wise excel file path
 */
export async function generateMonthWiseExcel(month, masterFilePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(masterFilePath);

  const masterSheet = workbook.worksheets[0];
  if (!masterSheet) {
    throw new Error("Master sheet not found");
  }

  // 👉 output workbook
  const monthlyWorkbook = new ExcelJS.Workbook();
  const monthlySheet = monthlyWorkbook.addWorksheet("Monthly Data");

  // ===============================
  // COPY HEADER
  // ===============================
  const headerRow = masterSheet.getRow(1);
  monthlySheet.addRow(headerRow.values);

  // ===============================
  // FILTER BY MONTH
  // ===============================
  const [year, monthNum] = month.split("-").map(Number);

  masterSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    // 🔴 IMPORTANT:
    // yaha date column index set karo
    // agar loginDate column 5th me hai → 5
    const dateCell = row.getCell(5).value;

    if (!dateCell) return;

    const date = new Date(dateCell);
    if (
      date.getFullYear() === year &&
      date.getMonth() + 1 === monthNum
    ) {
      monthlySheet.addRow(row.values);
    }
  });

  // ===============================
  // SAVE FILE
  // ===============================
  const outputDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const filePath = path.join(
    outputDir,
    `monthly_${month}.xlsx`
  );

  await monthlyWorkbook.xlsx.writeFile(filePath);

  return filePath;
}
