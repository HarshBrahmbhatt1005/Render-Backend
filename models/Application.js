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
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
