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
    sales: String,
    ref: String,
    sourceChannel: String,
    remark: String,
    approvalStatus: String,
    payout: String,
    expenceAmount: String,
    feesRefundAmount: String,
    propertyDetails: String,
    mktValue: String,
    roi: String,
    processingFees: String,
    auditData: String,
    consulting: String,
  },
  { timestamps: true }
);
export default mongoose.model("Application", applicationSchema);
