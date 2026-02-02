import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

export const generateMonthWiseExcel = async (month) => {
  // month format: "2025-01"

  const masterFilePath = path.join(
    process.cwd(),
    "exports",
    "MasterExcel.xlsx"
  );

  const outputDir = path.join(process.cwd(), "exports", "monthly");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFilePath = path.join(
    outputDir,
    `Monthly_Report_${month}.xlsx`
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(masterFilePath);

  const masterSheet = workbook.worksheets[0];

  const newWorkbook = new ExcelJS.Workbook();
  const newSheet = newWorkbook.addWorksheet("Monthly Data");

  // 🔹 Copy header
  newSheet.addRow(masterSheet.getRow(1).values);

  // 🔹 Date column index (CHANGE if needed)
  const DATE_COLUMN_INDEX = 2; // eg: column B

  masterSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const cellValue = row.getCell(DATE_COLUMN_INDEX).value;
    if (!cellValue) return;

    const date = new Date(cellValue);
    const rowMonth = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    if (rowMonth === month) {
      newSheet.addRow(row.values);
    }
  });

  await newWorkbook.xlsx.writeFile(outputFilePath);

  return outputFilePath;
};
