import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

/**
 * Export applications to Master + Sales Excel safely
 * @param {Array} apps - List of application objects from DB
 * @param {String} refName - Optional reference name
 * @returns {Object} - { masterFilePath, salesFilePath }
 */
export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports"); // absolute path
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    // ===================== MASTER EXCEL =====================
    const masterWorkbook = new ExcelJS.Workbook();
    const masterSheet = masterWorkbook.addWorksheet("Master");

    // Fields to exclude from Master
    const excludeMasterFields = [
      "_id",
      "__v",
      "otherBank",
      "otherCode",
      "otherProduct",
      "consulting",
      "payout",
      "expenceAmount",
      "feesRefundAmount",
      "remark",
    ];

    // Master columns
    const masterColumns = Object.keys(Application.schema.paths)
      .filter((key) => !excludeMasterFields.includes(key))
      .map((key) => ({
        header: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase()),
        key,
        width: 25,
      }));

    // Add merged remarks column
    masterColumns.push({
      header: "Remarks (Team + Consulting + Payout + Refund)",
      key: "remarksSummary",
      width: 50,
    });

    masterSheet.columns = masterColumns;

    apps.forEach((app) => {
      const appObj = app.toObject(); // Convert to plain object
      const row = {};

      // Replace Other values
      row.bank = appObj.bank === "Other" ? appObj.otherBank : appObj.bank;
      row.product = appObj.product === "Other" ? appObj.otherProduct : appObj.product;
      row.code = appObj.code === "Other" ? appObj.otherCode : appObj.code;

      // Copy remaining fields
      Object.keys(appObj).forEach((key) => {
        if (!excludeMasterFields.includes(key) && !["bank", "product", "code"].includes(key)) {
          row[key] = appObj[key];
        }
      });

      // Merge remarks
      const consulting = appObj.consulting ? `Consulting: ${appObj.consulting}` : "";
      const payout = appObj.payout ? `Payout: ${appObj.payout}` : "";
      const exp = appObj.expenceAmount ? `Expense: ${appObj.expenceAmount}` : "";
      const refund = appObj.feesRefundAmount ? `Refund: ${appObj.feesRefundAmount}` : "";
      const remark = appObj.remark ? `Remark: ${appObj.remark}` : "";

      row.remarksSummary = [consulting, payout, exp, refund, remark].filter(Boolean).join(" | ");

      masterSheet.addRow(row);
    });

    styleWorksheet(masterSheet);

    const masterFileName = `Master_${refName || "All"}_${timestamp}.xlsx`;
    const masterFilePath = path.join(exportDir, masterFileName);
    await masterWorkbook.xlsx.writeFile(masterFilePath);
    console.log(`✅ Master Excel exported: ${masterFilePath}`);

    // ===================== SALES EXCEL =====================
    const salesWorkbook = new ExcelJS.Workbook();
    const salesSheet = salesWorkbook.addWorksheet("Sales");

    const salesColumns = Object.keys(Application.schema.paths)
      .filter((key) => key !== "__v")
      .map((key) => ({
        header: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase()),
        key,
        width: 25,
      }));

    // Ensure separate remarks columns
    ["consulting", "payout", "expenceAmount", "feesRefundAmount", "remark"].forEach((f) => {
      if (!salesColumns.find((c) => c.key === f)) {
        salesColumns.push({ header: f.charAt(0).toUpperCase() + f.slice(1), key: f, width: 25 });
      }
    });

    salesSheet.columns = salesColumns;

    apps.forEach((app) => {
      const appObj = app.toObject();
      const row = {};

      // Replace Other values
      row.bank = appObj.bank === "Other" ? appObj.otherBank : appObj.bank;
      row.product = appObj.product === "Other" ? appObj.otherProduct : appObj.product;
      row.code = appObj.code === "Other" ? appObj.otherCode : appObj.code;

      // Copy remaining fields
      Object.keys(appObj).forEach((key) => {
        if (!["bank", "product", "code"].includes(key)) {
          row[key] = appObj[key];
        }
      });

      // Separate remarks columns
      row.consulting = appObj.consulting || "";
      row.payout = appObj.payout || "";
      row.expenceAmount = appObj.expenceAmount || "";
      row.feesRefundAmount = appObj.feesRefundAmount || "";
      row.remark = appObj.remark || "";

      salesSheet.addRow(row);
    });

    styleWorksheet(salesSheet);

    const salesFileName = `Sales_${refName || "All"}_${timestamp}.xlsx`;
    const salesFilePath = path.join(exportDir, salesFileName);
    await salesWorkbook.xlsx.writeFile(salesFilePath);
    console.log(`✅ Sales Excel exported: ${salesFilePath}`);

    return { masterFilePath, salesFilePath };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}

/**
 * Style Excel Worksheet: Bold + Yellow headers + borders
 */
function styleWorksheet(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFF00" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });
}
