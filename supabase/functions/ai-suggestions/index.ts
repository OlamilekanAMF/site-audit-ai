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

    const { url, mobile, desktop, coreWebVitals, loadTime, opportunities, diagnostics } = scanResults;

    const systemPrompt = `You are a senior web performance and SEO consultant. Analyze the provided PageSpeed Insights data and return actionable optimization suggestions. 

You MUST respond with valid JSON matching this exact structure (no markdown, no code fences):
{
  "performance": [
    { "title": "Short title", "description": "Clear actionable recommendation", "impact": "high" | "medium" | "low", "effort": "easy" | "moderate" | "hard" }
  ],
  "seo": [
    { "title": "Short title", "description": "Clear actionable recommendation", "impact": "high" | "medium" | "low", "effort": "easy" | "moderate" | "hard" }
  ],
  "ux": [
    { "title": "Short title", "description": "Clear actionable recommendation", "impact": "high" | "medium" | "low", "effort": "easy" | "moderate" | "hard" }
  ]
}

Provide 3-5 suggestions per category. Be specific to the data provided. Reference actual metrics and scores.`;

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
${opportunities.map((o: any) => `- ${o.title}${o.savings ? ` (potential savings: ${o.savings})` : ''}`).join('\n')}

Diagnostics:
${diagnostics.map((d: any) => `- ${d.title}${d.displayValue ? `: ${d.displayValue}` : ''}`).join('\n')}

Generate specific, actionable recommendations based on this data.`;

    console.log('Requesting AI suggestions for:', url);

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
          { role: 'user', content: userPrompt },
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
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse JSON from the response (strip markdown fences if present)
    let suggestions;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI suggestions');
    }

    console.log('AI suggestions generated successfully');

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
