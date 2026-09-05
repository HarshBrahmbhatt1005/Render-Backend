import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { analyzeLeadIntelligence } from "../utils/leadIntelligence.js";
import { analyzeLeadWithLlm } from "../services/leadIntelligenceOrchestrator.js";
import {
  buildSanitizedLeadIntelligenceInput,
  requestLlmLeadIntelligence,
} from "../services/llmLeadIntelligence.js";

const originalEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  LLM_API_KEY: process.env.LLM_API_KEY,
  LLM_MODEL: process.env.LLM_MODEL,
  LLM_TIMEOUT_MS: process.env.LLM_TIMEOUT_MS,
};
const originalFetch = globalThis.fetch;

const restoreState = () => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  globalThis.fetch = originalFetch;
};

afterEach(() => {
  restoreState();
});

const createLead = (overrides = {}) => ({
  _id: "lead-123",
  leadDate: "2026-09-01T10:00:00.000Z",
  source: "website",
  projectName: "Sunrise Heights",
  leadType: "realestate",
  customerName: "Alice Example",
  customerNumber: "+15551234567",
  calls: [],
  ...overrides,
});

const mockGeminiResponse = (content) => {
  globalThis.fetch = async (url, options) => {
    mockGeminiResponse.lastRequest = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      }),
    };
  };
};

test("buildSanitizedLeadIntelligenceInput excludes personal fields and sorts calls chronologically", () => {
  const input = buildSanitizedLeadIntelligenceInput(
    createLead({
      calls: [
        { callingDate: "2026-09-03T09:00:00.000Z", status: "Second" },
        { callingDate: "2026-09-01T09:00:00.000Z", status: "First" },
      ],
    }),
  );

  assert.equal(input.lead.customerName, undefined);
  assert.equal(input.lead.customerNumber, undefined);
  assert.deepEqual(input.calls.map((call) => call.status), ["First", "Second"]);
});

test("requestLlmLeadIntelligence sends a sanitized chronological payload to Gemini", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  mockGeminiResponse(JSON.stringify({ ok: true }));

  const lead = createLead({
    calls: [
      { callingDate: "2026-09-03T09:00:00.000Z", status: "Second" },
      { callingDate: "2026-09-01T09:00:00.000Z", status: "First" },
    ],
  });

  const response = await requestLlmLeadIntelligence(lead);
  assert.deepEqual(response, { value: { ok: true }, model: "gemini-3.7-flash" });

  const { url, options } = mockGeminiResponse.lastRequest;
  assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  assert.equal(options.headers.Authorization, "Bearer test-gemini-key");

  const body = JSON.parse(options.body);
  const payload = JSON.parse(body.messages[1].content);
  assert.equal(payload.lead.customerName, undefined);
  assert.equal(payload.lead.customerNumber, undefined);
  assert.deepEqual(payload.calls.map((call) => call.status), ["First", "Second"]);
});

test("missing GEMINI_API_KEY falls back to deterministic analysis", async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.LLM_API_KEY;

  const lead = createLead({
    calls: [{ callingDate: "2026-09-02T10:00:00.000Z", status: "Interested", remarks: "Send details" }],
  });

  const deterministic = analyzeLeadIntelligence(lead);
  const result = await analyzeLeadWithLlm(lead);

  assert.equal(result.providerUsed, false);
  assert.equal(result.fallback, true);
  assert.equal(result.analysis.priority, deterministic.priority);
  assert.equal(result.analysis.leadScore, deterministic.leadScore);
});

test("malformed Gemini JSON falls back safely", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  mockGeminiResponse("not valid json");

  const lead = createLead({
    calls: [{ callingDate: "2026-09-02T10:00:00.000Z", status: "Interested", remarks: "Send details" }],
  });

  const result = await analyzeLeadWithLlm(lead);

  assert.equal(result.providerUsed, false);
  assert.equal(result.fallback, true);
  assert.equal(result.analysis.priority, analyzeLeadIntelligence(lead).priority);
});

test("deterministic STOP overrides an enthusiastic Gemini response", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  mockGeminiResponse(
    JSON.stringify({
      interestLevel: "Highly Interested",
      leadScore: 99,
      priority: "HOT",
      shouldCallAgain: true,
      nextBestAction: "Call Today",
      suggestedFollowUpDate: "2026-09-10T00:00:00.000Z",
      summary: "Enthusiastic response",
      reasoning: "Looks strong",
      confidence: 99,
    }),
  );

  const lead = createLead({
    calls: [{ callingDate: "2026-09-02T10:00:00.000Z", status: "Do Not Call", remarks: "Please stop calling" }],
  });

  const result = await analyzeLeadWithLlm(lead);

  assert.equal(result.providerUsed, true);
  assert.equal(result.analysis.priority, "STOP");
  assert.equal(result.analysis.nextBestAction, "Do Not Call");
  assert.equal(result.analysis.shouldCallAgain, false);
});

test("explicit follow-up dates from lead history are preserved", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  mockGeminiResponse(
    JSON.stringify({
      interestLevel: "Interested",
      leadScore: 82,
      priority: "WARM",
      shouldCallAgain: true,
      nextBestAction: "Follow Up",
      suggestedFollowUpDate: "2026-12-25T00:00:00.000Z",
      summary: "Different date from model",
      reasoning: "Different date from model",
      confidence: 88,
    }),
  );

  const lead = createLead({
    calls: [
      {
        callingDate: "2026-09-02T10:00:00.000Z",
        status: "Interested",
        remarks: "Call me Friday",
        followUpDate: "2026-09-12T12:00:00.000Z",
      },
    ],
  });

  const deterministic = analyzeLeadIntelligence(lead);
  const result = await analyzeLeadWithLlm(lead);

  assert.equal(result.analysis.suggestedFollowUpDate, deterministic.suggestedFollowUpDate);
  assert.notEqual(result.analysis.suggestedFollowUpDate, "2026-12-25");
});

test("invalid Gemini intelligence falls back to deterministic analysis", async () => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  mockGeminiResponse(
    JSON.stringify({
      interestLevel: "Interested",
      leadScore: 500,
      priority: "HOT",
      shouldCallAgain: true,
      nextBestAction: "Call Today",
      suggestedFollowUpDate: null,
      summary: "Invalid score should fail",
      reasoning: "Invalid score should fail",
      confidence: 88,
    }),
  );

  const lead = createLead({
    calls: [{ callingDate: "2026-09-02T10:00:00.000Z", status: "Interested", remarks: "Send details" }],
  });

  const deterministic = analyzeLeadIntelligence(lead);
  const result = await analyzeLeadWithLlm(lead);

  assert.equal(result.providerUsed, false);
  assert.equal(result.fallback, true);
  assert.equal(result.analysis.priority, deterministic.priority);
  assert.equal(result.analysis.leadScore, deterministic.leadScore);
});
