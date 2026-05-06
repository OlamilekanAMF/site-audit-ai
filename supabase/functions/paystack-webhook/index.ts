import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rawKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!rawKey) {
    console.error("PAYSTACK_SECRET_KEY not configured");
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }
  const PAYSTACK_SECRET_KEY = rawKey.trim();
  if (!PAYSTACK_SECRET_KEY.startsWith("sk_test_") && !PAYSTACK_SECRET_KEY.startsWith("sk_live_")) {
    console.error("PAYSTACK_SECRET_KEY has invalid format");
    return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");

  if (signature !== expected) {
    console.warn("Invalid paystack signature");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const data = event.data || {};
  const userId = data?.metadata?.user_id || null;

  try {
    switch (event.event) {
      case "charge.success": {
        // Idempotency: skip if this reference is already marked success
        let alreadyProcessed = false;
        if (data.reference) {
          const { data: existing } = await admin
            .from("payment_transactions")
            .select("status")
            .eq("reference", data.reference)
            .maybeSingle();
          alreadyProcessed = existing?.status === "success";
          await admin
            .from("payment_transactions")
            .update({ status: "success", paystack_data: data })
            .eq("reference", data.reference);
        }
        if (userId && !alreadyProcessed) {
          // Extend from existing period_end if it's still in the future
          const { data: sub } = await admin
            .from("user_subscriptions")
            .select("current_period_end")
            .eq("user_id", userId)
            .maybeSingle();
          const now = Date.now();
          const baseMs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : now;
          const startMs = isNaN(baseMs) || baseMs < now ? now : baseMs;
          const periodEnd = new Date(startMs);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          await admin
            .from("user_subscriptions")
            .update({
              plan: "premium",
              billing_type: data?.metadata?.billing_type || (data.plan ? "subscription" : "one_time"),
              paystack_customer_code: data?.customer?.customer_code || null,
              current_period_end: periodEnd.toISOString(),
            })
            .eq("user_id", userId);
        }
        break;
      }
      case "subscription.create": {
        const customerCode = data?.customer?.customer_code;
        if (customerCode) {
          await admin
            .from("user_subscriptions")
            .update({
              paystack_subscription_code: data?.subscription_code || null,
              paystack_email_token: data?.email_token || null,
              billing_type: "subscription",
              plan: "premium",
            })
            .eq("paystack_customer_code", customerCode);
        }
        break;
      }
      case "subscription.disable":
      case "subscription.not_renew": {
        const customerCode = data?.customer?.customer_code;
        if (customerCode) {
          await admin
            .from("user_subscriptions")
            .update({ plan: "free", billing_type: null })
            .eq("paystack_customer_code", customerCode);
        }
        break;
      }
      default:
        // Acknowledge other events
        break;
    }
  } catch (err) {
    console.error("webhook handler error:", err);
  }

  return new Response("ok", { status: 200, headers: corsHeaders });
});
