import crypto from "crypto";
import LeadUser from "../models/LeadUser.js";

export const LEAD_MODULES = [
  { key: "realestate", label: "Real Estate" },
  { key: "finance", label: "Finance" },
];

export const LEAD_ACCESS_TYPES = ["all", "own"];

const moduleKeys = LEAD_MODULES.map((module) => module.key);

export const normalizeLeadModules = (modules) => {
  const values = Array.isArray(modules) ? modules : [];
  const valid = values.filter((module) => moduleKeys.includes(module));
  return Array.from(new Set(valid));
};

export const getUserModules = (user) => {
  const modules = normalizeLeadModules(user?.allowedModules);
  if (modules.length > 0) return modules;
  return normalizeLeadModules(user?.allowedForms);
};

export const getUserAccessType = (user) => (
  LEAD_ACCESS_TYPES.includes(user?.leadAccessType) ? user.leadAccessType : "own"
);

const getUserIdentityNames = (user) => (
  Array.from(new Set(
    [
      user?.displayName,
      user?.assignedManager,
      user?.username,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  ))
);

export const buildLeadQueryForUser = (user) => {
  const modules = getUserModules(user);
  const leadTypeConditions = [];

  if (modules.includes("realestate")) {
    leadTypeConditions.push(
      { leadType: "realestate" },
      { leadType: { $exists: false } },
      { leadType: null },
      { leadType: "" }
    );
  }

  if (modules.includes("finance")) {
    leadTypeConditions.push({ leadType: "finance" });
  }

  const query = {
    $or: leadTypeConditions.length > 0 ? leadTypeConditions : [{ leadType: "__none__" }],
  };

  if (getUserAccessType(user) === "own") {
    const identityNames = getUserIdentityNames(user);
    const ownAccessConditions = [
      { submittedBy: user._id },
      { submittedBy: String(user._id) },
      { submittedByUsername: user.username },
    ];

    if (user?.displayName?.trim()) {
      ownAccessConditions.push({ submittedByDisplayName: user.displayName.trim() });
    }

    if (identityNames.length > 0) {
      ownAccessConditions.push(
        { "calls.callerName": { $in: identityNames } },
        { "calls.manager": { $in: identityNames } }
      );
    }

    query.$and = [{ $or: query.$or }, { $or: ownAccessConditions }];
    delete query.$or;
  }

  return query;
};

const getTokenSecret = () => (
  process.env.LEAD_USER_TOKEN_SECRET ||
  process.env.LEAD_ADMIN_PASSWORD ||
  process.env.DOWNLOAD_PASSWORD ||
  "lead-user-token-secret"
);

export const createLeadUserToken = (user) => {
  const userId = String(user._id);
  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(`${userId}:${user.passwordHash}`)
    .digest("hex");

  return `${userId}.${signature}`;
};

export const verifyLeadUserRequest = async (req) => {
  const userId = req.headers["x-lead-user-id"];
  const token = req.headers["x-lead-user-token"];

  if (!userId || !token) {
    return { errorStatus: 401, errorMessage: "Lead user authentication is required." };
  }

  const user = await LeadUser.findById(userId);
  if (!user || !user.isActive) {
    return { errorStatus: 401, errorMessage: "Lead user is inactive or not found." };
  }

  const expectedToken = createLeadUserToken(user);
  const tokenBuffer = Buffer.from(String(token));
  const expectedBuffer = Buffer.from(expectedToken);

  if (
    tokenBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
  ) {
    return { errorStatus: 401, errorMessage: "Invalid lead user session." };
  }

  return { user };
};

export const toSafeLeadUser = (user) => ({
  id: user._id,
  username: user.username,
  displayName: user.displayName || user.username,
  assignedManager: user.assignedManager || "",
  allowedForms: getUserModules(user),
  allowedModules: getUserModules(user),
  leadAccessType: getUserAccessType(user),
  rolePermissions: user.rolePermissions || {},
  canDownloadExcel: !!(user.rolePermissions?.canDownloadExcel),
  isActive: user.isActive,
  createdAt: user.createdAt,
});
