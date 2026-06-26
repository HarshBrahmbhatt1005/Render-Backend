import fs from "fs";
import ExcelJS from "exceljs";

const FILE_PATH = process.argv[2] || "Bulk Upload.xlsx";
const FRONTEND_ENV_PATH = "MIS-Intigration2-main/.env";
const DEFAULT_STATUS = "New Lead";

const normalize = (value) => String(value ?? "").trim();

const normalizeLeadType = (value) => {
  const normalized = normalize(value).toLowerCase().replace(/[\s_-]+/g, "");
  if (["realestate", "realestatelead", "re"].includes(normalized)) return "realestate";
  if (["finance", "financelead", "fin"].includes(normalized)) return "finance";
  return "";
};

const getApiUrl = () => {
  const env = fs.readFileSync(FRONTEND_ENV_PATH, "utf8");
  const line = env.split(/\r?\n/).find((item) => item.startsWith("VITE_API_URL="));
  return line?.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");
};

const getCellText = (row, col) => normalize(row.getCell(col).text || row.getCell(col).value);

const getDateValue = (cell) => {
  if (cell.value instanceof Date) return cell.value;
  if (!cell.value) return null;
  const date = new Date(cell.value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const readRows = async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE_PATH);
  const worksheet = workbook.worksheets[0];

  const headerMap = {};
  worksheet.getRow(1).eachCell((cell, col) => {
    headerMap[normalize(cell.value).toLowerCase()] = col;
  });

  const requiredHeaders = [
    "lead type",
    "lead date",
    "customer name",
    "customer number",
    "source",
    "submitted by name",
  ];
  const missingHeaders = requiredHeaders.filter((header) => !headerMap[header]);
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  const validRows = [];
  const skippedInvalid = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const leadType = normalizeLeadType(getCellText(row, headerMap["lead type"]));
    const leadDate = getDateValue(row.getCell(headerMap["lead date"]));
    const customerName = getCellText(row, headerMap["customer name"]);
    const customerNumber = getCellText(row, headerMap["customer number"]).replace(/\D/g, "");
    const source = getCellText(row, headerMap.source);
    const referenceOf = headerMap["reference of"] ? getCellText(row, headerMap["reference of"]) : "";
    const submittedByName = getCellText(row, headerMap["submitted by name"]);

    const reasons = [];
    if (!leadType) reasons.push("missing/invalid Lead Type");
    if (!leadDate) reasons.push("missing/invalid Lead Date");
    if (!customerName) reasons.push("missing Customer Name");
    if (!/^\d{10}$/.test(customerNumber)) reasons.push("missing/invalid Customer Number");
    if (!source) reasons.push("missing Source");
    if (!submittedByName) reasons.push("missing Submitted By Name");

    if (reasons.length > 0) {
      skippedInvalid.push({ row: rowNumber, reasons });
      continue;
    }

    validRows.push({
      row: rowNumber,
      leadDate,
      customerName,
      customerNumber,
      source,
      referenceOf,
      leadType,
      submittedByName,
    });
  }

  return { worksheet, validRows, skippedInvalid };
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
};

const main = async () => {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new Error("VITE_API_URL not found in frontend .env.");

  const { worksheet, validRows, skippedInvalid } = await readRows();
  const existingLeads = await fetchJson(`${apiUrl}/api/realestate-leads`);
  const existingKeys = new Set(
    existingLeads.map((lead) => `${lead.customerNumber}|${lead.leadType || "realestate"}`)
  );

  const inserted = [];
  const skippedDuplicates = [];
  const failed = [];

  for (const row of validRows) {
    const duplicateKey = `${row.customerNumber}|${row.leadType}`;
    if (existingKeys.has(duplicateKey)) {
      skippedDuplicates.push({
        row: row.row,
        customerNumber: row.customerNumber,
        leadType: row.leadType,
      });
      continue;
    }

    const payload = {
      leadDate: row.leadDate.toISOString().slice(0, 10),
      customerName: row.customerName,
      customerNumber: row.customerNumber,
      source: row.source,
      referenceOf: row.referenceOf,
      leadType: row.leadType,
      calls: [
        {
          callingDate: row.leadDate.toISOString().slice(0, 10),
          callerName: row.submittedByName,
          status: DEFAULT_STATUS,
          remarks: "",
          followUpDate: "",
          visitDate: "",
          visitRemark: "",
        },
      ],
    };

    try {
      const result = await fetchJson(`${apiUrl}/api/realestate-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      existingKeys.add(duplicateKey);
      inserted.push({
        row: row.row,
        id: result?.data?._id,
        customerNumber: row.customerNumber,
        leadType: row.leadType,
      });
    } catch (error) {
      failed.push({ row: row.row, customerNumber: row.customerNumber, message: error.message });
    }
  }

  console.log(JSON.stringify({
    apiUrl,
    file: FILE_PATH,
    sheet: worksheet.name,
    totalRows: Math.max(worksheet.rowCount - 1, 0),
    validRows: validRows.length,
    insertedCount: inserted.length,
    skippedInvalid,
    skippedDuplicates,
    failed,
  }, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
