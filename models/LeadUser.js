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
    // Which lead modules this user can access.
    // Keep allowedForms for backward compatibility with older frontend builds.
    allowedForms: {
      type: [String],
      enum: ["realestate", "finance"],
      default: ["realestate"],
    },
    allowedModules: {
      type: [String],
      default: ["realestate"],
    },
    leadAccessType: {
      type: String,
      enum: ["all", "own"],
      default: "own",
    },
    rolePermissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Display name shown in the UI
    displayName: {
      type: String,
      trim: true,
      default: "",
    },
    // The manager name this user is assigned to — auto-filled in call records
    assignedManager: {
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
