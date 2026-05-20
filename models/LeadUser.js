import mongoose from "mongoose";
import bcrypt from "bcrypt";

const leadUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // Stored as bcrypt hash
    passwordHash: {
      type: String,
      required: true,
    },
    // Which lead form types this user can access
    // e.g. ["realestate"], ["finance"], ["realestate", "finance"]
    allowedForms: {
      type: [String],
      enum: ["realestate", "finance"],
      default: ["realestate"],
    },
    // Display name shown in the UI
    displayName: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Instance method to verify a plain-text password
leadUserSchema.methods.verifyPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

export default mongoose.model("LeadUser", leadUserSchema, "lead_users");
