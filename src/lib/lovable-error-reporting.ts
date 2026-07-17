// Local error logging fallback. Replaced the previous Lovable-specific reporter
// so nothing depends on an external service. Keeps the same export signature
// so existing call sites (e.g. src/routes/__root.tsx) work unchanged.
export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof console === "undefined") return;
  console.error("[app error]", error, context);
}
