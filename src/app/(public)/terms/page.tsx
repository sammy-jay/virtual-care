import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      lead="The agreement between you and the practice."
      sections={[
        ["Using the service", "You must be an adult and give accurate information. The service is for non-emergency virtual care only."],
        ["Bookings and cancellations", "Visits can be cancelled free of charge up to 12 hours before the start time. Late cancellations and no-shows may be charged."],
        ["Membership and billing", "Memberships renew monthly until cancelled. Prices are shown before you pay, in dollars or naira."],
        ["Your responsibilities", "Be in a licensed location during visits, keep your login private and use messaging only for non-urgent matters."],
        ["Limits", "Virtual care cannot treat every condition. Dr. Oparaji may refer you for in-person care when appropriate."],
        ["Changes", "We may update these terms and will tell you before changes take effect."],
      ]}
    />
  );
}
