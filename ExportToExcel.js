import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

// ===== Helper Functions =====
function formatDateToIndian(date) {
  if (!date) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(date)) return date;

  const d = new Date(date);
  if (isNaN(d)) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}

function toNumber(val) {
  if (!val) return 0;
  return Number(val.toString().replace(/,/g, "")) || 0;
}

function autoFitColumns(sheet) {
  sheet.columns.forEach((column) => {
    let max = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > max) max = len;
    });
    column.width = max + 2;
  });
}

// ===== Main Export Function =====
export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    // ========================= MASTER EXCEL =========================
    const masterWorkbook = new ExcelJS.Workbook();
    const masterSheet = masterWorkbook.addWorksheet("Master");

    // ========================= HEADER COLUMNS =========================
    const loginColumns = [
      "S.No",
      "Code",
      "Name",
      "Mobile",
      "Product",
      "Req Loan Amount",
      "Bank",
      "Banker Name",
      "Status",
      "Login Date",
      "Sales",
      "Ref",
      "Source Channel",
      "Email",
      "Property Type",
      "Property Details",
      "Remarks (Team + Consulting + Payout + Refund)",
      "Category",
    ];

    const disbursedColumns = [
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
      "Loan Number",
      "Insurance Option",
      "Insurance Amount",
      "Subvention Option",
      "Subvention Amount",
      "Part Disbursed Details",
      "Total Part Disbursed Amount",
      "Re-login Reason",
    ];

    const masterHeaders = [...loginColumns, "", "", ...disbursedColumns];

    // ========================= 🟦 PART DISBURSED CASES =========================
    const partData = apps.filter(
      (a) => (a.status || "").toLowerCase() === "part disbursed"
    );

    if (partData.length > 0) {
      const titleRow = masterSheet.addRow(["PART DISBURSED CASES"]);
      titleRow.font = { bold: true, size: 16 };
      masterSheet.mergeCells(`A${titleRow.number}:Z${titleRow.number}`);
      masterSheet.addRow([]);

      const hdr = masterSheet.addRow(masterHeaders);
      hdr.eachCell((cell) => {
        if (!cell.value) return;
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9E1F2" } };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      partData.forEach((app, i) => {
        const obj = app.toObject ? app.toObject() : app;

        const loginData = [
          i + 1,
          obj.code === "Other" ? obj.otherCode : obj.code,
          obj.name,
          obj.mobile,
          obj.product === "Other" ? obj.otherProduct : obj.product,
          obj.amount,
          obj.bank === "Other" ? obj.otherBank : obj.bank,
          obj.bankerName,
          obj.status,
          formatDateToIndian(obj.loginDate),
          obj.sales,
          obj.ref,
          obj.sourceChannel === "Other" ? obj.otherSourceChannel : obj.sourceChannel,
          obj.email,
          obj.propertyType,
          obj.propertyDetails,
          [
            obj.consulting && `Consulting: ${obj.consulting}`,
            obj.payout && `Payout: ${obj.payout}`,
            obj.expenceAmount && `Expense: ${obj.expenceAmount}`,
            obj.feesRefundAmount && `Refund: ${obj.feesRefundAmount}`,
            obj.remark && `Remark: ${obj.remark}`,
          ].filter(Boolean).join(" | "),
          obj.category === "Other" ? obj.otherCategory : obj.category,
        ];

        const partDetails = (obj.partDisbursed || [])
          .map(
            (p, idx) =>
              `Part-${idx + 1}: {Date: ${formatDateToIndian(
                p.date
              )}, Amount: ${p.amount}}`
          )
          .join(" | ");

        const totalPartAmount = (obj.partDisbursed || []).reduce(
          (sum, p) => sum + toNumber(p.amount),
          0
        );

        const disbursedData = [
          formatDateToIndian(obj.sanctionDate),
          obj.sanctionAmount,
          formatDateToIndian(obj.disbursedDate),
          obj.disbursedAmount,
          obj.loanNumber,
          obj.insuranceOption,
          obj.insuranceAmount,
          obj.subventionOption,
          obj.subventionAmount,
          partDetails,
          totalPartAmount,
          obj.reloginReason,
        ];

        const row = masterSheet.addRow([
          ...loginData,
          "",
          "",
          ...disbursedData,
        ]);

        row.getCell(masterHeaders.indexOf("Total Part Disbursed Amount") + 1).numFmt =
          "₹#,##0.00";
      });

      masterSheet.addRow([]);
      masterSheet.addRow([]);
    }

    // ========================= 🟨 MASTER DATA =========================
    const mainTitle = masterSheet.addRow(["MASTER DATA"]);
    mainTitle.font = { bold: true, size: 16 };
    masterSheet.mergeCells(`A${mainTitle.number}:Z${mainTitle.number}`);
    masterSheet.addRow([]);

    const mainHdr = masterSheet.addRow(masterHeaders);
    mainHdr.eachCell((cell) => {
      if (!cell.value) return;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9C4" } };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    apps.forEach((app, index) => {
      const obj = app.toObject ? app.toObject() : app;

      const loginData = [
        index + 1,
        obj.code === "Other" ? obj.otherCode : obj.code,
        obj.name,
        obj.mobile,
        obj.product === "Other" ? obj.otherProduct : obj.product,
        obj.amount,
        obj.bank === "Other" ? obj.otherBank : obj.bank,
        obj.bankerName,
        obj.status,
        formatDateToIndian(obj.loginDate),
        obj.sales,
        obj.ref,
        obj.sourceChannel === "Other" ? obj.otherSourceChannel : obj.sourceChannel,
        obj.email,
        obj.propertyType,
        obj.propertyDetails,
        [
          obj.consulting && `Consulting: ${obj.consulting}`,
          obj.payout && `Payout: ${obj.payout}`,
          obj.expenceAmount && `Expense: ${obj.expenceAmount}`,
          obj.feesRefundAmount && `Refund: ${obj.feesRefundAmount}`,
          obj.remark && `Remark: ${obj.remark}`,
        ].filter(Boolean).join(" | "),
        obj.category === "Other" ? obj.otherCategory : obj.category,
      ];

      const partDetails = (obj.partDisbursed || [])
        .map(
          (p, i) =>
            `Part-${i + 1}: {Date: ${formatDateToIndian(
              p.date
            )}, Amount: ${p.amount}}`
        )
        .join(" | ");

      const totalPartAmount =
        obj.status === "Part Disbursed"
          ? (obj.partDisbursed || []).reduce(
              (sum, p) => sum + toNumber(p.amount),
              0
            )
          : "";

      const disbursedData = [
        formatDateToIndian(obj.sanctionDate),
        obj.sanctionAmount,
        formatDateToIndian(obj.disbursedDate),
        obj.disbursedAmount,
        obj.loanNumber,
        obj.insuranceOption,
        obj.insuranceAmount,
        obj.subventionOption,
        obj.subventionAmount,
        partDetails,
        totalPartAmount,
        obj.reloginReason,
      ];

      const row = masterSheet.addRow([
        ...loginData,
        "",
        "",
        ...disbursedData,
      ]);

      if (totalPartAmount) {
        row.getCell(
          masterHeaders.indexOf("Total Part Disbursed Amount") + 1
        ).numFmt = "₹#,##0.00";
      }
    });

    autoFitColumns(masterSheet);

    const masterFile = path.join(
      exportDir,
      `Master_${refName || "All"}_${timestamp}.xlsx`
    );

    await masterWorkbook.xlsx.writeFile(masterFile);

    return { masterFilePath: masterFile };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}
