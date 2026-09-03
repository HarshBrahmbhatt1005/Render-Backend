import { buildLeadFingerprint } from "../MIS-Intigration2-main/src/utils/leadIntelligence.js";

const normalizeText = (value) => String(value || "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();

const safeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const stripTime = (value) => {
  const date = safeDate(value);
  if (!date) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (value) => {
  const date = stripTime(value);
  return date ? date.toISOString().split("T")[0] : "";
};

const formatDashboardDate = (value) => {
  const date = safeDate(value);
  if (!date) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDisplayDate = (value) => {
  const key = toDateKey(value);
  if (!key) return "N/A";
  const todayKey = toDateKey(new Date());
  if (key === todayKey) return "Today";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (key === toDateKey(tomorrow)) return "Tomorrow";
  return key.split("-").reverse().join("-");
};

const daysBetween = (from, to) => {
  const a = stripTime(from);
  const b = stripTime(to);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

const normalizePriority = (value) => {
  const priority = normalizeText(value).toUpperCase();
  return ["HOT", "WARM", "COLD", "LOW", "STOP"].includes(priority) ? priority : "";
};

const normalizeAction = (value) => {
  const action = normalizeLower(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!action) return "";
  if (action === "call today") return "CALL_TODAY";
  if (action === "call tomorrow") return "CALL_TOMORROW";
  if (action === "follow up") return "FOLLOW_UP";
  if (action === "call later") return "CALL_LATER";
  if (action === "do not call") return "DO_NOT_CALL";
  if (action === "review required") return "REVIEW_REQUIRED";
  return action.toUpperCase().replace(/\s+/g, "_");
};

const normalizeInterest = (value) => {
  const interest = normalizeText(value).toUpperCase();
  if (interest === "VERY LOW") return "LOW";
  if (interest === "NONE") return "LOW";
  if (["HIGH", "MEDIUM", "LOW"].includes(interest)) return interest;
  return "";
};

const getLatestCall = (calls = []) => {
  return [...(calls || [])]
    .map((call, index) => ({
      ...call,
      __index: index,
      __callDate: stripTime(call?.callingDate)?.getTime() ?? Number.NEGATIVE_INFINITY,
    }))
    .sort((a, b) => {
      if (a.__callDate !== b.__callDate) return a.__callDate - b.__callDate;
      return a.__index - b.__index;
    })
    .at(-1) || null;
};

const getRelevantFollowUpDate = (lead) => {
  const calls = [...(lead?.calls || [])]
    .map((call, index) => ({
      ...call,
      __index: index,
      __callDate: stripTime(call?.callingDate)?.getTime() ?? Number.NEGATIVE_INFINITY,
    }))
    .sort((a, b) => {
      if (a.__callDate !== b.__callDate) return a.__callDate - b.__callDate;
      return a.__index - b.__index;
    });

  for (let i = calls.length - 1; i >= 0; i -= 1) {
    const date = toDateKey(calls[i]?.followUpDate);
    if (date) return { date, source: "call" };
  }

  const suggested = toDateKey(lead?.aiIntelligence?.suggestedFollowUpDate);
  if (suggested) return { date: suggested, source: "ai" };

  return { date: "", source: "" };
};

const getTelecallerName = (lead) => {
  const submittedBy = normalizeText(lead?.submittedByDisplayName || lead?.submittedByUsername);
  const assignedManager = normalizeText(lead?.assignedManager);
  const latestCall = getLatestCall(lead?.calls || []);
  const latestCaller = normalizeText(latestCall?.callerName || latestCall?.manager);
  const firstCall = lead?.calls?.[0];
  const firstCaller = normalizeText(firstCall?.callerName || firstCall?.manager);

  return assignedManager || latestCaller || firstCaller || submittedBy || "Unassigned";
};

const normalizeAnalysis = (lead) => {
  const ai = lead?.aiIntelligence || null;
  const fingerprint = buildLeadFingerprint(lead || {});
  const sourceFingerprint = normalizeText(ai?.sourceFingerprint);
  const hasAnalysis = Boolean(ai);
  const isFingerprintStale = Boolean(ai && sourceFingerprint && sourceFingerprint !== fingerprint);
  const isStale = Boolean(ai?.isStale || ai?.outdated || isFingerprintStale);
  const priority = normalizePriority(ai?.priority);
  const action = normalizeAction(ai?.recommendedNextAction || ai?.nextBestAction);
  const interestLevel = normalizeInterest(ai?.interestLevel);
  const score = Number(ai?.leadScore);
  const confidence = Number(ai?.confidence);
  const lastAnalyzedAt = safeDate(ai?.lastAnalyzedAt);
  const summary = normalizeText(ai?.shortSummary || ai?.summary);
  const reasoning = normalizeText(ai?.reason || ai?.reasoning);

  return {
    hasAnalysis,
    isStale,
    priority: priority || (hasAnalysis ? "LOW" : ""),
    recommendedNextAction: action || "",
    interestLevel: interestLevel || "",
    leadScore: Number.isFinite(score) ? score : null,
    confidence: Number.isFinite(confidence) ? confidence : null,
    lastAnalyzedAt: lastAnalyzedAt ? lastAnalyzedAt.toISOString() : "",
    summary,
    reasoning,
    sourceFingerprint: sourceFingerprint || fingerprint,
  };
};

const resolveAnalysisStatus = (ai) => {
  if (!ai.hasAnalysis) return "NOT_ANALYZED";
  if (ai.isStale) return "NEEDS_REANALYSIS";
  return "ANALYZED";
};

const resolveQueueBucket = (lead) => {
  const ai = lead.ai;
  if (ai.priority === "STOP" || ai.recommendedNextAction === "DO_NOT_CALL") return "DO_NOT_CALL";
  if (ai.isStale) return "NEEDS_REANALYSIS";

  if (lead.isCallNow) return "CALL_NOW";
  if (lead.isFollowUpToday) return "FOLLOW_UP_TODAY";
  if (ai.recommendedNextAction === "CALL_TOMORROW" || lead.followUpDateKey === lead.tomorrowKey) return "CALL_TOMORROW";
  if (ai.recommendedNextAction === "CALL_LATER" || ai.priority === "COLD" || ai.priority === "LOW") return "CALL_LATER";
  return "CALL_LATER";
};

const resolvePriorityBucket = (lead) => {
  const ai = lead.ai;
  if (ai.priority === "STOP" || ai.recommendedNextAction === "DO_NOT_CALL") return 9;
  if (ai.isStale) return 10;
  if (ai.priority === "HOT" && lead.isCallNow) return 0;
  if (ai.priority === "HOT" && lead.isFollowUpToday) return 1;
  if (ai.priority === "WARM" && lead.isCallNow) return 2;
  if (ai.priority === "HOT") return 3;
  if (ai.priority === "WARM") return 4;
  if (lead.isOverdueFollowUp) return 5;
  if (ai.recommendedNextAction === "CALL_TOMORROW") return 6;
  if (ai.recommendedNextAction === "CALL_LATER") return 7;
  if (ai.priority === "COLD") return 8;
  if (ai.priority === "LOW") return 8;
  return 8;
};

const buildDashboardLeadRecord = (lead, now = new Date()) => {
  const ai = normalizeAnalysis(lead);
  const latestCall = getLatestCall(lead?.calls || []);
  const followUp = getRelevantFollowUpDate(lead);
  const todayKey = toDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);
  const followUpDateKey = followUp.date;
  const followUpDays = followUpDateKey ? daysBetween(todayKey, followUpDateKey) : null;
  const isStop = ai.priority === "STOP" || ai.recommendedNextAction === "DO_NOT_CALL";
  const isCallToday = !isStop && (ai.recommendedNextAction === "CALL_TODAY" || followUpDateKey === todayKey);
  const isFollowUpToday = !isStop && followUpDateKey === todayKey;
  const isOverdueFollowUp = !isStop && Boolean(followUpDateKey) && followUpDateKey < todayKey;
  const daysOverdue = isOverdueFollowUp ? Math.abs(followUpDays || 0) : 0;
  const recentPositiveEngagement = Boolean(
    ai.summary ||
    ai.reasoning ||
    ai.recommendedNextAction === "FOLLOW_UP" ||
    ai.recommendedNextAction === "CALL_TODAY" ||
    ai.recommendedNextAction === "CALL_TOMORROW"
  );

  return {
    id: String(lead?._id || ""),
    customerName: normalizeText(lead?.customerName),
    customerNumber: normalizeText(lead?.customerNumber),
    leadType: normalizeText(lead?.leadType || "realestate").toLowerCase(),
    leadTypeLabel: normalizeText(lead?.leadType || "realestate").toLowerCase() === "finance" ? "Finance" : "Real Estate",
    leadDate: toDateKey(lead?.leadDate),
    source: normalizeText(lead?.source),
    projectName: normalizeText(lead?.projectName),
    referenceOf: normalizeText(lead?.referenceOf),
    assignedManager: normalizeText(lead?.assignedManager),
    propertyType: normalizeText(lead?.propertyType),
    budget: normalizeText(lead?.budget),
    preferredArea: normalizeText(lead?.preferredArea),
    residentialSize: normalizeText(lead?.residentialSize),
    residentialCategory: normalizeText(lead?.residentialCategory),
    commercialType: normalizeText(lead?.commercialType),
    financeProduct: normalizeText(lead?.financeProduct),
    loanAmount: normalizeText(lead?.loanAmount),
    passedOn: normalizeText(lead?.passedOn),
    submittedByDisplayName: normalizeText(lead?.submittedByDisplayName),
    submittedByUsername: normalizeText(lead?.submittedByUsername),
    callCount: Array.isArray(lead?.calls) ? lead.calls.length : 0,
    latestCall: latestCall
      ? {
          callingDate: toDateKey(latestCall.callingDate),
          callerName: normalizeText(latestCall.callerName || latestCall.manager),
          status: normalizeText(latestCall.status),
          remarks: normalizeText(latestCall.remarks),
          followUpDate: toDateKey(latestCall.followUpDate),
          visitDate: toDateKey(latestCall.visitDate),
          visitRemark: normalizeText(latestCall.visitRemark),
        }
      : null,
    followUpDateKey,
    followUpSource: followUp.source,
    followUpDisplay: formatDisplayDate(followUpDateKey),
    isCallNow: isCallToday || (ai.priority === "HOT" && ai.recommendedNextAction === "CALL_TODAY"),
    isCallToday,
    isFollowUpToday,
    isOverdueFollowUp,
    daysOverdue,
    recentPositiveEngagement,
    telecallerName: getTelecallerName(lead),
    ai,
    analysisStatus: resolveAnalysisStatus(ai),
    queueBucket: "",
    priorityBucket: 8,
    searchIndex: [
      lead?.customerName,
      lead?.customerNumber,
      lead?.source,
      lead?.projectName,
      lead?.referenceOf,
      lead?.assignedManager,
      lead?.submittedByDisplayName,
      lead?.submittedByUsername,
      latestCall?.callerName,
      latestCall?.status,
      ai.summary,
      ai.reasoning,
      ai.priority,
      ai.interestLevel,
      ai.recommendedNextAction,
    ]
      .map(normalizeLower)
      .filter(Boolean)
      .join(" | "),
    todayKey,
    tomorrowKey,
  };
};

const matchesSearch = (record, search) => {
  const term = normalizeLower(search);
  if (!term) return true;

  const digits = term.replace(/\D/g, "");
  if (digits && record.customerNumber.includes(digits)) return true;

  return record.searchIndex.includes(term) || record.customerName.toLowerCase().includes(term);
};

const matchesDateRange = (record, filters) => {
  const { dateFrom, dateTo, dateScope } = filters;
  if (!dateFrom && !dateTo) return true;

  const from = dateFrom ? stripTime(dateFrom) : null;
  const to = dateTo ? stripTime(dateTo) : null;
  const leadDate = record.leadDate ? stripTime(record.leadDate) : null;
  const followUpDate = record.followUpDateKey ? stripTime(record.followUpDateKey) : null;

  const inRange = (date) => {
    if (!date) return false;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };

  if (dateScope === "LEAD_DATE") return inRange(leadDate);
  if (dateScope === "FOLLOW_UP_DATE") return inRange(followUpDate);
  if (dateScope === "EITHER") return inRange(leadDate) || inRange(followUpDate);
  return inRange(leadDate) || inRange(followUpDate);
};

const matchesDashboardFilters = (record, filters = {}) => {
  const leadType = normalizeText(filters.leadType || "All");
  const priority = normalizeText(filters.priority || "All").toUpperCase();
  const action = normalizeAction(filters.action || "All");
  const interestLevel = normalizeInterest(filters.interestLevel || "All");
  const analysisStatus = normalizeText(filters.analysisStatus || "All").toUpperCase().replace(/\s+/g, "_");
  const telecaller = normalizeText(filters.telecaller || "All");
  const search = normalizeText(filters.search || "");

  if (leadType !== "All" && record.leadType !== leadType.toLowerCase()) return false;
  if (priority !== "All" && record.ai.priority !== priority) return false;
  if (action !== "ALL" && record.ai.recommendedNextAction !== action) return false;
  if (interestLevel && normalizeInterest(record.ai.interestLevel) !== interestLevel) return false;

  if (analysisStatus !== "ALL") {
    if (analysisStatus === "ANALYZED" && record.analysisStatus !== "ANALYZED") return false;
    if (analysisStatus === "NEEDS_REANALYSIS" && record.analysisStatus !== "NEEDS_REANALYSIS") return false;
    if (analysisStatus === "NOT_ANALYZED" && record.analysisStatus !== "NOT_ANALYZED") return false;
  }

  if (telecaller !== "All" && record.telecallerName !== telecaller) return false;
  if (search && !matchesSearch(record, search)) return false;
  if (!matchesDateRange(record, filters)) return false;

  return true;
};

const comparePriorityLeads = (a, b) => {
  if (a.priorityBucket !== b.priorityBucket) return a.priorityBucket - b.priorityBucket;
  if ((b.ai.leadScore ?? -1) !== (a.ai.leadScore ?? -1)) return (b.ai.leadScore ?? -1) - (a.ai.leadScore ?? -1);
  if ((a.daysOverdue ?? 0) !== (b.daysOverdue ?? 0)) return (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0);
  const aDate = a.followUpDateKey || a.latestCall?.callingDate || a.leadDate || "";
  const bDate = b.followUpDateKey || b.latestCall?.callingDate || b.leadDate || "";
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  return a.customerName.localeCompare(b.customerName);
};

const buildQuickInsights = (summary) => {
  const insights = [];

  if (summary.hotCount > 0) {
    insights.push(`You have ${summary.hotCount} HOT leads requiring attention.`);
  }
  if (summary.callTodayCount > 0) {
    insights.push(`${summary.callTodayCount} leads are ready to call today.`);
  }
  if (summary.followUpsTodayCount > 0) {
    insights.push(`${summary.followUpsTodayCount} follow-ups are due today.`);
  }
  if (summary.overdueFollowUpsCount > 0) {
    insights.push(`${summary.overdueFollowUpsCount} leads have overdue follow-ups.`);
  }
  if (summary.needsReanalysisCount > 0) {
    insights.push(`${summary.needsReanalysisCount} leads need AI re-analysis after new call activity.`);
  }
  if (summary.doNotCallCount > 0) {
    insights.push(`${summary.doNotCallCount} leads are marked Do Not Call.`);
  }
  if (summary.notAnalyzedCount > 0) {
    insights.push(`${summary.notAnalyzedCount} leads have not been analyzed yet.`);
  }

  return insights.slice(0, 6);
};

const buildDashboardPayload = (leads = [], filters = {}, now = new Date()) => {
  const records = leads.map((lead) => buildDashboardLeadRecord(lead, now));
  const visible = records.filter((record) => matchesDashboardFilters(record, filters));
  const actionable = visible.filter((record) => (
    !record.ai.isStale &&
    record.ai.priority !== "STOP" &&
    record.ai.recommendedNextAction !== "DO_NOT_CALL"
  ));

  const hotCount = visible.filter((record) => record.ai.priority === "HOT").length;
  const warmCount = visible.filter((record) => record.ai.priority === "WARM").length;
  const coldCount = visible.filter((record) => record.ai.priority === "COLD").length;
  const stopCount = visible.filter((record) => record.ai.priority === "STOP" || record.ai.recommendedNextAction === "DO_NOT_CALL").length;
  const callTodayCount = visible.filter((record) => record.isCallToday && record.ai.priority !== "STOP").length;
  const staleCount = visible.filter((record) => record.ai.isStale).length;
  const notAnalyzedCount = visible.filter((record) => record.analysisStatus === "NOT_ANALYZED").length;
  const analyzedCount = visible.filter((record) => record.analysisStatus === "ANALYZED").length;
  const needsReanalysisCount = visible.filter((record) => record.analysisStatus === "NEEDS_REANALYSIS").length;
  const followUpsTodayCount = visible.filter((record) => record.isFollowUpToday && record.ai.priority !== "STOP").length;
  const overdueFollowUpsCount = visible.filter((record) => record.isOverdueFollowUp).length;

  const queue = {
    CALL_NOW: [],
    FOLLOW_UP_TODAY: [],
    CALL_TOMORROW: [],
    CALL_LATER: [],
    DO_NOT_CALL: [],
    NEEDS_REANALYSIS: [],
  };

  actionable.forEach((record) => {
    record.queueBucket = resolveQueueBucket(record);
    record.priorityBucket = resolvePriorityBucket(record);
    if (!queue[record.queueBucket]) queue[record.queueBucket] = [];
    queue[record.queueBucket].push(record);
  });

  Object.keys(queue).forEach((bucket) => {
    queue[bucket].sort(comparePriorityLeads);
  });

  const priorityCallingList = actionable
    .filter((record) => record.analysisStatus !== "NEEDS_REANALYSIS" || record.ai.recommendedNextAction === "CALL_TODAY")
    .filter((record) => record.ai.priority !== "STOP")
    .sort(comparePriorityLeads)
    .slice(0, 100);

  const overdueFollowUps = visible
    .filter((record) => record.isOverdueFollowUp && !record.ai.isStale)
    .sort((a, b) => {
      const aPriority = a.ai.priority === "HOT" ? 0 : a.ai.priority === "WARM" ? 1 : 2;
      const bPriority = b.ai.priority === "HOT" ? 0 : b.ai.priority === "WARM" ? 1 : 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      if ((b.ai.leadScore ?? -1) !== (a.ai.leadScore ?? -1)) return (b.ai.leadScore ?? -1) - (a.ai.leadScore ?? -1);
      return (b.daysOverdue || 0) - (a.daysOverdue || 0);
    });

  const staleAnalyses = visible
    .filter((record) => record.analysisStatus === "NEEDS_REANALYSIS")
    .sort(comparePriorityLeads);

  const telecallerMap = new Map();
  visible.forEach((record) => {
    const key = record.telecallerName || "Unassigned";
    const entry = telecallerMap.get(key) || {
      telecallerName: key,
      totalLeadsHandled: 0,
      callsMade: 0,
      hotLeads: 0,
      followUpsDue: 0,
      pendingCalls: 0,
    };

    entry.totalLeadsHandled += 1;
    entry.callsMade += record.callCount;
    if (record.ai.priority === "HOT") entry.hotLeads += 1;
    if (record.isFollowUpToday || record.isOverdueFollowUp) entry.followUpsDue += 1;
    if (record.queueBucket !== "DO_NOT_CALL" && record.analysisStatus !== "NEEDS_REANALYSIS") entry.pendingCalls += 1;
    telecallerMap.set(key, entry);
  });

  const telecallerOverview = Array.from(telecallerMap.values()).sort((a, b) => {
    if (b.totalLeadsHandled !== a.totalLeadsHandled) return b.totalLeadsHandled - a.totalLeadsHandled;
    return a.telecallerName.localeCompare(b.telecallerName);
  });

  const latestActivity = visible.reduce((latest, record) => {
    const dates = [
      record.latestCall?.callingDate,
      record.ai.lastAnalyzedAt,
      record.followUpDateKey,
      record.leadDate,
    ]
      .map(safeDate)
      .filter(Boolean);
    const newest = dates.sort((a, b) => b - a)[0];
    if (!newest) return latest;
    if (!latest) return newest;
    return newest > latest ? newest : latest;
  }, null);

  const summary = {
    totalLeads: visible.length,
    actionableLeads: actionable.length,
    hotCount,
    warmCount,
    coldCount,
    stopCount,
    callTodayCount,
    staleCount,
    notAnalyzedCount,
    analyzedCount,
    needsReanalysisCount,
    followUpsTodayCount,
    overdueFollowUpsCount,
    callNowCount: queue.CALL_NOW.length,
    callTomorrowCount: queue.CALL_TOMORROW.length,
    callLaterCount: queue.CALL_LATER.length,
    doNotCallCount: queue.DO_NOT_CALL.length,
    latestActivity: latestActivity ? latestActivity.toISOString() : "",
  };

  return {
    generatedAt: new Date(now).toISOString(),
    lastUpdatedAt: summary.latestActivity || new Date(now).toISOString(),
    summary,
    quickInsights: buildQuickInsights(summary),
    priorityCallingList,
    smartCallQueue: {
      CALL_NOW: queue.CALL_NOW,
      FOLLOW_UP_TODAY: queue.FOLLOW_UP_TODAY,
      CALL_TOMORROW: queue.CALL_TOMORROW,
      CALL_LATER: queue.CALL_LATER,
      DO_NOT_CALL: queue.DO_NOT_CALL,
      NEEDS_REANALYSIS: staleAnalyses,
    },
    overdueFollowUps,
    staleAnalyses,
    telecallerOverview,
    leads: visible,
    counts: summary,
    filters,
    availableFilters: {
      leadTypes: Array.from(new Set(visible.map((record) => record.leadType))).sort(),
      telecallers: Array.from(new Set(visible.map((record) => record.telecallerName))).sort((a, b) => a.localeCompare(b)),
      priorities: ["All", "HOT", "WARM", "COLD", "LOW", "STOP"],
      actions: ["All", "CALL_TODAY", "CALL_TOMORROW", "FOLLOW_UP", "CALL_LATER", "DO_NOT_CALL"],
      interestLevels: ["All", "HIGH", "MEDIUM", "LOW"],
      analysisStatuses: ["All", "Analyzed", "Needs Re-analysis", "Not Analyzed"],
      dateScopes: ["Lead Date", "Follow-up Date", "Either"],
    },
    meta: {
      focusableCounts: {
        hot: hotCount,
        warm: warmCount,
        cold: coldCount,
        stop: stopCount,
        callToday: callTodayCount,
        stale: staleCount,
      },
    },
  };
};

export {
  buildDashboardLeadRecord,
  buildDashboardPayload,
  buildQuickInsights,
  comparePriorityLeads,
  formatDashboardDate,
  formatDisplayDate,
  matchesDashboardFilters,
  normalizeAction,
  normalizeInterest,
  normalizePriority,
  resolveAnalysisStatus,
};
