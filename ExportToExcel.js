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

    const excludeMasterFields = [
      "_id",
      "__v",
      "marketValue",
      "roi",
      "processingFees",
      "auditData",
      "consulting",
      "payout",
      "expenceAmount",
      "feesRefundAmount",
      "remark",
    ];

    // Columns for Master
    const masterColumns = Object.keys(Application.schema.paths)
      .filter((key) => !excludeMasterFields.includes(key) && !key.startsWith("other"))
      .map((key) => ({
        header: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase()),
        key,
        width: 25,
      }));

    // Add Full Name + Location + merged remarks
    masterColumns.unshift({ header: "Full Name", key: "fullName", width: 25 });
    masterColumns.push({ header: "Location", key: "location", width: 25 });
    masterColumns.push({
      header: "Remarks (Team + Consulting + Payout + Refund)",
      key: "remarksSummary",
      width: 50,
    });

    masterSheet.columns = masterColumns;

    apps.forEach((app) => {
      const row = {};

      // Full Name
      row.fullName = `${app.firstName || ""} ${app.lastName || ""}`.trim();

      // Location
      row.location = `${app.city || ""}${app.state ? ", " + app.state : ""}`;

      // Normal fields (safe conversion)
      Object.keys(app).forEach((key) => {
        if (!excludeMasterFields.includes(key) && !key.startsWith("other")) {
          row[key] =
            typeof app[key] === "object" && app[key] !== null
              ? JSON.stringify(app[key])
              : app[key];
        }
      });

      // Merged remarks
      const consulting = app.consulting ? `Consulting: ${app.consulting}` : "";
      const payout = app.payout ? `Payout: ${app.payout}` : "";
      const exp = app.expenceAmount ? `Expense: ${app.expenceAmount}` : "";
      const refund = app.feesRefundAmount ? `Refund: ${app.feesRefundAmount}` : "";
      const remark = app.remark ? `Remark: ${app.remark}` : "";

      row.remarksSummary = [consulting, payout, exp, refund, remark]
        .filter(Boolean)
        .join(" | ");

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

    // Columns for Sales (all schema fields)
    const salesColumns = Object.keys(Application.schema.paths)
      .filter((key) => key !== "__v")
      .map((key) => ({
        header: key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase()),
        key,
        width: 25,
      }));

    // Add separate remarks columns
    salesColumns.push({ header: "Consulting", key: "consulting", width: 25 });
    salesColumns.push({ header: "Payout", key: "payout", width: 25 });
    salesColumns.push({ header: "Expense Amount", key: "expenceAmount", width: 25 });
    salesColumns.push({ header: "Fees Refund Amount", key: "feesRefundAmount", width: 25 });
    salesColumns.push({ header: "Remark", key: "remark", width: 50 });

    salesSheet.columns = salesColumns;

    apps.forEach((app) => {
      const row = {};
      Object.keys(app).forEach((key) => {
        row[key] =
          typeof app[key] === "object" && app[key] !== null
            ? JSON.stringify(app[key])
            : app[key];
      });

      // Separate remarks
      row.consulting = app.consulting || "";
      row.payout = app.payout || "";
      row.expenceAmount = app.expenceAmount || "";
      row.feesRefundAmount = app.feesRefundAmount || "";
      row.remark = app.remark || "";

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
    throw err; // Let backend route handle 500 response
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
