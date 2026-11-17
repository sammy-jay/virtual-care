import "server-only";
import { cache } from "react";
import { db } from "./db";
import { regionName, stateAbbr } from "./regions";

/**
 * Where Dr. Oparaji can see patients, from the doctor's licence records (Settings → Licensure).
 * Cached per request: the footer, home page and map all ask.
 */
export const getLicensure = cache(async () => {
  const active = await db.license.findMany({ where: { status: "ACTIVE" }, select: { regionCode: true } });
  const states = active
    .map((l) => stateAbbr(l.regionCode))
    .filter((s): s is string => !!s)
    .sort((a, b) => regionName(`US-${a}`).localeCompare(regionName(`US-${b}`)));
  return { states, nigeria: active.some((l) => l.regionCode === "NG") };
});
