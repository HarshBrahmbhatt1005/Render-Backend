import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    // ===================== MASTER EXCEL =====================
    const masterWorkbook = new ExcelJS.Workbook();
    const masterSheet = masterWorkbook.addWorksheet("Master");

    // Fields to exclude from Master
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
      "otherCode",
      "otherProduct",
    ];

    // Columns for Master
    const masterColumns = Object.keys(Application.schema.paths)
      .filter((key) => !excludeMasterFields.includes(key))
      .map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        width: 25,
      }));

    // Add merged Remarks column at end
    masterColumns.push({
      header: "Remarks (Team + Consulting + Payout + Refund)",
      key: "remarksSummary",
      width: 50,
    });

    masterSheet.columns = masterColumns;

    apps.forEach((app) => {
      const row = {};

      // Normal fields (replace 'Other' values)
      Object.keys(app).forEach((key) => {
        if (!excludeMasterFields.includes(key)) {
          if (key === "bank" && app.bank === "Other") {
            row.bank = app.otherBank || "";
          } else if (key === "product" && app.product === "Other") {
            row.product = app.otherProduct || "";
          } else if (key === "code" && app.code === "Other") {
            row.code = app.otherCode || "";
          } else {
            row[key] = app[key] ?? "";
          }
        }
      });

      // Merge remarks fields into one
      const consulting = app.consulting ? `Consulting: ${app.consulting}` : "";
      const payout = app.payout ? `Payout: ${app.payout}` : "";
      const exp = app.expenceAmount ? `Expense: ${app.expenceAmount}` : "";
      const refund = app.feesRefundAmount ? `Refund: ${app.feesRefundAmount}` : "";
      const remark = app.remark ? `Remark: ${app.remark}` : "";

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

    // Columns for Sales (all schema fields)
    const salesColumns = Object.keys(Application.schema.paths)
      .filter((key) => key !== "__v")
      .map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
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
        row[key] = app[key] ?? "";
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
      fgColor: { argb: "FFFF00" }, // Yellow highlight
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
