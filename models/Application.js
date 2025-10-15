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
    loginDate: Date,
    sales: String,
    ref: String,
    sourceChannel: String,
    otherSourceChannel: String,
    remarks: String,
    approvalStatus: String,
    payout: String,
    expenceAmount: String,
    feesRefundAmount: String,
    propertyDetails: String,
    mktValue: String,
    roi: String,
    processingFees: String,
    category: String,
    otherCategory: String,
    auditData: String,
    consulting: String,
    importantMsg: String,
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
