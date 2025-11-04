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

    // ======== LOGIN HEADING =========
    masterSheet.mergeCells("A1:Q1");
    masterSheet.getCell("A1").value = "Login";
    masterSheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    masterSheet.getCell("A1").font = { bold: true, size: 14 };

    // ======== Static Column Order =========
    const masterColumns = [
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
      { header: "Ref", key: "refName" },
      { header: "Source Channel", key: "sourceChannel" },
      { header: "Property Type", key: "propertyType" },
      { header: "Property Details", key: "propertyDetails" },
      { header: "Category", key: "category" },
      {
        header: "Remarks (Team + Consulting + Payout + Refund)",
        key: "remarkSummary",
        width: 60,
      },
    ];

    masterSheet.columns = masterColumns.map((col) => ({
      ...col,
      width: col.width || 25,
    }));

    // ======== Fill Data =========
    apps.forEach((app) => {
      const obj = app.toObject();

      const row = {
        code: obj.code === "Other" ? obj.otherCode || "" : obj.code || "",
        name: obj.name || "",
        mobile: obj.mobile || "",
        email: obj.email || "",
        product: obj.product === "Other" ? obj.otherProduct || "" : obj.product || "",
        amount: obj.amount || "",
        bank: obj.bank === "Other" ? obj.otherBank || "" : obj.bank || "",
        bankerName: obj.bankerName || "",
        status: obj.status || "",
        loginDate: formatDate(obj.loginDate),
        sales: obj.sales || "",
        refName: obj.refName || "",
        sourceChannel:
          obj.sourceChannel === "Other" ? obj.otherSourceChannel || "" : obj.sourceChannel || "",
        propertyType: obj.propertyType || "",
        propertyDetails: obj.propertyDetails || "",
        category: obj.category === "Other" ? obj.otherCategory || "" : obj.category || "",
        remarkSummary: [
          obj.consulting ? `Consulting: ${obj.consulting}` : "",
          obj.payout ? `Payout: ${obj.payout}` : "",
          obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "",
          obj.feesRefundAmount ? `Refund: ${obj.feesRefundAmount}` : "",
          obj.remark ? `Remark: ${obj.remark}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      };

      masterSheet.addRow(row);
    });

    // ======== Style Login Table =========
    styleWorksheet(masterSheet);

    // ======== Add Gap and Disbursed Heading =========
    const disbursedStart = masterSheet.lastRow.number + 3;
    masterSheet.mergeCells(`A${disbursedStart}:F${disbursedStart}`);
    masterSheet.getCell(`A${disbursedStart}`).value = "Disbursed";
    masterSheet.getCell(`A${disbursedStart}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    masterSheet.getCell(`A${disbursedStart}`).font = { bold: true, size: 14 };

    // ======== Disbursed Columns =========
    const disbursedHeaders = [
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
      "Insurance Option",
      "Insurance Amount",
    ];
    masterSheet.addRow(disbursedHeaders);
    styleWorksheet(masterSheet);

    const masterFilePath = path.join(
      exportDir,
      `Master_${refName || "All"}_${timestamp}.xlsx`
    );
    await masterWorkbook.xlsx.writeFile(masterFilePath);

    return { masterFilePath };
  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}

function styleWorksheet(sheet) {
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
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
