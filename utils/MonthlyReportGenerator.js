import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

export async function generateMonthWiseExcel(month, masterFilePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(masterFilePath);

  const masterSheet = workbook.worksheets[0];
  if (!masterSheet) {
    throw new Error("Master sheet not found");
  }

  const monthlyWorkbook = new ExcelJS.Workbook();
  const monthlySheet = monthlyWorkbook.addWorksheet("Monthly Data");

  // copy header
  const header = masterSheet.getRow(1);
  monthlySheet.addRow(header.values);

  const [year, monthNum] = month.split("-").map(Number);

  masterSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    // ⚠️ CHANGE COLUMN INDEX IF NEEDED
    const dateValue = row.getCell(5).value;
    if (!dateValue) return;

    const d = new Date(dateValue);
    if (
      d.getFullYear() === year &&
      d.getMonth() + 1 === monthNum
    ) {
      monthlySheet.addRow(row.values);
    }
  });

  const outputDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const filePath = path.join(outputDir, `monthly_${month}.xlsx`);
  await monthlyWorkbook.xlsx.writeFile(filePath);

  return filePath;
}
