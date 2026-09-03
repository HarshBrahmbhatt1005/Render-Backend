const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 20000;

const toIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const buildSanitizedLeadIntelligenceInput = (lead) => ({
  lead: {
    leadDate: toIsoDate(lead.leadDate),
    source: lead.source || "",
    projectName: lead.projectName || "",
    referenceOf: lead.referenceOf || "",
    leadType: lead.leadType || "realestate",
    financeProduct: lead.financeProduct || "",
    loanAmount: lead.loanAmount || "",
    passedOn: lead.passedOn || "",
    propertyType: lead.propertyType || "",
    budget: lead.budget || "",
    preferredArea: lead.preferredArea || "",
    residentialSize: lead.residentialSize || "",
    residentialCategory: lead.residentialCategory || "",
    commercialType: lead.commercialType || "",
    assignedManager: lead.assignedManager || "",
    submittedByUsername: lead.submittedByUsername || "",
    submittedByDisplayName: lead.submittedByDisplayName || "",
  },
  calls: [...(lead.calls || [])]
    .sort((a, b) => new Date(a.callingDate) - new Date(b.callingDate))
    .map((call) => ({
      callingDate: toIsoDate(call.callingDate),
      callerName: call.callerName || "",
      status: call.status || "",
      remarks: call.remarks || "",
      followUpDate: toIsoDate(call.followUpDate),
      visitDate: toIsoDate(call.visitDate),
      visitRemark: call.visitRemark || "",
    })),
});

const extractJson = (body) => {
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("LLM response did not contain text content");
  const clean = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(clean);
};

export const requestLlmLeadIntelligence = async (lead) => {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return { skipped: true, reason: "LLM_API_KEY is not configured" };

  const timeoutMs = Math.max(5000, Number(process.env.LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const input = buildSanitizedLeadIntelligenceInput(lead);
  const system = [
    "You are a careful lead intelligence assistant for a sales telecaller.",
    "Analyze every call in chronological order and explain the progression from earlier calls to the latest customer intent.",
    "Classify evidence such as casual enquiry, information request, genuine interest, strong buying intent, budget or price objection, family approval, loan concern, location concern, property mismatch, documentation concern, site visit, callback commitment, delayed decision, negotiation, refusal, wrong number, and DND.",
    "Do not treat 'send details', 'will check', 'let me think', or an unspecified 'call later' as HOT by themselves.",
    "Use the combination of repeated positive signals, property preference, budget alignment, visit willingness, family discussion, specific callback commitment, urgency, negotiation, resolved objections, and call progression.",
    "Scoring framework: strong intent/progression supports a high score; genuine interest with unresolved objections supports WARM; weak or uncertain evidence supports COLD; low-quality or repeated unsuccessful evidence supports LOW. STOP is reserved for refusal, wrong number, DND, or an equivalent clear no-contact signal.",
    "HOT requires strong evidence of genuine buying intent or strong progression. WARM means genuine interest with unresolved timing or objections.",
    "Choose CALL TODAY or CALL TOMORROW only for explicit supported timing. Choose FOLLOW UP for a known valid follow-up, CALL LATER for an unclear later request, and REVIEW REQUIRED for ambiguous evidence.",
    "Return only valid JSON with exactly these keys:",
    "leadScore (0-100), priority (HOT|WARM|COLD|LOW|STOP), interestLevel (string),",
    "shouldCallAgain (boolean), nextBestAction (Call Today|Call Tomorrow|Follow Up|Call Later|Do Not Call|Review Required),",
    "suggestedFollowUpDate (ISO date or null), summary (string), reasoning (string), confidence (0-100).",
    "Never invent facts, customer statements, budgets, visits, dates, or buying intent. Claim a visit, budget, or callback only when calls[] supports it.",
    "Use the best primary interest interpretation such as Highly Interested, Interested, Considering, Low Interest, Not Interested, Call Later, Price Concern, Budget Concern, Family Discussion, Loan Concern, Visit Interested, DND, or Wrong Number.",
    "Reasoning must cite the actual lead fields or call evidence that supports the score, priority, and action.",
  ].join(" ");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(input) }],
      }),
    });
    if (!response.ok) throw new Error(`LLM provider returned HTTP ${response.status}`);
    return { value: extractJson(await response.json()), model };
  } finally {
    clearTimeout(timer);
  }
};
