import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

/**
 * Convert excel date safely
 */
function parseExcelDate(value) {
  if (!value) return null;

  // JS Date
  if (value instanceof Date) return value;

  // Excel serial number
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }

  // String
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d)) return d;
  }

  // Excel object { text, result }
  if (typeof value === "object" && value.text) {
    const d = new Date(value.text);
    if (!isNaN(d)) return d;
  }

  return null;
}

export async function generateMonthWiseExcel(month, masterFilePath) {
  try {
    if (!fs.existsSync(masterFilePath)) {
      throw new Error("Master excel file not found");
    }

    const masterWB = new ExcelJS.Workbook();
    await masterWB.xlsx.readFile(masterFilePath);

    const masterSheet = masterWB.worksheets[0];
    if (!masterSheet) {
      throw new Error("No sheet found in master excel");
    }

    const monthlyWB = new ExcelJS.Workbook();
    const monthlySheet = monthlyWB.addWorksheet("Monthly Report");

    // ✅ copy headers
    const headerRow = masterSheet.getRow(1);
    monthlySheet.addRow([...headerRow.values]);

    // 🔍 detect date column
    let dateCol = -1;
    headerRow.eachCell((cell, col) => {
      const h = String(cell.value || "").toLowerCase();
      if (h.includes("date")) dateCol = col;
    });

    if (dateCol === -1) {
      throw new Error("Date column not found in master excel");
    }

    let matchCount = 0;

    masterSheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;

      const rawDate = row.getCell(dateCol).value;
      const dateObj = parseExcelDate(rawDate);
      if (!dateObj) return;

      const rowMonth = `${dateObj.getFullYear()}-${String(
        dateObj.getMonth() + 1
      ).padStart(2, "0")}`;

      if (rowMonth === month) {
        monthlySheet.addRow([...row.values]);
        matchCount++;
      }
    });

    if (matchCount === 0) {
      console.warn("⚠️ No records found for month:", month);
    }

    const outDir = path.join(process.cwd(), "exports", "monthly");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outPath = path.join(outDir, `monthly_${month}.xlsx`);
    await monthlyWB.xlsx.writeFile(outPath);

    return outPath;
  } catch (err) {
    console.error("❌ Monthly Excel Error:", err);
    throw err;
  }
}
