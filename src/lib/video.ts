import "server-only";
import type { Appointment } from "@prisma/client";

/**
 * Video adapter. VIDEO_PROVIDER picks it:
 *   p2p   (default): browser-to-browser WebRTC, encrypted end to end (DTLS-SRTP). Signalling goes
 *                    through this app's database (/api/visits/:id/signal); no account needed.
 *                    Add a TURN relay (Cloudflare or any TURN server) so calls also connect on strict
 *                    hospital, office and mobile networks. See README → Video visits.
 *   daily          : Daily.co private rooms (DAILY_API_KEY, DAILY_DOMAIN).
 */
export type JoinInfo = { provider: "p2p"; iceServers: RTCIceServer[] } | { provider: "daily"; url: string };

const PUBLIC_STUN: RTCIceServer[] = [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }];

/** Cloudflare TURN: short-lived credentials generated per visit (TURN key id + API token). */
async function cloudflareIce(): Promise<RTCIceServer[] | null> {
  const id = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!id || !token) return null;
  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 4 * 3600 }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Cloudflare TURN ${res.status}`);
    const { iceServers } = (await res.json()) as { iceServers: RTCIceServer[] | RTCIceServer };
    const list = Array.isArray(iceServers) ? iceServers : [iceServers];
    // Browsers block port 53; drop those URLs so ICE does not wait on them.
    return list.map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }));
  } catch (e) {
    console.error("[video] could not get Cloudflare TURN credentials:", e);
    return null;
  }
}

/** Any other TURN server with fixed credentials (Metered, Twilio, your own coturn…). */
function staticTurn(): RTCIceServer[] {
  const urls = process.env.TURN_URLS?.split(",").map((u) => u.trim()).filter(Boolean);
  if (!urls?.length) return [];
  return [{ urls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL }];
}

export async function iceServers(): Promise<RTCIceServer[]> {
  return (await cloudflareIce()) ?? [...PUBLIC_STUN, ...staticTurn()];
}

export function videoProvider() {
  return process.env.VIDEO_PROVIDER === "daily" && process.env.DAILY_API_KEY && process.env.DAILY_DOMAIN ? "daily" : "p2p";
}

async function daily(path: string, body: unknown) {
  const res = await fetch(`https://api.daily.co/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // 400 on "rooms" means the room already exists, which is fine.
  if (!res.ok && !(path === "rooms" && res.status === 400)) throw new Error(`Daily ${path} ${res.status}`);
  return res.json();
}

export async function joinInfo(a: Appointment, user: { name: string; isDoctor: boolean }): Promise<JoinInfo> {
  if (videoProvider() === "p2p") return { provider: "p2p", iceServers: await iceServers() };
  const name = a.roomName ?? `visit-${a.id}`;
  const exp = Math.floor(a.endsAt.getTime() / 1000) + 3600;
  await daily("rooms", { name, privacy: "private", properties: { exp, enable_recording: false, enable_knocking: true, enable_prejoin_ui: false } });
  const { token } = await daily("meeting-tokens", { properties: { room_name: name, user_name: user.name, is_owner: user.isDoctor, exp } });
  return { provider: "daily", url: `https://${process.env.DAILY_DOMAIN}.daily.co/${name}?t=${token}` };
}
