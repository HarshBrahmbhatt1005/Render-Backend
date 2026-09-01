const text = (value) => String(value ?? "").trim();

const dateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const normalizePriority = (value) => {
  const priority = text(value).toUpperCase();
  return ["HOT", "WARM", "COLD", "LOW", "STOP"].includes(priority) ? priority : "";
};

const normalizeAction = (value) => {
  const action = text(value).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return {
    "call today": "CALL_TODAY",
    "call tomorrow": "CALL_TOMORROW",
    "follow up": "FOLLOW_UP",
    "call later": "CALL_LATER",
    "do not call": "DO_NOT_CALL",
    "review required": "REVIEW_REQUIRED",
  }[action] || (action ? action.toUpperCase().replace(/\s+/g, "_") : "");
};

const latestCall = (calls) => (Array.isArray(calls) ? calls : [])
  .map((call, index) => ({ call: call || {}, index }))
  .sort((a, b) => dateKey(a.call.callingDate).localeCompare(dateKey(b.call.callingDate)) || a.index - b.index)
  .at(-1)?.call || null;

const followUpDate = (lead) => {
  const calls = Array.isArray(lead?.calls) ? lead.calls : [];
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const date = dateKey(calls[index]?.followUpDate);
    if (date) return date;
  }
  return dateKey(lead?.aiIntelligence?.suggestedFollowUpDate);
};

const buildDashboardLeadRecord = (lead = {}, today = dateKey(new Date())) => {
  const ai = lead.aiIntelligence && typeof lead.aiIntelligence === "object" ? lead.aiIntelligence : {};
  const priority = normalizePriority(ai.priority);
  const action = normalizeAction(ai.recommendedNextAction || ai.nextBestAction);
  const followUp = followUpDate(lead);
  const isStop = priority === "STOP" || action === "DO_NOT_CALL";
  const stale = Boolean(ai.isStale || ai.outdated);
  const analyzed = Boolean(lead.aiIntelligence);
  const callToday = !isStop && (action === "CALL_TODAY" || followUp === today);
  const overdue = !isStop && followUp && followUp < today;
  const lastCall = latestCall(lead.calls);
  const caller = text(lead.assignedManager || lastCall?.callerName || lastCall?.manager || lead.submittedByDisplayName || lead.submittedByUsername) || "Unassigned";
  const analysisStatus = !analyzed ? "NOT_ANALYZED" : stale ? "NEEDS_REANALYSIS" : "ANALYZED";

  return {
    id: text(lead._id),
    customerName: text(lead.customerName) || "Unknown Customer",
    customerNumber: text(lead.customerNumber),
    leadType: text(lead.leadType || "realestate").toLowerCase(),
    leadTypeLabel: text(lead.leadType).toLowerCase() === "finance" ? "Finance" : "Real Estate",
    leadDate: dateKey(lead.leadDate),
    source: text(lead.source),
    projectName: text(lead.projectName),
    referenceOf: text(lead.referenceOf),
    assignedManager: text(lead.assignedManager),
    callCount: Array.isArray(lead.calls) ? lead.calls.length : 0,
    latestCall: lastCall ? { callingDate: dateKey(lastCall.callingDate), callerName: text(lastCall.callerName || lastCall.manager), status: text(lastCall.status), remarks: text(lastCall.remarks), followUpDate: dateKey(lastCall.followUpDate) } : null,
    followUpDateKey: followUp,
    followUpDisplay: followUp || "N/A",
    isCallToday: callToday,
    isCallNow: callToday,
    isOverdueFollowUp: Boolean(overdue),
    daysOverdue: overdue ? Math.max(1, Math.round((new Date(today) - new Date(followUp)) / 86400000)) : 0,
    telecallerName: caller,
    analysisStatus,
    queueBucket: isStop ? "DO_NOT_CALL" : stale ? "NEEDS_REANALYSIS" : callToday ? "CALL_NOW" : action === "CALL_TOMORROW" ? "CALL_TOMORROW" : "CALL_LATER",
    ai: {
      leadScore: Number.isFinite(Number(ai.leadScore)) ? Number(ai.leadScore) : null,
      priority: priority || (analyzed ? "LOW" : ""),
      interestLevel: text(ai.interestLevel).toUpperCase(),
      recommendedNextAction: action,
      nextBestAction: action,
      isStale: stale,
      lastAnalyzedAt: dateKey(ai.lastAnalyzedAt),
      confidence: Number.isFinite(Number(ai.confidence)) ? Number(ai.confidence) : null,
      summary: text(ai.shortSummary || ai.summary),
      reasoning: text(ai.reason || ai.reasoning),
    },
  };
};

const buildDashboardPayload = (leads = [], filters = {}) => {
  const records = (Array.isArray(leads) ? leads : []).map((lead) => buildDashboardLeadRecord(lead));
  const visible = records.filter((lead) => {
    if (filters.leadType && filters.leadType !== "All" && lead.leadType !== text(filters.leadType).toLowerCase()) return false;
    if (filters.priority && filters.priority !== "All" && lead.ai.priority !== text(filters.priority).toUpperCase()) return false;
    if (filters.action && filters.action !== "All" && lead.ai.recommendedNextAction !== normalizeAction(filters.action)) return false;
    if (filters.analysisStatus && filters.analysisStatus !== "All" && lead.analysisStatus !== text(filters.analysisStatus).toUpperCase().replace(/\s+/g, "_")) return false;
    if (filters.telecaller && filters.telecaller !== "All" && lead.telecallerName !== filters.telecaller) return false;
    if (filters.search) {
      const search = text(filters.search).toLowerCase();
      if (![lead.customerName, lead.customerNumber, lead.source, lead.projectName, lead.telecallerName].some((value) => text(value).toLowerCase().includes(search))) return false;
    }
    return true;
  });
  const count = (predicate) => visible.filter(predicate).length;
  const summary = {
    totalLeads: visible.length,
    analyzedCount: count((lead) => lead.analysisStatus === "ANALYZED"),
    notAnalyzedCount: count((lead) => lead.analysisStatus === "NOT_ANALYZED"),
    needsReanalysisCount: count((lead) => lead.analysisStatus === "NEEDS_REANALYSIS"),
    staleCount: count((lead) => lead.ai.isStale),
    hotCount: count((lead) => lead.ai.priority === "HOT"),
    warmCount: count((lead) => lead.ai.priority === "WARM"),
    coldCount: count((lead) => lead.ai.priority === "COLD"),
    stopCount: count((lead) => lead.ai.priority === "STOP" || lead.ai.recommendedNextAction === "DO_NOT_CALL"),
    callTodayCount: count((lead) => lead.isCallToday),
    followUpsTodayCount: count((lead) => lead.isCallToday),
    overdueFollowUpsCount: count((lead) => lead.isOverdueFollowUp),
  };
  const actionable = visible.filter((lead) => !lead.ai.isStale && lead.ai.priority !== "STOP" && lead.ai.recommendedNextAction !== "DO_NOT_CALL");
  const queue = { CALL_NOW: [], FOLLOW_UP_TODAY: [], CALL_TOMORROW: [], CALL_LATER: [], DO_NOT_CALL: [], NEEDS_REANALYSIS: visible.filter((lead) => lead.ai.isStale) };
  actionable.forEach((lead) => queue[lead.queueBucket].push(lead));
  const sort = (a, b) => (b.ai.leadScore || -1) - (a.ai.leadScore || -1);
  Object.values(queue).forEach((items) => items.sort(sort));
  return {
    generatedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    summary: { ...summary, actionableLeads: actionable.length, callNowCount: queue.CALL_NOW.length, callTomorrowCount: queue.CALL_TOMORROW.length, callLaterCount: queue.CALL_LATER.length, doNotCallCount: queue.DO_NOT_CALL.length },
    counts: summary,
    quickInsights: [],
    priorityCallingList: actionable.sort(sort).slice(0, 100),
    smartCallQueue: queue,
    overdueFollowUps: visible.filter((lead) => lead.isOverdueFollowUp && !lead.ai.isStale).sort(sort),
    staleAnalyses: visible.filter((lead) => lead.analysisStatus === "NEEDS_REANALYSIS").sort(sort),
    telecallerOverview: [],
    leads: visible,
    filters,
    availableFilters: { leadTypes: [...new Set(visible.map((lead) => lead.leadType))], telecallers: [...new Set(visible.map((lead) => lead.telecallerName))], priorities: ["All", "HOT", "WARM", "COLD", "LOW", "STOP"], actions: ["All", "CALL_TODAY", "CALL_TOMORROW", "FOLLOW_UP", "CALL_LATER", "DO_NOT_CALL"], interestLevels: ["All", "HIGH", "MEDIUM", "LOW"], analysisStatuses: ["All", "Analyzed", "Needs Re-analysis", "Not Analyzed"], dateScopes: ["Lead Date", "Follow-up Date", "Either"] },
  };
};

export { buildDashboardLeadRecord, buildDashboardPayload };
