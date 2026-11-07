import "server-only";
import type { Appointment } from "@prisma/client";

/**
 * Video adapter. VIDEO_PROVIDER=daily creates private Daily.co rooms (no recording) and short-lived
 * meeting tokens; VIDEO_PROVIDER=local (default) runs the same waiting/admit/end flow with local camera only.
 */
export type JoinInfo = { provider: "local" } | { provider: "daily"; url: string };

async function daily(path: string, body: unknown) {
  const res = await fetch(`https://api.daily.co/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 400) throw new Error(`Daily ${path} ${res.status}`);
  return res.json();
}

export async function joinInfo(a: Appointment, user: { name: string; isDoctor: boolean }): Promise<JoinInfo> {
  if (process.env.VIDEO_PROVIDER !== "daily" || !process.env.DAILY_API_KEY || !process.env.DAILY_DOMAIN) return { provider: "local" };
  const name = a.roomName ?? `visit-${a.id}`;
  const exp = Math.floor(a.endsAt.getTime() / 1000) + 3600;
  await daily("rooms", { name, privacy: "private", properties: { exp, enable_recording: false, enable_knocking: true, enable_prejoin_ui: false } });
  const { token } = await daily("meeting-tokens", { properties: { room_name: name, user_name: user.name, is_owner: user.isDoctor, exp } });
  return { provider: "daily", url: `https://${process.env.DAILY_DOMAIN}.daily.co/${name}?t=${token}` };
}
