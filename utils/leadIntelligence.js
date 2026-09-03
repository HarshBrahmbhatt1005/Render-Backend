const PRIORITIES = ["HOT", "WARM", "COLD", "LOW", "STOP"];
const ACTIONS = ["Call Today", "Call Tomorrow", "Follow Up", "Call Later", "Do Not Call", "Review Required"];

const NEGATIVE_STATUS_PATTERNS = [
  "ringing",
  "no answer",
  "busy",
  "call not connected",
  "not connected",
  "switched off",
  "unreachable",
  "invalid number",
  "wrong number",
  "not picked",
  "no response",
];

const POSITIVE_STATUS_PATTERNS = [
  "interested",
  "follow-up",
  "follow up",
  "reschedule",
  "schedule visit",
  "call connected",
  "connected",
  "meeting",
  "site visit",
];

const STOP_PATTERNS = [
  "don't call",
  "do not call",
  "stop calling",
  "never call",
  "no more calls",
  "remove number",
  "stop",
];

const POSITIVE_REMARK_PATTERNS = [
  "send details",
  "share details",
  "interested",
  "call me",
  "follow up",
  "callback",
  "call back",
  "meeting",
  "visit",
  "book",
  "ready",
  "discuss",
  "talk later",
];

const NEGATIVE_REMARK_PATTERNS = [
  "no answer",
  "busy",
  "not interested",
  "don't call",
  "do not call",
  "stop",
  "wrong number",
  "unreachable",
  "switched off",
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const stripTime = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (date) => {
  if (!date) return "";
  const d = stripTime(date);
  if (!d) return "";
  return d.toISOString().split("T")[0];
};

const daysBetween = (start, end) => {
  const a = stripTime(start);
  const b = stripTime(end);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

const nextWeekday = (baseDate, targetDayIndex) => {
  const date = stripTime(baseDate);
  if (!date) return null;
  const current = date.getDay();
  const delta = (targetDayIndex - current + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date;
};

const parseNaturalFollowUpDate = (text, baseDate = new Date()) => {
  const normalized = normalize(text);
  if (!normalized) return null;

  if (normalized.includes("day after tomorrow")) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + 2);
    return formatDate(date);
  }

  if (normalized.includes("tomorrow")) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + 1);
    return formatDate(date);
  }

  if (normalized.includes("today")) {
    return formatDate(baseDate);
  }

  if (normalized.includes("next week")) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + 7);
    return formatDate(date);
  }

  const weekdayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const weekdayMatch = normalized.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (weekdayMatch) {
    return formatDate(nextWeekday(baseDate, weekdayMap[weekdayMatch[1]]));
  }

  return null;
};

const parseAbsoluteDate = (text) => {
  const normalized = normalize(text);
  if (!normalized) return null;

  const isoMatch = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return formatDate(date);
  }

  const slashMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    const date = first > 12
      ? new Date(year, second - 1, first)
      : new Date(year, first - 1, second);
    return formatDate(date);
  }

  return null;
};

const extractFollowUpDate = (call, baseDate = new Date()) => {
  if (call?.followUpDate) {
    const normalized = formatDate(call.followUpDate);
    if (normalized) return normalized;
  }

  const remark = normalize(call?.remarks);
  if (!remark) return "";

  return parseNaturalFollowUpDate(remark, baseDate) || parseAbsoluteDate(remark) || "";
};

const hasAnyPattern = (text, patterns) => patterns.some((pattern) => text.includes(pattern));

const getCallText = (call) => {
  return [
    call?.status,
    call?.remarks,
    call?.visitRemark,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" | ");
};

const getCallWeight = (index, total) => {
  if (total <= 1) return 1;
  const progress = index / (total - 1);
  return 0.75 + progress * 0.25;
};

const getChronologicalCalls = (calls = []) => {
  return (calls || [])
    .map((call, originalIndex) => ({
      ...call,
      __originalIndex: originalIndex,
      __callingDateValue: stripTime(call?.callingDate)?.getTime() ?? Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => {
      if (a.__callingDateValue !== b.__callingDateValue) return a.__callingDateValue - b.__callingDateValue;
      return a.__originalIndex - b.__originalIndex;
    });
};

const buildLeadFingerprint = (lead = {}) => {
  const calls = getChronologicalCalls(lead.calls || []).map((call) => ({
    callingDate: formatDate(call.callingDate),
    callerName: normalize(call.callerName || call.manager),
    status: normalize(call.status),
    remarks: normalize(call.remarks),
    followUpDate: formatDate(call.followUpDate),
    visitDate: formatDate(call.visitDate),
    visitRemark: normalize(call.visitRemark),
  }));

  const payload = {
    leadType: normalize(lead.leadType),
    leadDate: formatDate(lead.leadDate),
    customerName: normalize(lead.customerName),
    customerNumber: normalize(lead.customerNumber),
    projectName: normalize(lead.projectName),
    source: normalize(lead.source),
    referenceOf: normalize(lead.referenceOf),
    financeProduct: normalize(lead.financeProduct),
    loanAmount: normalize(lead.loanAmount),
    passedOn: normalize(lead.passedOn),
    propertyType: normalize(lead.propertyType),
    budget: normalize(lead.budget),
    preferredArea: normalize(lead.preferredArea),
    residentialSize: normalize(lead.residentialSize),
    residentialCategory: normalize(lead.residentialCategory),
    commercialType: normalize(lead.commercialType),
    calls,
  };

  return JSON.stringify(payload);
};

const analyzeLeadIntelligence = (lead = {}, options = {}) => {
  const now = options.now || new Date();
  const chronologicalCalls = getChronologicalCalls(lead.calls || []);

  let score = 50;
  let positivePoints = 0;
  let negativePoints = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let stopDetected = false;
  let explicitNoCall = false;
  let explicitFollowUpDate = "";
  let explicitFollowUpSource = "";
  let latestFollowUpDayOffset = null;
  let latestPositiveSignal = "";
  let latestNegativeSignal = "";
  let latestExplicitSignal = "";

  chronologicalCalls.forEach((call, index) => {
    const weight = getCallWeight(index, chronologicalCalls.length);
    const text = getCallText(call);
    const status = normalize(call?.status);
    const remarks = normalize(call?.remarks);
    const visitRemark = normalize(call?.visitRemark);
    const combined = [status, remarks, visitRemark].filter(Boolean).join(" | ");
    const callFollowUpDate = extractFollowUpDate(call, now);

    if (!explicitFollowUpDate && callFollowUpDate) {
      explicitFollowUpDate = callFollowUpDate;
      explicitFollowUpSource = callFollowUpDate === formatDate(call?.followUpDate) ? "followUpDate" : "remarks";
    }

    if (hasAnyPattern(combined, STOP_PATTERNS)) {
      stopDetected = true;
      explicitNoCall = true;
      latestExplicitSignal = "stop";
      return;
    }

    const explicitPositive = hasAnyPattern(combined, POSITIVE_REMARK_PATTERNS) || hasAnyPattern(status, POSITIVE_STATUS_PATTERNS);
    const explicitNegative = hasAnyPattern(combined, NEGATIVE_REMARK_PATTERNS) || hasAnyPattern(status, NEGATIVE_STATUS_PATTERNS);

    if (explicitPositive) {
      positiveCount += 1;
      positivePoints += 12 * weight;
      latestPositiveSignal = combined || status;
    }

    if (explicitNegative) {
      negativeCount += 1;
      negativePoints += 8 * weight;
      latestNegativeSignal = combined || status;
    }

    if (callFollowUpDate) {
      const offset = daysBetween(now, callFollowUpDate);
      if (offset !== null && (latestFollowUpDayOffset === null || offset < latestFollowUpDayOffset)) {
        latestFollowUpDayOffset = offset;
        latestExplicitSignal = "followup-date";
      }
    }

    if (hasAnyPattern(combined, ["call me tomorrow", "call tomorrow", "tomorrow"])) {
      latestExplicitSignal = "tomorrow";
    }
    if (hasAnyPattern(combined, ["call me today", "call today", "today"])) {
      latestExplicitSignal = "today";
    }

    if (hasAnyPattern(combined, ["do not call", "don't call", "stop", "never call", "no more calls"])) {
      explicitNoCall = true;
    }

    if (hasAnyPattern(combined, ["interested", "send details", "share details", "follow up", "callback", "call back"])) {
      latestPositiveSignal = combined || status;
    }
  });

  if (stopDetected || explicitNoCall) {
    return {
      leadScore: 0,
      priority: "STOP",
      interestLevel: "NONE",
      shouldCallAgain: false,
      recommendedNextAction: "Do Not Call",
      suggestedFollowUpDate: "",
      shortSummary: "Customer requested no further contact or expressed a stop signal.",
      reason: latestExplicitSignal === "stop"
        ? "The call history contains stop / do-not-call language."
        : "The lead history indicates we should not continue contacting the customer.",
      confidence: 96,
      lastAnalyzedAt: now.toISOString(),
      outdated: false,
      sourceFingerprint: buildLeadFingerprint(lead),
      callCount: chronologicalCalls.length,
      signalSummary: {
        positiveCount,
        negativeCount,
        stopDetected: true,
        explicitFollowUpDate,
        explicitFollowUpSource,
      },
    };
  }

  const repeatedUnsuccessfulCalls = negativeCount >= 3 && positiveCount === 0;
  const mixedButInterested = positiveCount > 0 && negativeCount > 0;
  const explicitFollowUp = Boolean(explicitFollowUpDate);

  if (repeatedUnsuccessfulCalls) {
    score -= 18;
  }

  score += positivePoints;
  score -= negativePoints;

  if (explicitFollowUp) {
    score += 8;
  }

  if (mixedButInterested) {
    score += 4;
  }

  if (positiveCount >= 2) {
    score += 4;
  }

  if (negativeCount >= 4) {
    score -= 6;
  }

  score = clamp(Math.round(score), 0, 100);

  let priority = "COLD";
  if (score >= 80 || (positiveCount >= 2 && explicitFollowUp)) {
    priority = "HOT";
  } else if (score >= 60 || (positiveCount > 0 && score >= 50)) {
    priority = "WARM";
  } else if (score <= 25 || repeatedUnsuccessfulCalls) {
    priority = "LOW";
  }

  if (repeatedUnsuccessfulCalls && positiveCount === 0) {
    priority = score <= 20 ? "LOW" : "COLD";
  }

  const interestLevelByPriority = {
    HOT: "HIGH",
    WARM: "MEDIUM",
    COLD: "LOW",
    LOW: "VERY LOW",
    STOP: "NONE",
  };

  const shouldCallAgain = !(
    priority === "LOW" && negativeCount >= 3 && positiveCount === 0
  );

  let recommendedNextAction = "Review Required";
  if (priority === "LOW" && negativeCount >= 3 && positiveCount === 0) {
    recommendedNextAction = "Do Not Call";
  } else if (explicitFollowUpDate) {
    const offset = daysBetween(now, explicitFollowUpDate);
    if (offset === 0) {
      recommendedNextAction = "Call Today";
    } else if (offset === 1) {
      recommendedNextAction = "Call Tomorrow";
    } else {
      recommendedNextAction = "Follow Up";
    }
  } else if (positiveCount > 0 && negativeCount === 0) {
    recommendedNextAction = "Follow Up";
  } else if (negativeCount > 0 && positiveCount > 0) {
    recommendedNextAction = "Call Later";
  } else if (negativeCount >= 2) {
    recommendedNextAction = "Call Later";
  } else if (positiveCount > 0) {
    recommendedNextAction = "Follow Up";
  }

  const explicitCallToday = chronologicalCalls.some((call) => {
    const combined = getCallText(call);
    return hasAnyPattern(combined, ["call today", "today"]);
  });

  if (explicitCallToday) {
    recommendedNextAction = "Call Today";
  } else if (latestExplicitSignal === "tomorrow") {
    recommendedNextAction = "Call Tomorrow";
  }

  const suggestedFollowUpDate = explicitFollowUpDate;

  let shortSummary = "Call history shows limited intent.";
  if (priority === "HOT") {
    shortSummary = "Strong buying intent or request for follow-up is visible across the call history.";
  } else if (priority === "WARM") {
    shortSummary = "There is clear interest, but the lead needs a timely follow-up.";
  } else if (priority === "COLD") {
    shortSummary = "The lead is responsive only intermittently and needs careful follow-up.";
  } else if (priority === "LOW") {
    shortSummary = "Repeated attempts have not produced enough positive engagement.";
  }

  if (explicitFollowUpDate) {
    shortSummary = `${shortSummary} Follow-up was mentioned for ${explicitFollowUpDate}.`;
  }

  let reason = "The score was derived from the full chronological call history.";
  if (positiveCount > 0 && negativeCount > 0) {
    reason = "The lead has both positive interest signals and missed / unsuccessful calls, so the complete history was balanced before scoring.";
  } else if (positiveCount > 0) {
    reason = "Interest signals such as follow-up requests or detail requests were found in the call history.";
  } else if (negativeCount > 0) {
    reason = "The calls mostly show no-answer / busy / not-connected style outcomes.";
  }

  if (explicitFollowUpDate) {
    reason = `${reason} An explicit follow-up date was found in the lead history.`;
  }

  const confidenceBase = 58 + Math.min(20, chronologicalCalls.length * 3) + (explicitFollowUpDate ? 10 : 0);
  const confidencePenalty = (negativeCount > positiveCount ? 10 : 0) + (repeatedUnsuccessfulCalls ? 8 : 0);
  const confidence = clamp(Math.round(confidenceBase - confidencePenalty), 35, 98);

  return {
    leadScore: score,
    priority,
    interestLevel: interestLevelByPriority[priority],
    shouldCallAgain: shouldCallAgain && priority !== "STOP",
    recommendedNextAction,
    suggestedFollowUpDate,
    shortSummary,
    reason,
    confidence,
    lastAnalyzedAt: now.toISOString(),
    outdated: false,
    sourceFingerprint: buildLeadFingerprint(lead),
    callCount: chronologicalCalls.length,
    signalSummary: {
      positiveCount,
      negativeCount,
      stopDetected: false,
      explicitFollowUpDate,
      explicitFollowUpSource,
      latestPositiveSignal,
      latestNegativeSignal,
    },
    validPriorities: PRIORITIES,
    validActions: ACTIONS,
  };
};

export {
  ACTIONS as LEAD_INTELLIGENCE_ACTIONS,
  PRIORITIES as LEAD_INTELLIGENCE_PRIORITIES,
  analyzeLeadIntelligence,
  buildLeadFingerprint,
  formatDate,
  parseAbsoluteDate,
  parseNaturalFollowUpDate,
};

