import { describe, expect, it } from "vitest";
import { renderEmail, SAMPLES } from "./templates";

describe("email templates", () => {
  it("renders every template for its audience without gaps", () => {
    for (const s of SAMPLES) {
      const audience = s.audience === "patient" ? { kind: "patient" as const, market: "us" as const } : s.audience === "doctor" ? { kind: "doctor" as const } : { kind: "public" as const };
      const r = renderEmail(s.t, audience, "https://care.example.com");
      expect(r.subject, s.t.template).toBeTruthy();
      expect(r.html, s.t.template).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(r.text, s.t.template).not.toMatch(/undefined|NaN/);
      expect(r.html).toContain("@media only screen and (max-width:620px)");
    }
  });

  it("links Nigeria patients to the /ng site and their emergency numbers", () => {
    const r = renderEmail({ template: "new_message" }, { kind: "patient", market: "ng" }, "https://care.example.com");
    expect(r.html).toContain("https://care.example.com/ng/portal/messages");
    expect(r.html).toContain("112 or 767");
    expect(r.html).not.toContain("911");
  });

  it("puts the verification code first in the plain text (sign-up reads it from there)", () => {
    const r = renderEmail({ template: "verify", code: "482913" }, { kind: "patient", market: "us" }, "https://x.test");
    expect(r.text.match(/\d{6}/)?.[0]).toBe("482913");
  });

  it("escapes anything a visitor typed", () => {
    const r = renderEmail({ template: "inquiry_received", name: "<script>x</script>", topic: "a\"b" }, { kind: "public" }, "https://x.test");
    expect(r.html).not.toContain("<script>x");
    expect(r.html).toContain("&lt;script&gt;");
  });
});
