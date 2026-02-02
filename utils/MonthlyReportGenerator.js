import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

/**
 * Generate month-wise excel FROM master excel
 * @param {string} month - YYYY-MM (e.g. 2026-01)
 * @param {string} masterFilePath - path to master excel
 * @returns {string} generated monthly excel file path
 */
export async function generateMonthWiseExcel(month, masterFilePath) {
  const [year, monthNum] = month.split("-").map(Number);

  if (!year || !monthNum) {
    throw new Error("Invalid month format");
  }

  // ===============================
  // LOAD MASTER EXCEL
  // ===============================
  const masterWorkbook = new ExcelJS.Workbook();
  await masterWorkbook.xlsx.readFile(masterFilePath);

  const masterSheet = masterWorkbook.worksheets[0];
  if (!masterSheet) {
    throw new Error("Master sheet not found");
  }

  // ===============================
  // CREATE MONTHLY EXCEL
  // ===============================
  const monthlyWorkbook = new ExcelJS.Workbook();
  const monthlySheet = monthlyWorkbook.addWorksheet("Monthly Data");

  // ===============================
  // COPY HEADER (FULL)
  // ===============================
  const headerRow = [];
  masterSheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
    headerRow.push(cell.value);
  });
  monthlySheet.addRow(headerRow);

  // ===============================
  // ⚠️ DATE COLUMN INDEX
  // CHANGE THIS IF NEEDED
  // ===============================
  const DATE_COLUMN_INDEX = 5; // <-- loginDate column number

  // ===============================
  // FILTER DATA MONTH-WISE
  // ===============================
  masterSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const cellValue = row.getCell(DATE_COLUMN_INDEX).value;
    let rowDate = null;

    // 🧠 HANDLE ALL EXCEL DATE TYPES
    if (cellValue instanceof Date) {
      rowDate = cellValue;
    } else if (cellValue?.text) {
      rowDate = new Date(cellValue.text);
    } else if (typeof cellValue === "number") {
      rowDate = new Date(Math.round((cellValue - 25569) * 86400 * 1000));
    } else if (typeof cellValue === "string") {
      rowDate = new Date(cellValue);
    }

    if (!rowDate || isNaN(rowDate)) return;

    if (
      rowDate.getFullYear() === year &&
      rowDate.getMonth() + 1 === monthNum
    ) {
      const fullRow = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        fullRow.push(cell.value);
      });
      monthlySheet.addRow(fullRow);
    }
  });

  // ===============================
  // SAVE FILE
  // ===============================
  const exportDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const outputPath = path.join(
    exportDir,
    `monthly_${month}.xlsx`
  );

  await monthlyWorkbook.xlsx.writeFile(outputPath);

  return outputPath;
}
