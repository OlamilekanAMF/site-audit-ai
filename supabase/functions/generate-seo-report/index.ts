const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { url, scanHistory } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const historyContext = scanHistory?.length
      ? `\nRecent scan history:\n${scanHistory.map((s: any) => `- ${s.date}: Score ${s.score}, Perf ${s.performance}, SEO ${s.seo}`).join('\n')}`
      : '';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO analyst. Generate a comprehensive monthly SEO report with scores, analysis, and an improvement plan. Be specific and data-driven.',
          },
          {
            role: 'user',
            content: `Generate a monthly SEO report for: ${url}${historyContext}\n\nReturn the report using the tool.`,
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_seo_report',
            description: 'Return the monthly SEO report',
            parameters: {
              type: 'object',
              properties: {
                website_health_score: { type: 'integer', minimum: 0, maximum: 100 },
                seo_health_score: { type: 'integer', minimum: 0, maximum: 100 },
                core_web_vitals_summary: { type: 'string' },
                keyword_ranking_improvements: { type: 'array', items: { type: 'object', properties: { keyword: { type: 'string' }, change: { type: 'string' }, status: { type: 'string', enum: ['improved', 'declined', 'stable'] } }, required: ['keyword', 'change', 'status'], additionalProperties: false } },
                technical_issues: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'warning', 'info'] }, recommendation: { type: 'string' } }, required: ['issue', 'severity', 'recommendation'], additionalProperties: false } },
                improvement_plan: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] }, timeline: { type: 'string' } }, required: ['action', 'priority', 'timeline'], additionalProperties: false } },
              },
              required: ['website_health_score', 'seo_health_score', 'core_web_vitals_summary', 'keyword_ranking_improvements', 'technical_issues', 'improvement_plan'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_seo_report' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const report = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('SEO report error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
