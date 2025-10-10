import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  email: String,
  sales: String,
  ref: String,
  sourceChannel: String,
  code: String,
  otherCode: String,
  bank: String,
  otherBank: String,
  bankerName: String,
  status: String,
  loginDate: Date,
  propertyDetails: String,
  mktValue: Number,
  amount: Number,
  roi: String,
  product: String,
  otherProduct: String,
  processingFees: String,
  category: String,
  auditData: String,
  consulting: String,
  payout: String,
  expenceAmount: String,
  feesRefundAmount: String,
  remark: String,
  approvalStatus: String,
}, { timestamps: true });

export default mongoose.model("Application", applicationSchema);
