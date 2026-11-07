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
