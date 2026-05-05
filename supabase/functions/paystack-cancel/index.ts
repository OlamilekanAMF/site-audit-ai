import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = data.claims.sub as string;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch existing subscription to optionally cancel paystack subscription
    const { data: sub } = await admin
      .from("user_subscriptions")
      .select("paystack_subscription_code, paystack_email_token")
      .eq("user_id", userId)
      .maybeSingle();

    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (sub?.paystack_subscription_code && sub?.paystack_email_token && PAYSTACK_SECRET_KEY) {
      try {
        await fetch("https://api.paystack.co/subscription/disable", {
          method: "POST",
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ code: sub.paystack_subscription_code, token: sub.paystack_email_token }),
        });
      } catch (e) {
        console.error("Paystack disable failed:", e);
      }
    }

    const { error: updErr } = await admin
      .from("user_subscriptions")
      .update({
        plan: "free",
        billing_type: null,
        paystack_subscription_code: null,
        paystack_email_token: null,
        current_period_end: null,
      })
      .eq("user_id", userId);

    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("paystack-cancel error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
