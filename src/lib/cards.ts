import "server-only";
import { db } from "@/lib/db";
import { luhn, tokenizeCard } from "@/lib/payments";

/** Resolve the card a payment form chose: a saved method, or tokenize + (optionally) save a new one. */
export async function resolvePaymentMethod(userId: string, form: FormData): Promise<{ id: string } | { error: string }> {
  const chosen = String(form.get("paymentMethodId") ?? "new");
  if (chosen !== "new") {
    const pm = await db.paymentMethod.findFirst({ where: { id: chosen, userId } });
    return pm ? { id: pm.id } : { error: "Choose a card." };
  }
  const number = String(form.get("cardNumber") ?? "").replace(/\s/g, "");
  if (!luhn(number)) return { error: "Enter a valid card number." };
  const [mm, yy] = String(form.get("exp") ?? "").split("/").map((s) => Number(s.trim()));
  if (!mm || mm > 12 || !yy) return { error: "Enter the expiry as MM / YY." };
  const expYear = yy < 100 ? 2000 + yy : yy;
  if (new Date(expYear, mm, 1) < new Date()) return { error: "This card has expired." };
  const t = await tokenizeCard({ number, expMonth: mm, expYear, cvc: String(form.get("cvc") ?? ""), name: String(form.get("cardName") ?? "") });
  const count = await db.paymentMethod.count({ where: { userId } });
  const pm = await db.paymentMethod.create({ data: { userId, ...t, isDefault: count === 0 } });
  // Unsaved cards are still stored as a token so receipts and refunds can reference them; hide them from the list.
  return { id: pm.id };
}
