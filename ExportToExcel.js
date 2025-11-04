import ExcelJS from "exceljs";
import Application from "./models/Application.js";
import fs from "fs";
import path from "path";

export default async function exportToExcel(apps, refName) {
  try {
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const timestamp = Date.now();

    // ===================== MASTER =====================
    const masterWorkbook = new ExcelJS.Workbook();
    const masterSheet = masterWorkbook.addWorksheet("Master");

    // Add big heading
    masterSheet.mergeCells("A1:N1");
    masterSheet.getCell("A1").value = "LOGIN DETAILS";
    masterSheet.getCell("A1").font = { bold: true, size: 14 };
    masterSheet.getCell("A1").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Define fixed columns
    const masterColumns = [
      { header: "Serial No", key: "serialNo" },
      { header: "Code", key: "code" },
      { header: "Name", key: "name" },
      { header: "Mobile", key: "mobile" },
      { header: "Email", key: "email" },
      { header: "Product", key: "product" },
      { header: "Amount", key: "amount" },
      { header: "Bank", key: "bank" },
      { header: "Banker Name", key: "bankerName" },
      { header: "Status", key: "status" },
      { header: "Login Date", key: "loginDate" },
      { header: "Sales", key: "sales" },
      { header: "Ref", key: "ref" },
      { header: "Source Channel", key: "sourceChannel" },
      { header: "Property Type", key: "propertyType" },
      { header: "Property Details", key: "propertyDetails" },
      { header: "Category", key: "category" },
      {
        header: "Remarks (Team + Consulting + Payout + Refund)",
        key: "remarkSummary",
      },
    ];

    masterSheet.columns = masterColumns;

    // Add blank rows before Disbursed section
    const disbursedStartRow = apps.length + 5;

    // Add Disbursed section heading
    masterSheet.mergeCells(`A${disbursedStartRow}:F${disbursedStartRow}`);
    masterSheet.getCell(`A${disbursedStartRow}`).value = "DISBURSED DETAILS";
    masterSheet.getCell(`A${disbursedStartRow}`).font = {
      bold: true,
      size: 14,
    };
    masterSheet.getCell(`A${disbursedStartRow}`).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Add disbursed columns below
    const disbursedColumns = [
      { header: "Sanction Date", key: "sanctionDate" },
      { header: "Sanction Amount", key: "sanctionAmount" },
      { header: "Disbursed Date", key: "disbursedDate" },
      { header: "Disbursed Amount", key: "disbursedAmount" },
      { header: "Insurance Option", key: "insuranceOption" },
      { header: "Insurance Amount", key: "insuranceAmount" },
    ];

    // Fill Master Data
    apps.forEach((app, i) => {
      const obj = app.toObject();
      const row = {
        serialNo: i + 1,
        code: obj.code || "",
        name: obj.name || "",
        mobile: obj.mobile || "",
        email: obj.email || "",
        product: obj.product || "",
        amount: obj.amount || "",
        bank: obj.bank || "",
        bankerName: obj.bankerName || "",
        status: obj.status || "",
        loginDate: formatDate(obj.loginDate),
        sales: obj.sales || "",
        ref: obj.ref || "",
        sourceChannel: obj.sourceChannel || "",
        propertyType: obj.propertyType || "",
        propertyDetails: obj.propertyDetails || "",
        category: obj.category || "",
      };

      const consulting = obj.consulting ? `Consulting: ${obj.consulting}` : "";
      const payout = obj.payout ? `Payout: ${obj.payout}` : "";
      const exp = obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "";
      const refund = obj.feesRefundAmount
        ? `Refund: ${obj.feesRefundAmount}`
        : "";
      const remark = obj.remark ? `Remark: ${obj.remark}` : "";

      row.remarkSummary = [consulting, payout, exp, refund, remark]
        .filter(Boolean)
        .join(" | ");

      masterSheet.addRow(row);
    });

    // Add Disbursed Section rows
    const disbursedStart = disbursedStartRow + 2;
    const disbursedHeaderRow = masterSheet.getRow(disbursedStart);
    disbursedColumns.forEach((col, idx) => {
      const cell = disbursedHeaderRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    apps.forEach((app) => {
      const obj = app.toObject();
      masterSheet.addRow({
        sanctionDate: formatDate(obj.sanctionDate),
        sanctionAmount: obj.sanctionAmount || "",
        disbursedDate: formatDate(obj.disbursedDate),
        disbursedAmount: obj.disbursedAmount || "",
        insuranceOption: obj.insuranceOption || "",
        insuranceAmount: obj.insuranceAmount || "",
      });
    });

    autoFitColumns(masterSheet);
    styleWorksheet(masterSheet);

    const masterFilePath = path.join(
      exportDir,
      `Master_${refName || "All"}_${timestamp}.xlsx`
    );
    await masterWorkbook.xlsx.writeFile(masterFilePath);

    // ===================== SALES =====================
    const salesWorkbook = new ExcelJS.Workbook();
    const salesSheet = salesWorkbook.addWorksheet("Sales");

    const salesColumns = Object.keys(Application.schema.paths).map((key) => ({
      header: key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase()),
      key,
    }));

    salesColumns.push({
      header: "Remarks (Team + Consulting + Payout + Refund)",
      key: "remarkSummary",
    });

    salesSheet.columns = salesColumns;

    apps.forEach((app, i) => {
      const obj = app.toObject();
      const row = {};

      Object.keys(obj).forEach((key) => {
        if (obj[key] instanceof Date || key.toLowerCase().includes("date"))
          row[key] = formatDate(obj[key]);
        else row[key] = obj[key] ?? "";
      });

      const consulting = obj.consulting ? `Consulting: ${obj.consulting}` : "";
      const payout = obj.payout ? `Payout: ${obj.payout}` : "";
      const exp = obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "";
      const refund = obj.feesRefundAmount
        ? `Refund: ${obj.feesRefundAmount}`
        : "";
      const remark = obj.remark ? `Remark: ${obj.remark}` : "";

      row.remarkSummary = [consulting, payout, exp, refund, remark]
        .filter(Boolean)
        .join(" | ");

      salesSheet.addRow(row);
    });

    autoFitColumns(salesSheet);
    styleWorksheet(salesSheet);

    const salesFilePath = path.join(
      exportDir,
      `Sales_${refName || "All"}_${timestamp}.xlsx`
    );
    await salesWorkbook.xlsx.writeFile(salesFilePath);

    return { masterFilePath, salesFilePath };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}

// ===================== Helper Functions =====================
function autoFitColumns(sheet) {
  sheet.columns.forEach((col) => {
    let maxLength = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 0;
      if (len > maxLength) maxLength = len;
    });
    col.width = maxLength + 2;
  });
}

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
