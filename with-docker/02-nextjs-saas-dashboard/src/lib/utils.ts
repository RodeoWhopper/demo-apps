/** Only allow same-origin relative paths as post-login targets. */
export function safeNext(value: unknown): string {
  const v = typeof value === "string" ? value : "";
  if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) return v;
  return "/dashboard";
}

export const fmtInt = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const fmtPct = (n: number) => `${n.toFixed(1)}%`;
