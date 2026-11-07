import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      lead="How we collect, use and protect your information."
      sections={[
        ["What we collect", "Account details, your health profile, visit notes, messages, payment records and basic device information needed to run secure video visits."],
        ["How we use it", "To provide care, schedule and remind you of visits, process payments, keep the service secure and meet legal obligations. We do not sell your information."],
        ["Who can see it", "You and Dr. Oparaji. Service providers such as video, email and payment partners handle data only to deliver the service."],
        ["Where it is stored", "Records are stored securely and may be processed in the US. Nigerian patients are told this at sign-up and before booking."],
        ["Your choices", "Export your data, correct your profile or request deletion from account settings. Clinical records are kept for as long as the law requires."],
        ["Contact", "Questions about privacy can be sent through the contact form or by email to the practice."],
      ]}
    />
  );
}
