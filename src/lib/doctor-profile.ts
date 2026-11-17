/** Dr. Oparaji's main site. The practice pages link back to it so the two read as one site. */
export const PORTFOLIO_URL = (process.env.NEXT_PUBLIC_PORTFOLIO_URL || "https://www.nneomaoparaji.com").replace(/\/+$/, "");
/** Display name for the portfolio, e.g. "nneomaoparaji.com". */
export const PORTFOLIO_HOST = new URL(PORTFOLIO_URL).host.replace(/^www\./, "");
/** A page on the portfolio, e.g. portfolio("/about"). */
export const portfolio = (path = "") => `${PORTFOLIO_URL}${path}`;

/** Public profile facts, taken from nneomaoparaji.com. Edit here, not in the pages. */
export const DOCTOR = {
  name: "Dr. Nneoma Oparaji",
  postnominals: "MD, MHS, ABOM, DipABLM",
  title: "Obesity & Lifestyle Medicine Specialist",
  languages: ["English", "Igbo"],
  email: "contact@nneomaoparaji.com",
  website: PORTFOLIO_URL,
  instagram: "https://www.instagram.com/nneomaoparajimd",
  linkedin: "https://www.linkedin.com/in/nneoma-nnodum-oparaji-md-mhs-dipablm-158a0493/",
  mission:
    "To empower African families—especially busy mothers—to adopt sustainable, evidence-based healthy habits that honor cultural foods and family life.",
  vision: "To normalize healthy living that is faith-centered, culturally rooted, and achievable for real family life.",
  boards: [
    { short: "ABIM", name: "American Board of Internal Medicine", field: "Internal Medicine" },
    { short: "ABOM", name: "American Board of Obesity Medicine", field: "Obesity Medicine" },
    { short: "ABLM", name: "American Board of Lifestyle Medicine", field: "Lifestyle Medicine" },
  ],
  education: [
    { school: "Johns Hopkins University", detail: "Master of Health Science (MHS)" },
    { school: "University of Nigeria, Nsukka", detail: "Medical training" },
  ],
  stats: [
    ["50+", "Media features"],
    ["3", "Board certifications"],
    ["2", "Countries: US & Nigeria"],
  ],
} as const;
