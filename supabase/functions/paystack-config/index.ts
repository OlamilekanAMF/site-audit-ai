const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const planCode = Deno.env.get("PAYSTACK_PLAN_CODE") || "";
  const hasSecret = !!Deno.env.get("PAYSTACK_SECRET_KEY");
  return new Response(
    JSON.stringify({
      has_secret_key: hasSecret,
      has_plan_code: planCode.length > 0,
      plan_code_preview: planCode ? `${planCode.slice(0, 8)}…` : null,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
