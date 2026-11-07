import type { Metadata } from "next";
import { LegalPage } from "@/components/public/legal";

export const metadata: Metadata = { title: "Telehealth Consent" };

export default function TelehealthConsentPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Telehealth Consent"
      lead="What you agree to when you meet by video."
      sections={[
        ["What telehealth is", "Receiving care by secure video and messaging rather than in person."],
        ["Benefits and limits", "Convenient and private, but physical examination is not possible and technology can fail. A backup video link is provided."],
        ["Your location", "Rules depend on where you are during the visit. You will confirm your location each time you book."],
        ["Privacy and recording", "Visits are private and are not recorded. Please join from a quiet place where you can speak freely."],
        ["Emergencies", "Telehealth is not for emergencies. Call 911 in the US or 112 in Nigeria."],
        ["Your right to stop", "You can withdraw consent or choose in-person care at any time."],
      ]}
    />
  );
}
