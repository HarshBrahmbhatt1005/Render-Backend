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
    hsApprovedBy: {
      type: String,
      default: "",
    },
    hsApprovedAt: {
      type: String,
      default: "",
    },
    invoiceGeneratedBy: {
      type: String,
      enum: ["ICICI", "HDFC", "Deutsche", "Aadrika", "Other", null, "", undefined],
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
      enum: ["Yes", "No", "", null],
      default: "",
    },
    subventionRemark: {
      type: String,
      default: "",
    },

    invoiceGroupList: [
      {
        invoiceRaisedAmount: { type: Number, default: null },
        invoiceRaisedInvoiceNumber: { type: String, default: "" },
        invoiceRaisedDate: { type: Date, default: null },
        payoutReceivedAmount: { type: Number, default: null },
        payoutReceivedInvoiceNumber: { type: String, default: "" },
        payoutReceivedDate: { type: Date, default: null },
        gstReceivedAmount: { type: Number, default: null },
        gstReceivedInvoiceNumber: { type: String, default: "" },
        gstReceivedDate: { type: Date, default: null },
      }
    ],

    // Insurance Payout
    insurancePayoutStatus: { type: String, enum: ["Yes", "No", "", null], default: "" },
    insurancePayout: { type: Number, default: null },
    insurancePayoutInvoiceNumber: { type: String, default: "" },
    insurancePayoutDate: { type: Date, default: null },

    // Payout Paid
    payoutPaidStatus: { type: String, enum: ["Yes", "No", "", null], default: "" },
    payoutPaidList: [
      {
        payoutPaidAmount: { type: Number, default: null },
        payoutPaidInvoiceNumber: { type: String, default: "" },
        payoutPaidDate: { type: Date, default: null },
        payoutPaidVendorName: { type: String, default: "" },
      }
    ],

    // Expense Paid
    expensePaidStatus: { type: String, enum: ["Yes", "No", "", null], default: "" },
    expensePaid: { type: Number, default: null },
    expensePaidInvoiceNumber: { type: String, default: "" },
    expensePaidDate: { type: Date, default: null },
    expensePaidVendorName: { type: String, default: "" },

    // ✅ Change tracking — persists the "fields changed" indicator across sessions
    lastChanges: {
      type: mongoose.Schema.Types.Mixed, // stores { fieldName: { oldVal, newVal } }
      default: null,
    },
    lastChangedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
