const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { yourUrl, competitorUrls } = await req.json();

    if (!yourUrl || !competitorUrls?.length) {
      return new Response(
        JSON.stringify({ error: "yourUrl and competitorUrls are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GOOGLE_PAGESPEED_API_KEY");
    const allUrls = [yourUrl, ...competitorUrls.slice(0, 4)];

    const fetchPsi = async (url: string) => {
      let formatted = url.trim();
      if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
        formatted = `https://${formatted}`;
      }

      const strategies = ["mobile", "desktop"];
      const results: Record<string, any> = { url: formatted };

      for (const strategy of strategies) {
        try {
          const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(formatted)}&strategy=${strategy}&category=performance&category=seo&category=accessibility&category=best-practices${apiKey ? `&key=${apiKey}` : ""}`;
          const resp = await fetch(apiUrl);
          const data = await resp.json();

          if (data.lighthouseResult) {
            const cats = data.lighthouseResult.categories;
            const audits = data.lighthouseResult.audits;
            results[strategy] = {
              performance: Math.round((cats?.performance?.score || 0) * 100),
              seo: Math.round((cats?.seo?.score || 0) * 100),
              accessibility: Math.round((cats?.accessibility?.score || 0) * 100),
              bestPractices: Math.round((cats?.["best-practices"]?.score || 0) * 100),
              fcp: audits?.["first-contentful-paint"]?.displayValue || "N/A",
              lcp: audits?.["largest-contentful-paint"]?.displayValue || "N/A",
              cls: audits?.["cumulative-layout-shift"]?.displayValue || "N/A",
              tbt: audits?.["total-blocking-time"]?.displayValue || "N/A",
              si: audits?.["speed-index"]?.displayValue || "N/A",
            };
          } else {
            results[strategy] = null;
          }
        } catch {
          results[strategy] = null;
        }
      }

      // Calculate overall score
      if (results.mobile && results.desktop) {
        results.overallScore = Math.round(
          (results.mobile.performance + results.mobile.seo + results.mobile.accessibility + results.mobile.bestPractices +
            results.desktop.performance + results.desktop.seo + results.desktop.accessibility + results.desktop.bestPractices) / 8
        );
      }

      return results;
    };

    console.log("Analyzing", allUrls.length, "URLs for competitor comparison");
    const analyses = await Promise.all(allUrls.map(fetchPsi));

    // Generate AI comparison insights
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    let insights: string[] = [];

    if (lovableApiKey && analyses[0]?.mobile) {
      try {
        const summaryData = analyses.map((a) => ({
          url: a.url,
          mobile: a.mobile,
          desktop: a.desktop,
          overallScore: a.overallScore,
        }));

        const aiResp = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are an SEO expert. Given website comparison data, provide exactly 6 short, actionable competitive insights. Return a JSON array of strings only.",
              },
              {
                role: "user",
                content: `Compare these websites and provide competitive SEO insights. The first URL is the user's site:\n${JSON.stringify(summaryData)}`,
              },
            ],
          }),
        });

        const aiData = await aiResp.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("AI insights error:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, yourSite: analyses[0], competitors: analyses.slice(1), insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Competitor analysis error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
