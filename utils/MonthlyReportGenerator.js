import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

/**
 * Monthly / Quarterly / Custom Report Generator
 * (Abhi sirf MONTHLY logic required – baki safe rakha hai)
 */
export class MonthlyReportGenerator {
  constructor() {
    this.outputDir = path.join(process.cwd(), "exports");

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * ================================
   * 🟢 MONTHLY REPORT GENERATOR
   * ================================
   * @param {Array} applications - Mongo records
   * @param {Number} month - 1 to 12
   * @param {Number} year - YYYY
   * @param {Object} options
   */
  async generateMonthlyReport(applications, month, year, options = {}) {
    const {
      dateColumn = "loginDate",
      sheetName = "Monthly Report",
      fileName = `monthly_report_${year}-${String(month).padStart(2, "0")}.xlsx`,
    } = options;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

    // ===============================
    // 🟡 HEADER (Master Excel jaisa)
    // ===============================
    sheet.columns = [
      { header: "Application ID", key: "_id", width: 22 },
      { header: "Customer Name", key: "name", width: 25 },
      { header: "Mobile", key: "mobile", width: 15 },
      { header: "Email", key: "email", width: 30 },
      { header: "Product", key: "product", width: 18 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Status", key: "status", width: 18 },
      { header: "Sales Ref", key: "sales", width: 22 },
      { header: "Login Date", key: "loginDate", width: 15 },
      { header: "Sanction Date", key: "sanctionDate", width: 15 },
      { header: "Disbursed Date", key: "disbursedDate", width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };

    // ===============================
    // 🟢 DATE RANGE
    // ===============================
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // ===============================
    // 🔵 FILTER + ADD ROWS
    // ===============================
    applications.forEach((app) => {
      const rawDate = app[dateColumn];
      if (!rawDate) return;

      const recordDate = new Date(rawDate);
      if (recordDate < startDate || recordDate > endDate) return;

      sheet.addRow({
        _id: app._id?.toString() || "",
        name: app.name || "",
        mobile: app.mobile || "",
        email: app.email || "",
        product: app.product || "",
        amount: app.amount || 0,
        status: app.status || "",
        sales: app.sales || "",
        loginDate: this.formatDate(app.loginDate),
        sanctionDate: this.formatDate(app.sanctionDate),
        disbursedDate: this.formatDate(app.disbursedDate),
      });
    });

    // ===============================
    // 🟣 SAVE FILE
    // ===============================
    const filePath = path.join(this.outputDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    return {
      filePath,
      filename: fileName,
      recordCount: sheet.rowCount - 1,
    };
  }

  // ===============================
  // 🔧 DATE FORMATTER
  // ===============================
  formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN");
  }
}
