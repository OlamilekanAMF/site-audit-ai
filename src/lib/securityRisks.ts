// Detect credential / security-related risks from a PageSpeed scan result
export type DetectedSecurityRisk = {
  severity: "critical" | "high" | "medium";
  title: string;
  description: string;
};

const SECURITY_AUDIT_KEYS = new Set([
  "is-on-https",
  "uses-https",
  "geolocation-on-start",
  "notification-on-start",
  "no-vulnerable-libraries",
  "csp-xss",
  "clickjacking-mitigation",
  "has-hsts",
  "origin-isolation",
  "deprecations",
  "errors-in-console",
  "valid-source-maps",
]);

const SEVERITY_BY_KEY: Record<string, "critical" | "high" | "medium"> = {
  "is-on-https": "critical",
  "uses-https": "critical",
  "no-vulnerable-libraries": "high",
  "csp-xss": "high",
  "clickjacking-mitigation": "high",
  "has-hsts": "medium",
  "origin-isolation": "medium",
  "geolocation-on-start": "medium",
  "notification-on-start": "medium",
  "deprecations": "medium",
  "valid-source-maps": "medium",
  "errors-in-console": "medium",
};

export function detectSecurityRisks(psi: any, url: string): DetectedSecurityRisk[] {
  const risks: DetectedSecurityRisk[] = [];

  // 1. HTTP (no TLS)
  if (url.startsWith("http://")) {
    risks.push({
      severity: "critical",
      title: "Site not served over HTTPS",
      description: "Credentials submitted on this site travel unencrypted and can be intercepted.",
    });
  }

  // 2. Lighthouse best-practices security audits (mobile run)
  const audits = psi?.lighthouseResult?.audits || {};
  for (const key of Object.keys(audits)) {
    if (!SECURITY_AUDIT_KEYS.has(key)) continue;
    const a = audits[key];
    if (a?.score === null || a?.score === undefined) continue;
    if (a.score >= 0.9) continue;
    risks.push({
      severity: SEVERITY_BY_KEY[key] || "medium",
      title: a.title || key,
      description: (a.description || "").replace(/\[Learn.*?\]\(.*?\)/g, "").trim().slice(0, 240),
    });
  }

  // 3. Source maps shipped to production = potential credential/secret leak
  const sourceMaps = audits["valid-source-maps"];
  if (sourceMaps && sourceMaps.score !== 1 && sourceMaps.details?.items?.length) {
    risks.push({
      severity: "high",
      title: "Source maps exposed in production",
      description: "Public source maps can leak business logic, API endpoints, and embedded credentials.",
    });
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return risks.filter((r) => (seen.has(r.title) ? false : (seen.add(r.title), true)));
}
