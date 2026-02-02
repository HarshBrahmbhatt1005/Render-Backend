import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import Application from "../models/Application.js";

// ===== Date range helpers =====
export class DateRange {
  static getMonthRange(monthNum, year) {
    const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  static getQuarterRange(quarterNum, year) {
    const startMonth = (quarterNum - 1) * 3 + 1;
    return this.getMonthRange(startMonth, year).startDate && { ...this.getMonthRange(startMonth, year), ...{ endDate: new Date(year, startMonth + 2, 0, 23, 59, 59, 999) } };
  }

  static getCustomRange(startDateStr, endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    // Normalize times
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
}

// ===== Data filtering helpers =====
export class DataFilter {
  static parseDate(value) {
    if (!value && value !== 0) return null;
    if (value instanceof Date) return isNaN(value) ? null : value;
    if (typeof value === "number") return new Date(value);
    if (typeof value === "string") {
      const s = value.trim();
      if (!s) return null;
      // timestamp
      if (/^\d+$/.test(s)) {
        const asNum = parseInt(s, 10);
        const d = new Date(asNum);
        if (!isNaN(d)) return d;
      }
      // Attempt Date parse (ISO, YYYY-MM-DD, with time etc.)
      const d = new Date(s);
      if (!isNaN(d)) return d;

      // Try DD-MM-YYYY or DD/MM/YYYY
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const dd = m[1].padStart(2, "0");
        const mm = m[2].padStart(2, "0");
        const yyyy = m[3];
        const d2 = new Date(`${yyyy}-${mm}-${dd}`);
        if (!isNaN(d2)) return d2;
      }
    }
    return null;
  }

  static filterByDateRange(records, dateColumn, startDate, endDate) {
    if (!Array.isArray(records)) return [];
    const res = [];
    for (const r of records) {
      const obj = typeof r.toObject === "function" ? r.toObject() : r;
      const raw = obj ? obj[dateColumn] : null;
      const d = this.parseDate(raw);
      if (!d) continue;
      if (d >= startDate && d <= endDate) res.push(obj);
    }
    return res;
  }

  static groupByField(records, field) {
    return records.reduce((acc, r) => {
      const val = (r && r[field]) || "";
      acc[val] = acc[val] || [];
      acc[val].push(r);
      return acc;
    }, {});
  }
}

// ===== MonthlyReportGenerator =====
export class MonthlyReportGenerator {
  async generateMonthlyReport(allRecords, monthNum, year, options = {}) {
    const { dateColumn = "loginDate" } = options;
    const { startDate, endDate } = DateRange.getMonthRange(monthNum, year);
    const filtered = DataFilter.filterByDateRange(allRecords, dateColumn, startDate, endDate);
    return this._createWorkbook(filtered, { ...options, startDate, endDate });
  }

  async generateQuarterlyReport(allRecords, quarterNum, year, options = {}) {
    const { dateColumn = "loginDate" } = options;
    const { startDate, endDate } = DateRange.getQuarterRange(quarterNum, year);
    const filtered = DataFilter.filterByDateRange(allRecords, dateColumn, startDate, endDate);
    return this._createWorkbook(filtered, { ...options, startDate, endDate });
  }

  async generateCustomDateReport(allRecords, startDateStr, endDateStr, options = {}) {
    const { dateColumn = "loginDate" } = options;
    const { startDate, endDate } = DateRange.getCustomRange(startDateStr, endDateStr);
    const filtered = DataFilter.filterByDateRange(allRecords, dateColumn, startDate, endDate);
    return this._createWorkbook(filtered, { ...options, startDate, endDate });
  }

  async _createWorkbook(records, options = {}) {
    const { sheetName = "Report", fileName } = options;
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName || "Report");

    // Build columns based on Application schema to match master structure
    const excludeFields = ["_id", "__v", "createdAt", "updatedAt"];
    const schemaPaths = Application.schema.paths;
    const columns = Object.keys(schemaPaths)
      .filter(k => !excludeFields.includes(k))
      .map(k => ({
        header: k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()),
        key: k,
        width: 25,
      }));

    sheet.columns = columns;

    // Add rows (if any) - otherwise headers remain
    for (const r of records) {
      const obj = typeof r.toObject === "function" ? r.toObject() : r;
      const row = {};
      for (const col of columns) {
        const k = col.key;
        const val = obj ? obj[k] : undefined;
        if (k.toLowerCase().includes("date")) {
          const d = DataFilter.parseDate(val);
          row[k] = formatDate(d);
        } else {
          row[k] = val ?? "";
        }
      }
      sheet.addRow(row);
    }

    styleSheet(sheet);

    const timestamp = Date.now();
    const outName = fileName || `monthly_report_${timestamp}.xlsx`;
    const filePath = path.join(exportDir, outName);
    await workbook.xlsx.writeFile(filePath);

    return { filePath, filename: path.basename(filePath) };
  }
}

// ===== Helpers =====
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function styleSheet(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF00" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" }
    };
  });

  sheet.eachRow((row, i) => {
    if (i === 1) return;
    row.eachCell(cell => {
      cell.alignment = { wrapText: true, vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });
  });
}

export default MonthlyReportGenerator;
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

// ===== DATE UTILITIES =====
class DateRange {
  /**
   * Get start and end of month for a given month/year
   * @param {number} month - Month (1-12)
   * @param {number} year - Year (e.g., 2026)
   * @returns {Object} { startDate, endDate }
   */
  static getMonthRange(month, year) {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Get start and end of quarter
   * @param {number} quarter - Quarter (1-4)
   * @param {number} year - Year
   * @returns {Object} { startDate, endDate }
   */
  static getQuarterRange(quarter, year) {
    const month = (quarter - 1) * 3 + 1;
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 2, 0, 23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Get start and end of year
   * @param {number} year - Year
   * @returns {Object} { startDate, endDate }
   */
  static getYearRange(year) {
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Get custom date range
   * @param {string} startDateStr - YYYY-MM-DD
   * @param {string} endDateStr - YYYY-MM-DD
   * @returns {Object} { startDate, endDate }
   */
  static getCustomRange(startDateStr, endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }
}

// ===== DATA FILTER =====
class DataFilter {
  /**
   * Filter records by date range
   * @param {Array} records - Array of records to filter
   * @param {string} dateColumn - Name of date column (e.g., 'loginDate', 'disbursedDate')
   * @param {Date} startDate - Filter start date
   * @param {Date} endDate - Filter end date
   * @returns {Array} Filtered records
   */
  static filterByDateRange(records, dateColumn, startDate, endDate) {
    if (!Array.isArray(records)) return [];

    return records.filter((record) => {
      const dateValue = record[dateColumn] || record.get?.(dateColumn);
      if (!dateValue) return false;

      const recordDate = new Date(dateValue);
      if (isNaN(recordDate)) return false;

      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  /**
   * Filter by status
   * @param {Array} records - Array of records
   * @param {Array} statusArray - Status values to include
   * @returns {Array} Filtered records
   */
  static filterByStatus(records, statusArray) {
    if (!Array.isArray(statusArray) || statusArray.length === 0) {
      return records;
    }

    return records.filter((record) => {
      const status = record.status || "";
      return statusArray.some((s) =>
        status.toLowerCase().includes(s.toLowerCase())
      );
    });
  }

  /**
   * Group records by a specific field
   * @param {Array} records - Array of records
   * @param {string} groupBy - Field to group by
   * @returns {Object} Grouped records
   */
  static groupByField(records, groupBy) {
    return records.reduce((acc, record) => {
      const key = record[groupBy] || "N/A";
      if (!acc[key]) acc[key] = [];
      acc[key].push(record);
      return acc;
    }, {});
  }
}

// ===== EXCEL FORMATTER =====
class ExcelFormatter {
  /**
   * Format date to DD-MM-YYYY format
   * @param {Date|string} date - Date object or date string
   * @returns {string} Formatted date
   */
  static formatDate(date) {
    if (!date) return "";
    if (typeof date === "string" && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
      return date;
    }

    const d = new Date(date);
    if (isNaN(d)) return "";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }

  /**
   * Convert string to number (remove commas)
   * @param {*} val - Value to convert
   * @returns {number} Converted number
   */
  static toNumber(val) {
    if (!val) return 0;
    return Number(val.toString().replace(/,/g, "")) || 0;
  }

  /**
   * Apply header styling to cells
   * @param {ExcelJS.Row} headerRow - Header row
   * @param {Object} options - Styling options
   */
  static styleHeader(headerRow, options = {}) {
    const {
      bold = true,
      bgColor = "FFF9C4",
      textColor = "000000",
      fontSize = 11,
    } = options;

    headerRow.eachCell((cell) => {
      if (!cell.value) return;
      cell.font = { bold, color: { argb: textColor }, size: fontSize };
      cell.alignment = { horizontal: "center", vertical: "center", wrapText: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  }

  /**
   * Auto-fit columns to content
   * @param {ExcelJS.Worksheet} sheet - Worksheet
   * @param {number} minWidth - Minimum column width
   */
  static autoFitColumns(sheet, minWidth = 10) {
    sheet.columns.forEach((column) => {
      let max = minWidth;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > max) max = len;
      });
      column.width = max + 2;
    });
  }

  /**
   * Set column width
   * @param {ExcelJS.Worksheet} sheet - Worksheet
   * @param {string} columnLetter - Column letter (A, B, etc.)
   * @param {number} width - Width value
   */
  static setColumnWidth(sheet, columnLetter, width) {
    sheet.getColumn(columnLetter).width = width;
  }

  /**
   * Merge cells and style title
   * @param {ExcelJS.Worksheet} sheet - Worksheet
   * @param {ExcelJS.Row} titleRow - Title row
   * @param {number} columnCount - Number of columns to merge
   * @param {Object} options - Styling options
   */
  static styleTitleRow(sheet, titleRow, columnCount = 20, options = {}) {
    const {
      bold = true,
      fontSize = 14,
      bgColor = "D9E1F2",
      textColor = "000000",
    } = options;

    const colLetter = String.fromCharCode(64 + columnCount);
    sheet.mergeCells(
      `A${titleRow.number}:${colLetter}${titleRow.number}`
    );

    titleRow.getCell(1).font = {
      bold,
      size: fontSize,
      color: { argb: textColor },
    };
    titleRow.getCell(1).alignment = {
      horizontal: "center",
      vertical: "center",
    };
    titleRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bgColor },
    };
  }
}

// ===== MAIN REPORT GENERATOR =====
export class MonthlyReportGenerator {
  constructor(outputDir = null) {
    this.outputDir =
      outputDir || path.join(process.cwd(), "exports");
    this.ensureExportDir();
  }

  ensureExportDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate monthly report
   * @param {Array} records - Array of records
   * @param {number} month - Month (1-12)
   * @param {number} year - Year (e.g., 2026)
   * @param {Object} options - Configuration options
   * @returns {Object} { filePath, filename, recordCount }
   */
  async generateMonthlyReport(records, month, year, options = {}) {
    const {
      dateColumn = "loginDate",
      columns = null,
      sheetName = "Monthly Report",
      fileName = null,
      includeHeaders = true,
      autoFit = true,
      filterByStatus = null,
    } = options;

    // Validate inputs
    if (!records || !Array.isArray(records)) {
      records = [];
    }

    if (month < 1 || month > 12) {
      throw new Error("Month must be between 1 and 12");
    }

    // Get date range
    const { startDate, endDate } = DateRange.getMonthRange(month, year);

    // Filter records by date range
    let filteredRecords = DataFilter.filterByDateRange(
      records,
      dateColumn,
      startDate,
      endDate
    );

    // Apply status filter if provided
    if (filterByStatus) {
      filteredRecords = DataFilter.filterByStatus(
        filteredRecords,
        filterByStatus
      );
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });

    // Determine columns to export
    const exportColumns = columns || this.getDefaultColumns();

    // Add header row
    if (includeHeaders) {
      const headerRow = sheet.addRow(exportColumns);
      ExcelFormatter.styleHeader(headerRow, {
        bgColor: "4472C4",
        textColor: "FFFFFF",
        bold: true,
      });
    }

    // Add data rows
    filteredRecords.forEach((record, index) => {
      const rowData = this.extractRowData(record, exportColumns);
      sheet.addRow(rowData);
    });

    // Auto-fit columns
    if (autoFit) {
      ExcelFormatter.autoFitColumns(sheet, 12);
    }

    // Generate filename
    const timestamp = Date.now();
    const monthStr = String(month).padStart(2, "0");
    const defaultFilename = `report_${year}-${monthStr}_${timestamp}.xlsx`;
    const filename = fileName || defaultFilename;

    const filePath = path.join(this.outputDir, filename);

    // Write file
    await workbook.xlsx.writeFile(filePath);

    return {
      filePath,
      filename,
      recordCount: filteredRecords.length,
      dateRange: {
        start: ExcelFormatter.formatDate(startDate),
        end: ExcelFormatter.formatDate(endDate),
      },
      dateColumn,
    };
  }

  /**
   * Generate quarterly report
   * @param {Array} records - Array of records
   * @param {number} quarter - Quarter (1-4)
   * @param {number} year - Year
   * @param {Object} options - Configuration options
   * @returns {Object} { filePath, filename, recordCount }
   */
  async generateQuarterlyReport(records, quarter, year, options = {}) {
    if (quarter < 1 || quarter > 4) {
      throw new Error("Quarter must be between 1 and 4");
    }

    const { startDate, endDate } = DateRange.getQuarterRange(quarter, year);
    const dateColumn = options.dateColumn || "loginDate";

    let filteredRecords = DataFilter.filterByDateRange(
      records,
      dateColumn,
      startDate,
      endDate
    );

    if (options.filterByStatus) {
      filteredRecords = DataFilter.filterByStatus(
        records,
        options.filterByStatus
      );
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Q${quarter} ${year}`);

    const exportColumns = options.columns || this.getDefaultColumns();

    const headerRow = sheet.addRow(exportColumns);
    ExcelFormatter.styleHeader(headerRow, {
      bgColor: "70AD47",
      textColor: "FFFFFF",
    });

    filteredRecords.forEach((record) => {
      const rowData = this.extractRowData(record, exportColumns);
      sheet.addRow(rowData);
    });

    ExcelFormatter.autoFitColumns(sheet);

    const timestamp = Date.now();
    const filename = `quarterly_report_Q${quarter}_${year}_${timestamp}.xlsx`;
    const filePath = path.join(this.outputDir, filename);

    await workbook.xlsx.writeFile(filePath);

    return {
      filePath,
      filename,
      recordCount: filteredRecords.length,
      dateRange: {
        start: ExcelFormatter.formatDate(startDate),
        end: ExcelFormatter.formatDate(endDate),
      },
    };
  }

  /**
   * Generate custom date range report
   * @param {Array} records - Array of records
   * @param {string} startDate - YYYY-MM-DD format
   * @param {string} endDate - YYYY-MM-DD format
   * @param {Object} options - Configuration options
   * @returns {Object} { filePath, filename, recordCount }
   */
  async generateCustomDateReport(records, startDate, endDate, options = {}) {
    const { startDate: start, endDate: end } = DateRange.getCustomRange(
      startDate,
      endDate
    );

    const dateColumn = options.dateColumn || "loginDate";
    let filteredRecords = DataFilter.filterByDateRange(
      records,
      dateColumn,
      start,
      end
    );

    if (options.filterByStatus) {
      filteredRecords = DataFilter.filterByStatus(
        filteredRecords,
        options.filterByStatus
      );
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Custom Report");

    const exportColumns = options.columns || this.getDefaultColumns();

    const headerRow = sheet.addRow(exportColumns);
    ExcelFormatter.styleHeader(headerRow);

    filteredRecords.forEach((record) => {
      const rowData = this.extractRowData(record, exportColumns);
      sheet.addRow(rowData);
    });

    ExcelFormatter.autoFitColumns(sheet);

    const timestamp = Date.now();
    const startStr = startDate.replace(/-/g, "");
    const endStr = endDate.replace(/-/g, "");
    const filename = `report_${startStr}_to_${endStr}_${timestamp}.xlsx`;
    const filePath = path.join(this.outputDir, filename);

    await workbook.xlsx.writeFile(filePath);

    return {
      filePath,
      filename,
      recordCount: filteredRecords.length,
      dateRange: {
        start: ExcelFormatter.formatDate(start),
        end: ExcelFormatter.formatDate(end),
      },
    };
  }

  /**
   * Get default columns based on your Application model
   * @returns {Array} Column names
   */
  getDefaultColumns() {
    return [
      "S.No",
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
      "Sanction Date",
      "Sanction Amount",
      "Disbursed Date",
      "Disbursed Amount",
      "Loan Number",
      "Category",
      "Remarks",
    ];
  }

  /**
   * Extract row data from a record
   * @param {Object} record - Single record/document
   * @param {Array} columns - Column names to extract
   * @returns {Array} Row data values
   */
  extractRowData(record, columns) {
    const obj = record.toObject ? record.toObject() : record;
    const rowData = [];

    columns.forEach((col) => {
      let value = "";

      switch (col) {
        case "S.No":
          // Will be handled by the row index
          value = "";
          break;
        case "Amount":
        case "Sanction Amount":
        case "Disbursed Amount":
          value = ExcelFormatter.toNumber(obj[this.columnToField(col)]);
          break;
        case "Login Date":
        case "Sanction Date":
        case "Disbursed Date":
          value = ExcelFormatter.formatDate(
            obj[this.columnToField(col)]
          );
          break;
        default:
          value = obj[this.columnToField(col)] || "";
      }

      rowData.push(value);
    });

    return rowData;
  }

  /**
   * Convert column display name to field name
   * @param {string} col - Column display name
   * @returns {string} Field name in camelCase
   */
  columnToField(col) {
    const mapping = {
      "S.No": "sNo",
      Code: "code",
      Name: "name",
      Mobile: "mobile",
      Email: "email",
      Product: "product",
      Amount: "amount",
      Bank: "bank",
      "Banker Name": "bankerName",
      Status: "status",
      "Login Date": "loginDate",
      Sales: "sales",
      Ref: "ref",
      "Source Channel": "sourceChannel",
      "Property Type": "propertyType",
      "Property Details": "propertyDetails",
      "Sanction Date": "sanctionDate",
      "Sanction Amount": "sanctionAmount",
      "Disbursed Date": "disbursedDate",
      "Disbursed Amount": "disbursedAmount",
      "Loan Number": "loanNumber",
      Category: "category",
      Remarks: "remark",
    };

    return mapping[col] || col;
  }
}

export { DateRange, DataFilter, ExcelFormatter };
