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
    const exportDir = path.join(process.cwd(), "exports"); 
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    // ===================== MASTER EXCEL =====================
    const masterWorkbook = new ExcelJS.Workbook();
    const masterSheet = masterWorkbook.addWorksheet("Master");

    const excludeMasterFields = [
      "_id",
      "__v",
      "roi",
      "mktValue",
      "processingFees",
      "auditData",
      "consulting",
      "payout",
      "expenceAmount",
      "feesRefundAmount",
      "remark",
      "otherBank",
      "otherProduct",
      "otherCode",
    ];

    // Columns for Master
    const masterColumns = Object.keys(Application.schema.paths)
      .filter((key) => !excludeMasterFields.includes(key))
      .map((key) => ({
        header: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase()),
        key,
        width: 25,
      }));

    // Add merged remarks column at end
    masterColumns.push({
      header: "Remarks (Team + Consulting + Payout + Refund)",
      key: "remarksSummary",
      width: 60,
    });

    masterSheet.columns = masterColumns;

    // Add rows
    apps.forEach((app) => {
      const row = {};
      const obj = app.toObject(); // convert mongoose doc to plain object

      Object.keys(obj).forEach((key) => {
        if (!excludeMasterFields.includes(key)) {
          if (key === "bank" && obj.bank === "Other") {
            row.bank = obj.otherBank || "";
          } else if (key === "product" && obj.product === "Other") {
            row.product = obj.otherProduct || "";
          } else if (key === "code" && obj.code === "Other") {
            row.code = obj.otherCode || "";
          } else {
            row[key] = obj[key] ?? "";
          }
        }
      });

      // Merge remarks fields into one
      const consulting = obj.consulting ? `Consulting: ${obj.consulting}` : "";
      const payout = obj.payout ? `Payout: ${obj.payout}` : "";
      const exp = obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "";
      const refund = obj.feesRefundAmount ? `Refund: ${obj.feesRefundAmount}` : "";
      const remark = obj.remark ? `Remark: ${obj.remark}` : "";

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

    const excludeSalesFields = ["__v", "_id"];

    const salesColumns = Object.keys(Application.schema.paths)
      .filter((key) => !excludeSalesFields.includes(key))
      .map((key) => ({
        header: key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        key,
        width: 25,
      }));

    // Separate remarks columns
    ["consulting", "payout", "expenceAmount", "feesRefundAmount", "remark"].forEach((field) => {
      salesColumns.push({ header: field.replace(/([A-Z])/g, " $1"), key: field, width: 25 });
    });

    salesSheet.columns = salesColumns;

    apps.forEach((app) => {
      const row = {};
      const obj = app.toObject();

      Object.keys(obj).forEach((key) => {
        if (!excludeSalesFields.includes(key)) {
          if (key === "bank" && obj.bank === "Other") {
            row.bank = obj.otherBank || "";
          } else if (key === "product" && obj.product === "Other") {
            row.product = obj.otherProduct || "";
          } else if (key === "code" && obj.code === "Other") {
            row.code = obj.otherCode || "";
          } else {
            row[key] = obj[key] ?? "";
          }
        }
      });

      // Separate remarks
      row.consulting = obj.consulting || "";
      row.payout = obj.payout || "";
      row.expenceAmount = obj.expenceAmount || "";
      row.feesRefundAmount = obj.feesRefundAmount || "";
      row.remark = obj.remark || "";

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

// ===================== Helper: Style Worksheet =====================
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
