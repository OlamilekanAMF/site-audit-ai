const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { scanResults } = await req.json();
    if (!scanResults) {
      return new Response(
        JSON.stringify({ success: false, error: 'Scan results are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url, mobile, desktop, coreWebVitals, loadTime, opportunities, diagnostics, detectedIssues } = scanResults;

    const systemPrompt = `You are a senior web performance, SEO, and UX consultant. Analyze the provided PageSpeed Insights data and detected issues, then generate specific, actionable optimization recommendations.

For each suggestion, provide:
- A clear title
- An explanation of what the issue is
- Why it matters for the website
- A concrete how-to-fix guide
- Impact level and effort level

Be specific to the actual data and metrics provided. Reference real scores and values.`;

    const issuesList = (detectedIssues || [])
      .map((i: any) => `- ${i.name} (${i.severity}): ${i.description}`)
      .join('\n');

    const userPrompt = `Analyze this website: ${url}

Mobile Scores: Performance ${mobile.performance}, SEO ${mobile.seo}, Accessibility ${mobile.accessibility}, Best Practices ${mobile.bestPractices}
Desktop Scores: Performance ${desktop.performance}, SEO ${desktop.seo}, Accessibility ${desktop.accessibility}, Best Practices ${desktop.bestPractices}

Core Web Vitals:
- LCP: ${coreWebVitals.lcp?.displayValue} (score: ${coreWebVitals.lcp?.score})
- FID: ${coreWebVitals.fid?.displayValue} (score: ${coreWebVitals.fid?.score})
- CLS: ${coreWebVitals.cls?.displayValue} (score: ${coreWebVitals.cls?.score})
- FCP: ${coreWebVitals.fcp?.displayValue} (score: ${coreWebVitals.fcp?.score})
- TBT: ${coreWebVitals.tbt?.displayValue} (score: ${coreWebVitals.tbt?.score})
- Speed Index: ${coreWebVitals.si?.displayValue} (score: ${coreWebVitals.si?.score})

Time to Interactive: ${loadTime.displayValue}

Opportunities flagged by Lighthouse:
${(opportunities || []).map((o: any) => `- ${o.title}${o.savings ? ` (potential savings: ${o.savings})` : ''}`).join('\n') || 'None'}

Diagnostics:
${(diagnostics || []).map((d: any) => `- ${d.title}${d.displayValue ? `: ${d.displayValue}` : ''}`).join('\n') || 'None'}

Detected Issues:
${issuesList || 'None'}

Generate 3-5 specific recommendations per category based on this data.`;

    console.log('Requesting AI suggestions for:', url);

    const suggestionSchema = {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short, clear title for the suggestion" },
              explanation: { type: "string", description: "What the issue is and what's happening" },
              whyItMatters: { type: "string", description: "Why this matters for the website's success" },
              howToFix: { type: "string", description: "Step-by-step instructions to fix this issue" },
              impact: { type: "string", enum: ["high", "medium", "low"] },
              effort: { type: "string", enum: ["easy", "moderate", "hard"] },
            },
            required: ["title", "explanation", "whyItMatters", "howToFix", "impact", "effort"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt + '\n\nCall the three tools below to return your recommendations grouped by category.' },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "performance_suggestions",
              description: "Return 3-5 performance optimization recommendations.",
              parameters: suggestionSchema,
            },
          },
          {
            type: "function",
            function: {
              name: "seo_suggestions",
              description: "Return 3-5 SEO improvement recommendations.",
              parameters: suggestionSchema,
            },
          },
          {
            type: "function",
            function: {
              name: "ux_suggestions",
              description: "Return 3-5 user experience improvement recommendations.",
              parameters: suggestionSchema,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCalls = aiData.choices?.[0]?.message?.tool_calls;

    const suggestions: Record<string, any[]> = {
      performance: [],
      seo: [],
      ux: [],
    };

    if (toolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          const items = args.suggestions || [];
          if (tc.function.name === 'performance_suggestions') suggestions.performance = items;
          else if (tc.function.name === 'seo_suggestions') suggestions.seo = items;
          else if (tc.function.name === 'ux_suggestions') suggestions.ux = items;
        } catch (e) {
          console.error('Failed to parse tool call:', tc.function.name, e);
        }
      }
    } else {
      // Fallback: try parsing content as JSON (for backward compatibility)
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.performance) suggestions.performance = parsed.performance;
          if (parsed.seo) suggestions.seo = parsed.seo;
          if (parsed.ux) suggestions.ux = parsed.ux;
        } catch {
          console.error('Failed to parse AI content fallback:', content?.slice(0, 200));
        }
      }
    }

    console.log('AI suggestions generated:', {
      performance: suggestions.performance.length,
      seo: suggestions.seo.length,
      ux: suggestions.ux.length,
    });

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI suggestions error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
