import mongoose from "mongoose";

const passwordStoreSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: String, // bcrypt hashed password
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PasswordStore", passwordStoreSchema);
