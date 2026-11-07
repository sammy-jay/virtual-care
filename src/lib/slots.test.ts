import { describe, expect, it } from "vitest";
import { openSlots } from "./slots";
import { fmtTime, zonedWallToUtc } from "./time";

const base = {
  practiceTz: "America/Chicago",
  windows: [{ weekday: 4, startMin: 12 * 60, endMin: 18 * 60, visitTypeIds: [] }], // Thu 12–6 PM CDT
  timeOff: [],
  booked: [],
  visitTypeId: "fu",
  durationMin: 30,
  bufferMin: 15,
  noticeHours: 12,
  from: new Date("2026-10-29T05:00:00Z"),
  days: 1,
  now: new Date("2026-10-26T12:00:00Z"),
};

describe("zonedWallToUtc", () => {
  it("treats 24:00 as midnight of the next day", () => {
    expect(zonedWallToUtc("2026-11-07", 24 * 60, "America/Chicago").toISOString()).toBe("2026-11-08T06:00:00.000Z");
  });
  it("handles month ends", () => {
    expect(zonedWallToUtc("2026-10-31", 24 * 60 + 60, "Africa/Lagos").toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("openSlots", () => {
  it("produces half-hour starts inside the window, shown correctly in Lagos", () => {
    const s = openSlots(base);
    expect(s).toHaveLength(12);
    expect(fmtTime(s[2], "America/Chicago")).toBe("1:00 PM");
    expect(fmtTime(s[2], "Africa/Lagos")).toBe("7:00 PM");
  });

  it("respects bookings plus the 15 min buffer", () => {
    const booked = [{ startsAt: new Date("2026-10-29T18:00:00Z"), endsAt: new Date("2026-10-29T18:30:00Z") }]; // 1:00 PM CDT
    const times = openSlots({ ...base, booked }).map((d) => fmtTime(d, "America/Chicago"));
    expect(times).not.toContain("12:30 PM");
    expect(times).not.toContain("1:00 PM");
    expect(times).not.toContain("1:30 PM");
    expect(times).toContain("2:00 PM");
  });

  it("respects the 12 hour notice", () => {
    expect(openSlots({ ...base, now: new Date("2026-10-29T08:00:00Z") }).map((d) => fmtTime(d, "America/Chicago"))[0]).toBe("3:00 PM");
  });

  it("blocks time off", () => {
    const timeOff = [{ startsAt: new Date("2026-10-29T00:00:00Z"), endsAt: new Date("2026-10-30T12:00:00Z") }];
    expect(openSlots({ ...base, timeOff })).toHaveLength(0);
  });
});
