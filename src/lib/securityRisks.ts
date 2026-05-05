// Detect credential / security-related risks from a PageSpeed scan result
export type DetectedSecurityRisk = {
  severity: "critical" | "high" | "medium";
  title: string;
  description: string;
};

export function detectSecurityRisks(psi: any, url: string): DetectedSecurityRisk[] {
  const risks: DetectedSecurityRisk[] = [];

  // 1. No HTTPS — credentials would travel in plaintext
  if (url.startsWith("http://")) {
    risks.push({
      severity: "critical",
      title: "Site not served over HTTPS",
      description: "Credentials submitted on this site travel unencrypted and can be intercepted.",
    });
  }

  // 2. Low Best-Practices score signals security/console issues
  const bp = psi?.mobile?.bestPractices ?? psi?.desktop?.bestPractices ?? null;
  if (bp !== null && bp < 70) {
    risks.push({
      severity: "high",
      title: "Best-practices security score is low",
      description: `Best-practices score is ${bp}/100 — indicates console errors, deprecated APIs, or insecure resource loading that may expose data.`,
    });
  }

  // 3. AI suggestions / detected issues mentioning security keywords
  const issues: any[] = Array.isArray(psi?.detectedIssues) ? psi.detectedIssues : [];
  const keywords = [
    "https", "csp", "xss", "vulnerab", "credential", "password",
    "source map", "cors", "clickjack", "hsts", "secret", "token", "api key",
  ];
  for (const i of issues) {
    const haystack = `${i?.name ?? ""} ${i?.description ?? ""}`.toLowerCase();
    if (keywords.some((k) => haystack.includes(k))) {
      risks.push({
        severity: i?.severity === "critical" ? "critical" : i?.severity === "high" ? "high" : "medium",
        title: i.name,
        description: (i.description || "").slice(0, 240),
      });
    }
  }

  // Dedupe by title
  const seen = new Set<string>();
  return risks.filter((r) => (seen.has(r.title) ? false : (seen.add(r.title), true)));
}
