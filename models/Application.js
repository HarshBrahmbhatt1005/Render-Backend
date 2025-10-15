import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    // 🔹 Basic Info
    code: { type: String, default: "" },
    otherCode: { type: String, default: "" },

    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, default: "" },

    // 🔹 Product & Bank Info
    product: { type: String, default: "" },
    otherProduct: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    bank: { type: String, default: "" },
    otherBank: { type: String, default: "" },
    bankerName: { type: String, default: "" },

    // 🔹 Application Progress
    status: { type: String, default: "" },
    loginDate: { type: Date },
    sales: { type: String, default: "" },
    ref: { type: String, default: "" },

    // 🔹 Channel & Category
    sourceChannel: { type: String, default: "" },
    otherSourceChannel: { type: String, default: "" },
    category: { type: String, default: "" },
    otherCategory: { type: String, default: "" },

    // 🔹 Financial Details
    payout: { type: Number, default: 0 },
    expenceAmount: { type: Number, default: 0 },
    feesRefundAmount: { type: Number, default: 0 },
    mktValue: { type: Number, default: 0 },
    roi: { type: Number, default: 0 },
    processingFees: { type: Number, default: 0 },

    // 🔹 Property Info
    propertyDetails: { type: String, default: "" },

    // 🔹 Remarks & Audit
    remark: { type: String, default: "" },
    auditData: { type: String, default: "" },
    consulting: { type: String, default: "" },

    // 🔹 Approval
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
