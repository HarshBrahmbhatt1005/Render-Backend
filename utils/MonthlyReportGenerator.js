import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

/**
 * Generate month-wise excel FROM master excel
 * @param {string} month YYYY-MM
 * @param {string} masterFilePath
 */
export async function generateMonthWiseExcel(month, masterFilePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(masterFilePath);

  const masterSheet = workbook.worksheets[0];
  if (!masterSheet) {
    throw new Error("Master sheet not found");
  }

  // ✅ create new workbook for monthly file
  const monthlyWorkbook = new ExcelJS.Workbook();
  const monthlySheet = monthlyWorkbook.addWorksheet("Monthly Report");

  // ✅ copy headers EXACTLY
  const headerRow = masterSheet.getRow(1);
  monthlySheet.addRow(headerRow.values);

  // 🔍 find date column index
  let dateColIndex = -1;

  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value).toLowerCase();
    if (header.includes("date")) {
      dateColIndex = colNumber;
    }
  });

  if (dateColIndex === -1) {
    throw new Error("No date column found in master excel");
  }

  // ✅ filter rows month-wise
  masterSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const cellValue = row.getCell(dateColIndex).value;
    if (!cellValue) return;

    const rowDate = new Date(cellValue);
    const rowMonth = `${rowDate.getFullYear()}-${String(
      rowDate.getMonth() + 1
    ).padStart(2, "0")}`;

    if (rowMonth === month) {
      monthlySheet.addRow(row.values);
    }
  });

  // ✅ save file
  const monthlyDir = path.join(process.cwd(), "exports", "monthly");
  if (!fs.existsSync(monthlyDir)) {
    fs.mkdirSync(monthlyDir, { recursive: true });
  }

  const monthlyFilePath = path.join(
    monthlyDir,
    `monthly_${month}.xlsx`
  );

  await monthlyWorkbook.xlsx.writeFile(monthlyFilePath);

  return monthlyFilePath;
}
