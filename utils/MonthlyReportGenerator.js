import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

// ===== Path to Master Excel =====
const MASTER_FILE = path.join(__dirname, "../Master.xlsx"); // Adjust path if needed
const OUTPUT_DIR = path.join(__dirname, "../MonthlyExcels");

// Ensure output folder exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate Monthly Excel
 * @param {string} month - Format YYYY-MM (e.g., 2026-01)
 * @returns {Promise<string>} - Path to generated file
 */
export async function  generateMonthWiseExcel(month) {
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new Error("Month must be in YYYY-MM format (e.g., 2026-01)");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(MASTER_FILE);

    const masterSheet = workbook.worksheets[0]; // First sheet
    const newWorkbook = new ExcelJS.Workbook();
    const newSheet = newWorkbook.addWorksheet(masterSheet.name);

    // Copy header row
    const headerRow = masterSheet.getRow(1);
    newSheet.addRow(headerRow.values);

    // Filter rows month-wise (assuming Date is in Column A)
    masterSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const dateCell = row.getCell(1).value; // Column A
        if (!dateCell) return;

        let rowDate;
        if (dateCell instanceof Date) {
            rowDate = dateCell;
        } else if (typeof dateCell === "object" && dateCell.result) {
            rowDate = new Date(dateCell.result);
        } else {
            rowDate = new Date(dateCell);
        }

        const rowMonth = rowDate.toISOString().slice(0, 7); // YYYY-MM
        if (rowMonth === month) {
            newSheet.addRow(row.values);
        }
    });

    // Save file
    const outputFile = path.join(OUTPUT_DIR, `Monthly_${month}.xlsx`);
    await newWorkbook.xlsx.writeFile(outputFile);

    return outputFile;
}

// ===== Example Usage =====
if (require.main === module) {
    const month = "2026-01"; // Change dynamically as needed
    generateMonthlyReport(month)
        .then((file) => console.log("Monthly Excel created:", file))
        .catch((err) => console.error("Error:", err.message));
}
