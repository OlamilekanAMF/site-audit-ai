const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

async function requireAuth(req: Request, corsHeaders: Record<string, string>) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) };
  }
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) };
  }
  return { userId: data.claims.sub as string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAuth(req, corsHeaders);
    if ('error' in auth) return auth.error;

    // Premium-only feature: verify subscription server-side
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: subRow } = await adminClient.from('user_subscriptions').select('plan, billing_type, current_period_end').eq('user_id', auth.userId).maybeSingle();
    const periodActive = subRow?.current_period_end ? new Date(subRow.current_period_end).getTime() > Date.now() : true;
    const isPremium = subRow?.plan === 'premium' && (subRow?.billing_type !== 'one_time' || periodActive);
    if (!isPremium) {
      return new Response(JSON.stringify({ success: false, error: 'Premium plan required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { topic } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ success: false, error: 'Topic is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
            content: `You are an expert SEO keyword researcher similar to SEMrush/Ahrefs. Generate 15-20 highly relevant SEO keyword suggestions for the given topic or niche. For each keyword provide realistic estimates.`,
          },
          {
            role: 'user',
            content: `Generate SEO keyword suggestions for: "${topic}". Return structured data using the tool.`,
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_keywords',
            description: 'Return keyword research results',
            parameters: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      keyword: { type: 'string' },
                      search_intent: { type: 'string', enum: ['informational', 'navigational', 'commercial', 'transactional'] },
                      difficulty_score: { type: 'integer', minimum: 1, maximum: 100 },
                      opportunity_score: { type: 'integer', minimum: 1, maximum: 100 },
                      suggested_content: { type: 'string', enum: ['blog post', 'landing page', 'product page', 'guide', 'comparison', 'listicle', 'tutorial', 'case study'] },
                    },
                    required: ['keyword', 'search_intent', 'difficulty_score', 'opportunity_score', 'suggested_content'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['keywords'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_keywords' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const keywords = toolCall ? JSON.parse(toolCall.function.arguments).keywords : [];

    return new Response(JSON.stringify({ success: true, keywords }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Keyword research error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
