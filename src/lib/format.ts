export type CurrencyCode = "USD" | "NGN";

/** $129.00 / ₦193,500 */
export function money(cents: number, currency: CurrencyCode = "USD", opts: { compact?: boolean } = {}) {
  if (currency === "NGN") {
    return "₦" + Math.round(cents / 100).toLocaleString("en-US");
  }
  const neg = cents < 0;
  const abs = Math.abs(cents) / 100;
  const s =
    opts.compact && Number.isInteger(abs)
      ? abs.toLocaleString("en-US")
      : abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${neg ? "−" : ""}$${s}`;
}

/** $129 (no cents when whole) */
export const moneyShort = (cents: number, currency: CurrencyCode = "USD") => money(cents, currency, { compact: true });

/** Amounts kept per currency. Naira (kobo) and dollars (cents) are never added together. */
export type Totals = Record<CurrencyCode, number>;

export function sumByCurrency<T>(items: T[], cents: (x: T) => number, currency: (x: T) => string): Totals {
  const t: Totals = { USD: 0, NGN: 0 };
  for (const x of items) t[currency(x) === "NGN" ? "NGN" : "USD"] += cents(x);
  return t;
}

/** "$275.00", "₦470,000" or "$95.00 + ₦200,000"; `empty` sets the currency shown for a zero total. */
export function moneyTotals(t: Totals, opts: { short?: boolean; empty?: CurrencyCode } = {}) {
  const parts = (["USD", "NGN"] as const).filter((c) => t[c] !== 0).map((c) => money(t[c], c, { compact: opts.short }));
  return parts.length ? parts.join(" + ") : money(0, opts.empty ?? "USD", { compact: opts.short });
}

/** Practice-wide reports are in dollars: naira is converted at the practice rate (doctor Settings). */
export function toUsdCents(cents: number, currency: string, ngnPerUsd: number) {
  return currency === "NGN" ? Math.round(cents / ngnPerUsd) : cents;
}

export function initials(name: string) {
  const parts = name.replace(/^Dr\.?\s+/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "Adaeze N." */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0];

export function pluralize(n: number, one: string, many = one + "s") {
  return `${n} ${n === 1 ? one : many}`;
}

export function receiptNo(prefix = "NO", year = new Date().getFullYear()) {
  return `${prefix}-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
