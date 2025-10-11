import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    code: String,
    otherCode: String,
    name: String,
    mobile: String,
    product: String,
    otherProduct: String,
    amount: Number,
    bank: String,
    otherBank: String,
    bankerName: String,
    status: String,
    loginDate: Date,
    sales: String,
    ref: String,
    sourceChannel: String,
    otherSourceChannel: String,
    email: String,
    propertyDetails: String,
    remark: String,
    mktValue: Number,
    roi: String,
    processingFees: String,
    auditData: String,
    consulting: String,
    payout: String,
    expenceAmount: String,
    category: String,
    otherCategory: String,
    feesRefundAmount: String,
    approvalStatus: String,
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
