import { analyzeLeadIntelligence, buildLeadFingerprint } from "../utils/leadIntelligence.js";
import { requestLlmLeadIntelligence } from "./llmLeadIntelligence.js";

const ACTIONS = ["Call Today", "Call Tomorrow", "Follow Up", "Call Later", "Do Not Call", "Review Required"];
const PRIORITIES = ["HOT", "WARM", "COLD", "LOW", "STOP"];

const stringValue = (value, max) => String(value ?? "").trim().slice(0, max);
const validDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeLlmResult = (raw) => {
  if (!raw || typeof raw !== "object") throw new Error("LLM result is not an object");
  const leadScore = Number(raw.leadScore);
  const confidence = Number(raw.confidence);
  const priority = stringValue(raw.priority, 10).toUpperCase();
  const nextBestAction = stringValue(raw.nextBestAction || raw.recommendedNextAction, 40);
  if (!Number.isFinite(leadScore) || leadScore < 0 || leadScore > 100) throw new Error("Invalid LLM lead score");
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) throw new Error("Invalid LLM confidence");
  if (!PRIORITIES.includes(priority) || !ACTIONS.includes(nextBestAction)) throw new Error("Invalid LLM enum value");
  if (typeof raw.shouldCallAgain !== "boolean") throw new Error("Invalid LLM call decision");
  const interestLevel = stringValue(raw.interestLevel, 40);
  const summary = stringValue(raw.summary, 2000);
  const reasoning = stringValue(raw.reasoning, 4000);
  if (!interestLevel || !summary || !reasoning) throw new Error("LLM response is missing required text");
  if (priority === "STOP" || nextBestAction === "Do Not Call") throw new Error("LLM cannot independently make a safety stop decision");
  return {
    leadScore,
    priority,
    interestLevel,
    shouldCallAgain: raw.shouldCallAgain,
    nextBestAction,
    suggestedFollowUpDate: validDate(raw.suggestedFollowUpDate),
    summary,
    reasoning,
    confidence,
  };
};

export const analyzeLeadWithLlm = async (lead, { force = false } = {}) => {
  const deterministic = analyzeLeadIntelligence(lead);
  const fingerprint = buildLeadFingerprint(lead);
  const existing = lead.aiIntelligence?.toObject ? lead.aiIntelligence.toObject() : lead.aiIntelligence;
  if (!force && existing?.sourceFingerprint === fingerprint && existing?.isStale !== true && existing?.outdated !== true) {
    return { analysis: existing, providerUsed: false, skipped: true };
  }

  try {
    console.info("Lead AI analysis started", String(lead._id));
    const response = await requestLlmLeadIntelligence(lead);
    if (response.skipped) throw new Error(response.reason);
    const llm = normalizeLlmResult(response.value);
    const safetyStop = deterministic.priority === "STOP" || deterministic.shouldCallAgain === false && deterministic.nextBestAction === "Do Not Call";
    const explicitFollowUp = deterministic.signalSummary?.explicitFollowUpDate;
    const deterministicSignals = deterministic.signalSummary || {};
    const hasStrongDeterministicSupport =
      deterministic.priority === "HOT" ||
      Boolean(explicitFollowUp) ||
      Number(deterministicSignals.positiveCount) >= 2;
    const canUseLlmDecision = !safetyStop && hasStrongDeterministicSupport;
    const merged = safetyStop
      ? deterministic
      : {
          ...deterministic,
          ...(canUseLlmDecision
            ? {
                leadScore: llm.leadScore,
                priority: llm.priority,
                shouldCallAgain: llm.shouldCallAgain,
                nextBestAction: llm.nextBestAction,
              }
            : {}),
          interestLevel: llm.interestLevel,
          summary: llm.summary,
          reasoning: llm.reasoning,
          confidence: llm.confidence,
          suggestedFollowUpDate: explicitFollowUp || (canUseLlmDecision ? llm.suggestedFollowUpDate : deterministic.suggestedFollowUpDate),
        };
    const analysis = {
      ...merged,
      nextBestAction: merged.nextBestAction || merged.recommendedNextAction,
      recommendedNextAction: merged.nextBestAction || merged.recommendedNextAction,
      summary: merged.summary || merged.shortSummary,
      shortSummary: merged.summary || merged.shortSummary,
      reasoning: merged.reasoning || merged.reason,
      reason: merged.reasoning || merged.reason,
      isStale: false,
      outdated: false,
      sourceFingerprint: fingerprint,
      callCount: Array.isArray(lead.calls) ? lead.calls.length : 0,
      lastAnalyzedAt: new Date(),
    };
    console.info("Lead AI analysis succeeded", String(lead._id));
    return { analysis, providerUsed: "gemini", fallback: false, skipped: false };
  } catch (error) {
    console.warn("Lead AI fallback used", String(lead._id), error?.message || "provider error");
    return {
      analysis: { ...deterministic, isStale: false, outdated: false, sourceFingerprint: fingerprint, callCount: lead.calls?.length || 0 },
      providerUsed: "deterministic",
      fallback: true,
      error: error?.message || "LLM analysis failed",
    };
  }
};
