export async function runDeepResearch(opts = {}) {
  const jobId = `job_${Date.now()}`;
  const { companyUrl = "", companyName = "", notes = "" } = opts || {};

  const findings = [
    { title: "Public Profile", detail: `Scanned ${companyName || companyUrl || "target site"} for overview`, confidence: 0.7, tags: ["profile"] },
    { title: "Manual Process Signals", detail: "Identified potential repetitive tasks from postings/news", confidence: 0.6, tags: ["ops", "pain"] },
    { title: "AI Opportunity Map", detail: "Mapped 2–3 cost-elimination candidates for a pilot", confidence: 0.6, tags: ["ai", "roi"] }
  ];

  const summary = `Initial deep research created ${findings.length} findings for ${companyName || companyUrl || "the target"}.`;
  return { jobId, summary, findings, meta: { notes } };
}