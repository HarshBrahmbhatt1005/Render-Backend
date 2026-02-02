import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

/**
 * month format: YYYY-MM
 * masterFilePath: path of master excel
 */
export const generateMonthWiseExcel = async (month, masterFilePath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(masterFilePath);

    const masterSheet = workbook.worksheets[0]; // first sheet
    if (!masterSheet) {
      throw new Error("Master sheet not found");
    }

    // ============================
    // Create new workbook
    // ============================
    const monthlyWorkbook = new ExcelJS.Workbook();
    const monthlySheet = monthlyWorkbook.addWorksheet("Monthly Report");

    // ============================
    // Copy Header Row
    // ============================
    const headerRow = masterSheet.getRow(1);
    monthlySheet.addRow(headerRow.values);

    // ============================
    // Find Date Column Index
    // ============================
    let dateColIndex = null;

    headerRow.eachCell((cell, colNumber) => {
      const header = cell.value?.toString().toLowerCase();
      if (header && header.includes("date")) {
        dateColIndex = colNumber;
      }
    });

    if (!dateColIndex) {
      throw new Error("Date column not found in master excel");
    }

    // ============================
    // Filter Month-wise Data
    // ============================
    masterSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const cellValue = row.getCell(dateColIndex).value;
      if (!cellValue) return;

      let rowDate;

      if (cellValue instanceof Date) {
        rowDate = cellValue;
      } else if (typeof cellValue === "string") {
        rowDate = new Date(cellValue);
      } else if (cellValue.text) {
        rowDate = new Date(cellValue.text);
      }

      if (!rowDate || isNaN(rowDate)) return;

      const rowMonth = `${rowDate.getFullYear()}-${String(
        rowDate.getMonth() + 1
      ).padStart(2, "0")}`;

      if (rowMonth === month) {
        monthlySheet.addRow(row.values);
      }
    });

    // ============================
    // Auto Column Width
    // ============================
    monthlySheet.columns.forEach((col) => {
      let maxLength = 10;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        maxLength = Math.max(maxLength, len);
      });
      col.width = maxLength + 2;
    });

    // ============================
    // Save File
    // ============================
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    const filePath = path.join(
      reportsDir,
      `monthly_report_${month}.xlsx`
    );

    await monthlyWorkbook.xlsx.writeFile(filePath);

    return filePath;
  } catch (error) {
    console.error("❌ MonthlyReportGenerator Error:", error);
    throw error;
  }
};
