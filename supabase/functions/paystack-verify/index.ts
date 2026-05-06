import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!rawKey) throw new Error("PAYSTACK_SECRET_KEY not configured");
    const PAYSTACK_SECRET_KEY = rawKey.trim();
    if (!PAYSTACK_SECRET_KEY.startsWith("sk_test_") && !PAYSTACK_SECRET_KEY.startsWith("sk_live_")) {
      throw new Error(
        `PAYSTACK_SECRET_KEY has invalid format. Expected sk_test_ or sk_live_ prefix, got: ${PAYSTACK_SECRET_KEY.substring(0, 8)}...`
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { reference } = await req.json();
    if (!reference || typeof reference !== "string") {
      return new Response(JSON.stringify({ error: "reference is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const psRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const psData = await psRes.json();
    if (!psRes.ok || !psData?.status) {
      return new Response(JSON.stringify({ error: psData?.message || "Verify failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tx = psData.data;
    const status = tx.status; // 'success' | 'failed' | ...
    const billingType =
      (tx.metadata && tx.metadata.billing_type) || (tx.plan ? "subscription" : "one_time");
    const customerCode = tx.customer?.customer_code || null;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Make sure this transaction belongs to this user
    const { data: existing } = await adminClient
      .from("payment_transactions")
      .select("user_id")
      .eq("reference", reference)
      .maybeSingle();

    if (existing && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient
      .from("payment_transactions")
      .update({ status, paystack_data: tx })
      .eq("reference", reference);

    if (status === "success") {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await adminClient
        .from("user_subscriptions")
        .update({
          plan: "premium",
          billing_type: billingType,
          paystack_customer_code: customerCode,
          current_period_end: periodEnd.toISOString(),
        })
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({ status, billing_type: billingType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("paystack-verify error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
