import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Applications");

    // ================== HEADINGS ==================
    sheet.mergeCells("A1:P1");
    sheet.getCell("A1").value = "Login";
    sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell("A1").font = { size: 14, bold: true };
    sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "90EE90" } };

    // Leave 3 blank rows for spacing
    sheet.addRow([]);
    sheet.addRow([]);
    sheet.addRow([]);

    const loginHeaders = [
      "Code",
      "Name",
      "Mobile",
      "Email",
      "Product",
      "Amount",
      "Bank",
      "Banker Name",
      "Status",
      "Login Date",
      "Sales",
      "Ref",
      "Source Channel",
      "Property Type",
      "Property Details",
      "Category",
      "Remarks (Team + Consulting + Payout + Refund)",
    ];

    sheet.addRow(loginHeaders);

    // Style header
    const loginHeaderRow = sheet.getRow(sheet.lastRow.number);
    loginHeaderRow.font = { bold: true };
    loginHeaderRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ================== DATA ROWS ==================
    apps.forEach((app) => {
      const obj = app.toObject();
      const row = [
        obj.code === "Other" ? obj.otherCode || "" : obj.code || "",
        obj.name || "",
        obj.mobile || "",
        obj.email || "",
        obj.product === "Other" ? obj.otherProduct || "" : obj.product || "",
        obj.amount || "",
        obj.bank === "Other" ? obj.otherBank || "" : obj.bank || "",
        obj.bankerName || "",
        obj.status || "",
        formatDate(obj.loginDate),
        obj.sales || "",
        obj.refName || "",
        obj.sourceChannel === "Other" ? obj.otherSourceChannel || "" : obj.sourceChannel || "",
        obj.propertyType || "",
        obj.propertyDetails || "",
        obj.category === "Other" ? obj.otherCategory || "" : obj.category || "",
        [
          obj.consulting ? `Consulting: ${obj.consulting}` : "",
          obj.payout ? `Payout: ${obj.payout}` : "",
          obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "",
          obj.feesRefundAmount ? `Refund: ${obj.feesRefundAmount}` : "",
          obj.remark ? `Remark: ${obj.remark}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      ];
      sheet.addRow(row);
    });

    // Style data rows
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 4) return; // skip headers
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

    // ================ Add DISBURSED SECTION ==================
    const disbursedStartRow = sheet.lastRow.number + 3;

    sheet.mergeCells(`A${disbursedStartRow}:F${disbursedStartRow}`);
    sheet.getCell(`A${disbursedStartRow}`).value = "Disbursed";
    sheet.getCell(`A${disbursedStartRow}`).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell(`A${disbursedStartRow}`).font = { size: 14, bold: true };
    sheet.getCell(`A${disbursedStartRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "90EE90" },
    };

    sheet.addRow([]);
    const disbursedHeaders = [
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
      "Insurance Option",
      "Insurance Amount",
    ];
    sheet.addRow(disbursedHeaders);

    const disbHeaderRow = sheet.getRow(sheet.lastRow.number);
    disbHeaderRow.font = { bold: true };
    disbHeaderRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ================== SAVE FILE ==================
    const filePath = path.join(exportDir, `Applications_${refName || "All"}_${timestamp}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    return { filePath };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const yyyy = d.getFullYear();
  let mm = d.getMonth() + 1;
  let dd = d.getDate();
  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;
  return `${yyyy}-${mm}-${dd}`;
}
