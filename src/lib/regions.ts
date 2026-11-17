/**
 * Where a patient can say they are during a visit. Licensure records (db.license, keyed by these
 * codes) decide which ones are bookable; the US map on the public site is drawn from the same records.
 */
export type Region = { code: string; name: string };

/** The 50 states and DC, as "US-XX" codes. */
export const US_STATES: Region[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"],
  ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"],
  ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([abbr, name]) => ({ code: `US-${abbr}`, name }));

export const NIGERIA: Region = { code: "NG", name: "Nigeria" };

/** Regions offered at booking on each site. Anything unlicensed is blocked with a clear message. */
export const MARKET_REGIONS: Record<"us" | "ng", Region[]> = {
  us: [...US_STATES, { code: "OTHER", name: "Outside the United States" }],
  ng: [NIGERIA, { code: "OTHER", name: "Outside Nigeria" }],
};

/** Every region the doctor can record a licence for (settings → licensure). */
export const ALL_REGIONS: Region[] = [NIGERIA, ...US_STATES, { code: "GH", name: "Ghana" }, { code: "UK", name: "United Kingdom" }];

export const regionName = (code: string) => [...ALL_REGIONS, ...MARKET_REGIONS.us, ...MARKET_REGIONS.ng].find((r) => r.code === code)?.name ?? code;

/** "US-TX" → "TX" */
export const stateAbbr = (code: string) => (code.startsWith("US-") ? code.slice(3) : null);
