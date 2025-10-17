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

    const excludeMasterFields = [
      "_id", "__v", "roi", "mktValue", "processingFees", "auditData",
      "consulting", "payout", "expenceAmount", "feesRefundAmount",
      "remark", "otherBank", "otherProduct", "otherCode",
      "createdAt", "updatedAt"
    ];

    const masterColumns = Object.keys(Application.schema.paths)
      .filter(key => !excludeMasterFields.includes(key))
      .map(key => ({
        header: key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
        key,
        width: 25
      }));

    masterColumns.push({
      header: "Remarks (Team + Consulting + Payout + Refund)",
      key: "remarkSummary",
      width: 60
    });

    masterSheet.columns = masterColumns;

    apps.forEach(app => {
      const row = {};
      const obj = app.toObject();

      Object.keys(obj).forEach(key => {
        if (!excludeMasterFields.includes(key)) {
          if (key === "bank" && obj.bank === "Other") row.bank = obj.otherBank || "";
          else if (key === "product" && obj.product === "Other") row.product = obj.otherProduct || "";
          else if (key === "code" && obj.code === "Other") row.code = obj.otherCode || "";
          else if (obj[key] instanceof Date || key.toLowerCase().includes("date")) row[key] = formatDate(obj[key]);
          else row[key] = obj[key] ?? "";
        }
      });

      // merge remarks
      const consulting = obj.consulting ? `Consulting: ${obj.consulting}` : "";
      const payout = obj.payout ? `Payout: ${obj.payout}` : "";
      const exp = obj.expenceAmount ? `Expense: ${obj.expenceAmount}` : "";
      const refund = obj.feesRefundAmount ? `Refund: ${obj.feesRefundAmount}` : "";
      const remark = obj.remark ? `Remark: ${obj.remark}` : "";

      row.remarkSummary = [consulting, payout, exp, refund, remark].filter(Boolean).join(" | ");

      masterSheet.addRow(row);
    });

    styleWorksheet(masterSheet);

    const masterFilePath = path.join(exportDir, `Master_${refName || "All"}_${timestamp}.xlsx`);
    await masterWorkbook.xlsx.writeFile(masterFilePath);

    // ===================== SALES =====================
    const salesWorkbook = new ExcelJS.Workbook();
    const salesSheet = salesWorkbook.addWorksheet("Sales");

    const excludeSalesFields = ["_id", "__v", "createdAt", "updatedAt"];
    const salesColumns = Object.keys(Application.schema.paths)
      .filter(key => !excludeSalesFields.includes(key))
      .map(key => ({
        header: key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
        key,
        width: 25
      }));

    ["consulting","payout","expenceAmount","feesRefundAmount","remark"].forEach(field => {
      salesColumns.push({ header: field.replace(/([A-Z])/g," $1"), key: field, width: 25 });
    });

    salesSheet.columns = salesColumns;

    apps.forEach(app => {
      const row = {};
      const obj = app.toObject();

      Object.keys(obj).forEach(key => {
        if (!excludeSalesFields.includes(key)) {
          if (key === "bank" && obj.bank === "Other") row.bank = obj.otherBank || "";
          else if (key === "product" && obj.product === "Other") row.product = obj.otherProduct || "";
          else if (key === "code" && obj.code === "Other") row.code = obj.otherCode || "";
          else row[key] = obj[key] ?? "";
        }
      });

      row.consulting = obj.consulting || "";
      row.payout = obj.payout || "";
      row.expenceAmount = obj.expenceAmount || "";
      row.feesRefundAmount = obj.feesRefundAmount || "";
      row.remark = obj.remark || "";

      salesSheet.addRow(row);
    });

    styleWorksheet(salesSheet);

    const salesFilePath = path.join(exportDir, `Sales_${refName || "All"}_${timestamp}.xlsx`);
    await salesWorkbook.xlsx.writeFile(salesFilePath);

    return { masterFilePath, salesFilePath };

  } catch (err) {
    console.error("❌ Excel export failed:", err);
    throw err;
  }
}

// ===================== Helper Functions =====================
function styleWorksheet(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { top:{style:"thin"}, left:{style:"thin"}, bottom:{style:"thin"}, right:{style:"thin"} };
  });

  sheet.eachRow((row,rowNumber) => {
    if(rowNumber===1) return;
    row.eachCell(cell => {
      cell.alignment = { wrapText:true, vertical:"middle", horizontal:"left" };
      cell.border = { top:{style:"thin"}, left:{style:"thin"}, bottom:{style:"thin"}, right:{style:"thin"} };
    });
  });
}

// Format date without time
function formatDate(date){
  if(!date) return "";
  const d = new Date(date);
  const yyyy = d.getFullYear();
  let mm = d.getMonth()+1;
  let dd = d.getDate();
  if(dd<10) dd="0"+dd;
  if(mm<10) mm="0"+mm;
  return `${yyyy}-${mm}-${dd}`;
}
