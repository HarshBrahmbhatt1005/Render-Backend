import express from "express";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import LeadUser from "../models/LeadUser.js";
import RealEstateLead from "../models/RealEstateLead.js";
import {
  LEAD_ACCESS_TYPES,
  LEAD_MODULES,
  buildLeadQueryForUser,
  createLeadUserToken,
  getUserModules,
  normalizeLeadModules,
  toSafeLeadUser,
  verifyLeadUserRequest,
} from "../utils/leadPermissions.js";

const router = express.Router();

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
});

// ===========================
// POST /api/lead-users/login
// ===========================
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    const user = await LeadUser.findOne({ username: username.trim().toLowerCase() });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    return res.json({
      success: true,
      user: toSafeLeadUser(user),
      token: createLeadUserToken(user),
    });
  } catch (err) {
    console.error("❌ Lead user login error:", err);
    return res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

// ===========================
// Middleware: verify admin password for all routes below
// ===========================
const normalizePassword = (value) => {
  if (value === undefined || value === null) return "";

  const trimmed = String(value).trim();
  const hasWrappingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return hasWrappingQuotes ? trimmed.slice(1, -1).trim() : trimmed;
};

const requireAdminPassword = (req, res, next) => {
  const configuredPassword = normalizePassword(process.env.LEAD_ADMIN_PASSWORD || process.env.DOWNLOAD_PASSWORD);

  if (!configuredPassword) {
    console.error("LEAD_ADMIN_PASSWORD is not configured.");
    return res.status(500).json({
      success: false,
      message: "Lead admin password is not configured on the server.",
    });
  }

  const adminPassword = normalizePassword(req.headers["x-admin-password"]);
  if (!adminPassword || adminPassword !== configuredPassword) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }
  next();
};

// ===========================
// GET /api/lead-users/my-leads  (for logged-in user — fetch their own leads)
// Expects header: x-lead-user-id
// IMPORTANT: must be registered BEFORE /:id to avoid route conflict
// ===========================
router.get("/my-leads", async (req, res) => {
  try {
    const { user, errorStatus, errorMessage } = await verifyLeadUserRequest(req);
    if (!user) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }

    const leads = await RealEstateLead.find(buildLeadQueryForUser(user)).sort({ createdAt: -1 });
    return res.json(leads);
  } catch (err) {
    console.error("❌ Fetch my-leads error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch leads." });
  }
});

// ===========================
// GET /api/lead-users  (admin)
// ===========================
router.get("/", requireAdminPassword, async (req, res) => {
  try {
    const users = await LeadUser.find({}, "-passwordHash").sort({ createdAt: -1 });
    return res.json({
      success: true,
      modules: LEAD_MODULES,
      accessTypes: LEAD_ACCESS_TYPES,
      users: users.map(toSafeLeadUser),
    });
  } catch (err) {
    console.error("❌ Fetch lead users error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch users." });
  }
});

// ===========================
// POST /api/lead-users  (admin — create user)
// ===========================
router.post("/", requireAdminPassword, async (req, res) => {
  try {
    const {
      username,
      password,
      allowedForms,
      allowedModules,
      leadAccessType = "own",
      rolePermissions = {},
      displayName,
      assignedManager,
    } = req.body;

    if (!username?.trim()) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters." });
    }
    const modules = normalizeLeadModules(allowedModules || allowedForms);
    if (modules.length === 0) {
      return res.status(400).json({ success: false, message: "At least one module is required." });
    }

    if (!LEAD_ACCESS_TYPES.includes(leadAccessType)) {
      return res.status(400).json({ success: false, message: "Invalid lead access type." });
    }

    // Check for duplicate username
    const existing = await LeadUser.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Username already exists." });
    }

    const SALT_ROUNDS = 10;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new LeadUser({
      username: username.trim().toLowerCase(),
      passwordHash,
      allowedForms: modules,
      allowedModules: modules,
      leadAccessType,
      rolePermissions,
      displayName: displayName?.trim() || username.trim(),
      assignedManager: assignedManager?.trim() || "",
      isActive: true,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: toSafeLeadUser(user),
    });
  } catch (err) {
    console.error("❌ Create lead user error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Username already exists." });
    }
    return res.status(500).json({ success: false, message: "Failed to create user." });
  }
});

// ===========================
// GET /api/lead-users/:id/leads  (admin - fetch all leads submitted by user)
// ===========================
router.get("/:id/leads", requireAdminPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await LeadUser.findById(id, "-passwordHash");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const leads = await RealEstateLead.find(buildLeadQueryForUser(user)).sort({ createdAt: -1 });

    return res.json({
      success: true,
      user,
      leads,
    });
  } catch (err) {
    console.error("Fetch lead user data error:", err);
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }
    return res.status(500).json({ success: false, message: "Failed to fetch user data." });
  }
});

// ===========================
// PATCH /api/lead-users/:id  (admin - update user)
// ===========================
router.patch("/:id", requireAdminPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      password,
      allowedForms,
      allowedModules,
      leadAccessType,
      rolePermissions,
      displayName,
      assignedManager,
      isActive,
    } = req.body;

    const user = await LeadUser.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (password) {
      if (password.length < 4) {
        return res.status(400).json({ success: false, message: "Password must be at least 4 characters." });
      }
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    if (allowedModules !== undefined || allowedForms !== undefined) {
      const modules = normalizeLeadModules(allowedModules || allowedForms);
      if (modules.length === 0) {
        return res.status(400).json({ success: false, message: "At least one module is required." });
      }
      user.allowedForms = modules;
      user.allowedModules = modules;
    }

    if (leadAccessType !== undefined) {
      if (!LEAD_ACCESS_TYPES.includes(leadAccessType)) {
        return res.status(400).json({ success: false, message: "Invalid lead access type." });
      }
      user.leadAccessType = leadAccessType;
    }

    if (rolePermissions !== undefined) {
      user.rolePermissions = rolePermissions;
    }

    if (displayName !== undefined) {
      user.displayName = displayName.trim();
    }

    if (assignedManager !== undefined) {
      user.assignedManager = assignedManager.trim();
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    return res.json({
      success: true,
      message: "User updated successfully.",
      user: toSafeLeadUser(user),
    });
  } catch (err) {
    console.error("❌ Update lead user error:", err);
    return res.status(500).json({ success: false, message: "Failed to update user." });
  }
});

// ===========================
// DELETE /api/lead-users/:id  (admin)
// ===========================
router.delete("/:id", requireAdminPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await LeadUser.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    console.error("❌ Delete lead user error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete user." });
  }
});

export default router;
