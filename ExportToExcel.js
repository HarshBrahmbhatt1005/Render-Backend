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
    const sheet = workbook.addWorksheet("Master");

    // ======= LOGIN HEADING =======
    sheet.mergeCells("A1:Q1");
    sheet.getCell("A1").value = "Login Details";
    sheet.getCell("A1").font = { bold: true, size: 16 };
    sheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // ======= DISBURSED HEADING =======
    sheet.mergeCells("T1:Y1"); // shifted horizontally (gap of 2 columns R & S)
    sheet.getCell("T1").value = "Disbursed Details";
    sheet.getCell("T1").font = { bold: true, size: 16 };
    sheet.getCell("T1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // ======= LOGIN COLUMNS =======
    const loginColumns = [
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

    // ======= DISBURSED COLUMNS =======
    const disbursedColumns = [
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
      "Insurance Option",
      "Insurance Amount",
    ];

    // combine columns with horizontal gap (2 blank columns)
    const allHeaders = [...loginColumns, "", "", ...disbursedColumns];

    const headerRow = sheet.addRow(allHeaders);

    // Style headers
    headerRow.eachCell((cell, colNumber) => {
      if (cell.value === "") return; // skip blanks
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF99" },
      };
      sheet.getColumn(colNumber).width = 22;
    });

    // ======= DATA ROWS =======
    apps.forEach((app) => {
      const obj = app.toObject();

      const loginPart = [
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
        obj.sourceChannel === "Other"
          ? obj.otherSourceChannel || ""
          : obj.sourceChannel || "",
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

      const disbursedPart = [
        formatDate(obj.sanctionDate),
        obj.sanctionAmount || "",
        formatDate(obj.disbursedDate),
        obj.disbursedAmount || "",
        obj.insuranceOption || "",
        obj.insuranceAmount || "",
      ];

      // Add row with 2-column gap
      const rowData = [...loginPart, "", "", ...disbursedPart];
      sheet.addRow(rowData);
    });

    // ======= FILE SAVE =======
    const filePath = path.join(
      exportDir,
      `Master_${refName || "All"}_${timestamp}.xlsx`
    );
    await workbook.xlsx.writeFile(filePath);

    return { masterFilePath: filePath };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}

// ======= Date Formatter =======
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
