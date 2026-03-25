/**
 * One-time script to hash and store APPROVE_LEVEL2_PASSWORD in MongoDB.
 * Run once: node scripts/seedLevel2Password.js
 */
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import PasswordStore from "../models/PasswordStore.js";

dotenv.config();

const SALT_ROUNDS = 12;
const KEY = "APPROVE_LEVEL2_PASSWORD";

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI not set in .env");
    process.exit(1);
  }

  const plainPassword = process.env.APPROVE_LEVEL2_PASSWORD;
  if (!plainPassword) {
    console.error("❌ APPROVE_LEVEL2_PASSWORD not set in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);

  await PasswordStore.findOneAndUpdate(
    { key: KEY },
    { key: KEY, value: hashed },
    { upsert: true, new: true }
  );

  console.log(`✅ Password hashed and stored for key: ${KEY}`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
