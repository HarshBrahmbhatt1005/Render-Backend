import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    code: String,
    otherCode: String,
    name: String,
    mobile: String,
    email: String,
    product: String,
    otherProduct: String,
    amount: String,
    bank: String,
    otherBank: String,
    bankerName: String,
    status: String,
    loginDate: String,
    sanctionDate: String,
    sanctionAmount: String,
    disbursedDate: String,
    loanNumber: String,
    disbursedAmount: String,
    insuranceOption: String,
    insuranceAmount: String,
    subventionOption: String,
    subventionAmount: String,
    reloginReason: String,

    partDisbursed: [
      {
        date: String,
        amount: Number,
      },
    ],
    sales: String,
    ref: String,
    sourceChannel: String,
    otherSourceChannel: String,
    remark: String,
    approvalStatus: String,
    payout: String,
    expenceAmount: String,
    feesRefundAmount: String,
    propertyType: String,
    propertyDetails: String,
    mktValue: String,
    roi: String,
    processingFees: String,
    category: String,
    otherCategory: String,
    auditData: String,
    consulting: String,
    importantMsg: String,
    pdStatus: {
      type: String,
      default: "",
    },
    pdRemark: {
      type: String,
      default: "",
    },
    pdDate: {
      type: String,
      default: "",
    },
    rejectedRemark: {
      type: String,
      default: "",
    },
    withdrawRemark: {
      type: String,
      default: "",
    },
    holdRemark: {
      type: String,
      default: "",
    },
    usps: {
      type: [String],
      default: [],
    },
    totalAmenities: {
      type: String,
      default: "",
    },
    allotedCarParking: {
      type: String,
      default: "",
    },
    bankerContactNumber: {
      type: String,
      default: "",
    },
    bankerEmail: {
      type: String,
      default: "",
    },
    finalRemark: {
      type: String,
      default: "",
    },
    consultingReceived: {
      type: String,
      default: "",
    },
    consultingShared: {
      type: String,
      default: "",
    },
    consultingRemark: {
      type: String,
      default: "",
    },
    hsApprovalStatus: {
      type: String,
      default: "Pending", // "Pending", "Approved by HG", "Rejected by HG"
    },
    hsApprovalDate: {
      type: String,
      default: "",
    },
    invoiceGeneratedBy: {
      type: String,
      enum: ["ICICI", "HDFC", "Deutsche", "Aadrika", "Other", null],
      default: null,
    },
    invoiceGeneratedByOther: {
      type: String,
      default: "",
    },
    payoutPercentage: {
      type: Number,
      default: null,
    },
    subventionShortPayment: {
      type: String,
      enum: ["Yes", "No"],
      default: "No",
    },
    subventionRemark: {
      type: String,
      default: "",
    },

    // Insurance Payout
    insurancePayout: { type: Number, default: null },
    insurancePayoutInvoiceNumber: { type: String, default: "" },
    insurancePayoutDate: { type: Date, default: null },

    // Payout Received
    payoutReceived: { type: Number, default: null },
    payoutReceivedInvoiceNumber: { type: String, default: "" },
    payoutReceivedDate: { type: Date, default: null },

    // Payout Paid
    payoutPaid: { type: Number, default: null },
    payoutPaidInvoiceNumber: { type: String, default: "" },
    payoutPaidDate: { type: Date, default: null },

    // Expense Paid
    expensePaid: { type: Number, default: null },
    expensePaidInvoiceNumber: { type: String, default: "" },
    expensePaidDate: { type: Date, default: null },

    // GST Received
    gstReceived: { type: Number, default: null },
    gstReceivedInvoiceNumber: { type: String, default: "" },
    gstReceivedDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
