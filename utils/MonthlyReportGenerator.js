import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

/**
 * Generate month-wise excel FROM MASTER EXCEL
 * @param {string} month - YYYY-MM (e.g. 2026-01)
 * @param {string} masterFilePath - path of master excel
 */
export async function generateMonthWiseExcel(month, masterFilePath) {
  const masterWorkbook = new ExcelJS.Workbook();
  await masterWorkbook.xlsx.readFile(masterFilePath);

  const masterSheet = masterWorkbook.worksheets[0];
  if (!masterSheet) {
    throw new Error("Master sheet not found");
  }

  const monthlyWorkbook = new ExcelJS.Workbook();
  const monthlySheet = monthlyWorkbook.addWorksheet("Month Wise Data");

  // ==============================
  // ✅ COPY HEADER (PROPER WAY)
  // ==============================
  const headerRow = masterSheet.getRow(1);
  const headers = [];

  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    headers.push(cell.value);
  });

  monthlySheet.addRow(headers);

  const [year, monthNum] = month.split("-").map(Number);

  // ==============================
  // ✅ FIND DATE COLUMN INDEX
  // (change keyword if needed)
  // ==============================
  let dateColumnIndex = null;

  headers.forEach((h, i) => {
    if (
      typeof h === "string" &&
      h.toLowerCase().includes("date")
    ) {
      dateColumnIndex = i + 1; // excel index
    }
  });

  if (!dateColumnIndex) {
    throw new Error("No date column found in master excel");
  }

  // ==============================
  // ✅ COPY FULL ROW DATA MONTH WISE
  // ==============================
  masterSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const dateCell = row.getCell(dateColumnIndex).value;
    if (!dateCell) return;

    const rowDate = new Date(dateCell);
    if (isNaN(rowDate)) return;

    if (
      rowDate.getFullYear() === year &&
      rowDate.getMonth() + 1 === monthNum
    ) {
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        rowData.push(cell.value);
      });

      monthlySheet.addRow(rowData);
    }
  });

  // ==============================
  // ✅ SAVE FILE
  // ==============================
  const outputDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const outputPath = path.join(
    outputDir,
    `monthly_${month}.xlsx`
  );

  await monthlyWorkbook.xlsx.writeFile(outputPath);

  return outputPath;
}
