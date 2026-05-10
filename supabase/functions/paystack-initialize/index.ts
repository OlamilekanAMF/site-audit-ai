import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PREMIUM_AMOUNT_USD = 19; // $19
const PLAN_CODE = Deno.env.get("PAYSTACK_PLAN_CODE") || ""; // optional, used for subscriptions

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let paymentReference: string | null = null;
  let adminClientForFailure: ReturnType<typeof createClient> | null = null;
  try {
    const rawKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!rawKey) throw new Error("PAYSTACK_SECRET_KEY not configured");
    const PAYSTACK_SECRET_KEY = rawKey.trim();
    if (!PAYSTACK_SECRET_KEY.startsWith("sk_test_") && !PAYSTACK_SECRET_KEY.startsWith("sk_live_")) {
      const hint = PAYSTACK_SECRET_KEY.startsWith("pk_")
        ? "Looks like a PUBLIC key (pk_). Use the SECRET key."
        : `Expected sk_test_ or sk_live_ prefix, got: ${PAYSTACK_SECRET_KEY.substring(0, 8)}...`;
      throw new Error(`PAYSTACK_SECRET_KEY has invalid format. ${hint}`);
    }
    if (PAYSTACK_SECRET_KEY.length < 20) {
      throw new Error("PAYSTACK_SECRET_KEY appears truncated. Copy the full key from Paystack.");
    }
    console.log(`[paystack-initialize] mode=${PAYSTACK_SECRET_KEY.startsWith("sk_live_") ? "live" : "test"}`);

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
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const email = userData.user.email || "";

    const body = await req.json().catch(() => ({}));
    const billingType: "one_time" | "subscription" =
      body?.billing_type === "subscription" ? "subscription" : "one_time";

    const callbackUrl = body?.callback_url || `${req.headers.get("origin") || ""}/dashboard/pricing?paystack=success`;

    // Per-currency price for Premium ($19 USD equivalent). Amounts are in the smallest unit (kobo/cents/pesewa).
    const PRICE_BY_CURRENCY: Record<string, number> = {
      USD: 19 * 100,
      NGN: 30000 * 100,
      GHS: 250 * 100,
      ZAR: 350 * 100,
      KES: 2500 * 100,
    };
    const requestedCurrency = String(body?.currency || "USD").toUpperCase();
    const currency = PRICE_BY_CURRENCY[requestedCurrency] ? requestedCurrency : "USD";
    const amount = PRICE_BY_CURRENCY[currency];
    const reference = `sd_${userId.slice(0, 8)}_${Date.now()}`;

    const useSubscriptionPlan = billingType === "subscription" && !!PLAN_CODE;

    const payload: Record<string, unknown> = {
      email,
      amount,
      reference,
      callback_url: callbackUrl,
      metadata: {
        user_id: userId,
        billing_type: billingType,
        requested_currency: currency,
      },
    };

    if (useSubscriptionPlan) {
      // When a plan is attached, Paystack uses the plan's currency. Don't send currency.
      payload.plan = PLAN_CODE;
    } else {
      payload.currency = currency;
    }


    // Insert pending tx FIRST so we can mark it failed if Paystack errors
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    adminClientForFailure = adminClient;
    paymentReference = reference;

    await adminClient.from("payment_transactions").insert({
      user_id: userId,
      reference,
      amount,
      currency,
      status: "pending",
      billing_type: billingType,
    });

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const psData = await psRes.json();
    if (!psRes.ok || !psData?.status) {
      console.error("Paystack init failed:", psData);
      await adminClient
        .from("payment_transactions")
        .update({ status: "failed", paystack_data: psData ?? null })
        .eq("reference", reference);
      return new Response(
        JSON.stringify({ error: psData?.message || "Failed to initialize payment" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await adminClient
      .from("payment_transactions")
      .update({ paystack_data: psData.data })
      .eq("reference", reference);

    return new Response(
      JSON.stringify({
        authorization_url: psData.data.authorization_url,
        access_code: psData.data.access_code,
        reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("paystack-initialize error:", message);
    if (paymentReference && adminClientForFailure) {
      try {
        await adminClientForFailure
          .from("payment_transactions")
          .update({ status: "failed", paystack_data: { error: message } })
          .eq("reference", paymentReference);
      } catch (_) { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
