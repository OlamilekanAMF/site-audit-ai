// Shared helpers for Paystack edge functions

export function getValidatedPaystackKey(): string {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  const trimmed = key.trim();
  if (!trimmed.startsWith("sk_test_") && !trimmed.startsWith("sk_live_")) {
    if (trimmed.startsWith("pk_")) {
      throw new Error(
        "PAYSTACK_SECRET_KEY looks like a PUBLIC key (pk_...). Use the SECRET key (sk_test_ or sk_live_).",
      );
    }
    throw new Error(
      `PAYSTACK_SECRET_KEY has invalid format. Expected sk_test_... or sk_live_..., got: ${trimmed.substring(0, 8)}...`,
    );
  }
  if (trimmed.length < 20) {
    throw new Error("PAYSTACK_SECRET_KEY appears truncated. Copy the full key from Paystack.");
  }
  return trimmed;
}

// Compute the next period end. If `current` is in the future, extend from it
// (so renewals don't lose unused days). Otherwise extend from now.
export function nextMonthlyPeriodEnd(current: string | null | undefined): string {
  const now = Date.now();
  const base = current ? new Date(current).getTime() : now;
  const start = isNaN(base) || base < now ? now : base;
  const d = new Date(start);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
