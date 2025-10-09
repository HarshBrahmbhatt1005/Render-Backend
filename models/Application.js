import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  code: String,
  name: String,
  mobile: String,
  email: String,
  product: String,
  amount: String,
  bank: String,
  bankerName: String,
  status: String,
  loginDate: String,
  sales: String,
  ref: String,
  sourceChannel: String,
  remark: { type: String, required: true }, // 🔹 new
  approvalStatus: { type: String, default: "" },
  payout: String,
  expenceAmount: String,
  feesRefundAmount: String,
  propertyDetails: String,
  mktValue: String,
  roi: String,
  processingFees: String,
  auditData: String,
  consulting: String,
});

export default mongoose.model("Application", applicationSchema);
