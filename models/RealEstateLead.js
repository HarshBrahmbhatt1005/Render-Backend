import mongoose from "mongoose";

const realEstateLeadSchema = new mongoose.Schema(
  {
    callingDate: { type: Date, required: true },
    source: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerNumber: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^\d{10}$/.test(v),
        message: "Customer number must be exactly 10 digits",
      },
    },
    propertyType: { type: String, required: true, trim: true },
    budget: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    status: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("RealEstateLead", realEstateLeadSchema, "realestate_leads");
