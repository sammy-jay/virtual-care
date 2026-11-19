"use client";

import { useEffect, useState } from "react";

export type PeerState = "idle" | "connecting" | "connected" | "reconnecting";

type Signal = { id: string; session: string; kind: string; payload: string | null; at: number };

/**
 * Peer-to-peer video between the doctor and the patient (VIDEO_PROVIDER=p2p).
 *
 * Signalling runs through /api/visits/:id/signal (polling; no websockets needed on Vercel):
 *   - each open tab posts "hello" with a random session id;
 *   - the doctor (the offerer) sends an offer to the patient's latest session, the patient answers,
 *     and both trickle ICE candidates;
 *   - when either side reloads, the new "hello" makes the other side start a fresh connection;
 *   - when the network drops, the doctor restarts ICE.
 */
export function usePeer({
  appointmentId,
  role,
  iceServers,
  stream,
  enabled,
}: {
  appointmentId: string;
  role: "doctor" | "patient";
  iceServers: RTCIceServer[];
  /** Local camera/mic, or null when the browser gave no access (the call can still receive). */
  stream: MediaStream | null;
  enabled: boolean;
}) {
  const [state, setState] = useState<PeerState>("idle");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteVideo, setRemoteVideo] = useState(false);
  const servers = JSON.stringify(iceServers);

  useEffect(() => {
    if (!enabled) return;
    const offerer = role === "doctor";
    const me = crypto.randomUUID();
    const base = `/api/visits/${appointmentId}/signal`;
    let pc: RTCPeerConnection | null = null;
    let remote: string | null = null;
    let after = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let restartTimer: ReturnType<typeof setTimeout> | undefined;
    let queued: RTCIceCandidateInit[] = [];
    const seen = new Set<string>();

    const post = (kind: string, payload?: unknown) =>
      fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: me, to: remote, kind, payload: payload === undefined ? undefined : JSON.stringify(payload) }),
      }).catch(() => {});

    async function offer(iceRestart = false) {
      const p = pc;
      if (!p || stopped) return;
      try {
        await p.setLocalDescription(await p.createOffer({ iceRestart }));
        await post("offer", p.localDescription);
      } catch (e) {
        console.warn("[video] offer failed", e);
      }
    }

    function connect() {
      pc?.close();
      queued = [];
      const p = new RTCPeerConnection({ iceServers: JSON.parse(servers) as RTCIceServer[] });
      pc = p;
      const incoming = new MediaStream();
      setRemoteStream(incoming);
      setRemoteVideo(false);
      setState("connecting");

      p.ontrack = (e) => {
        incoming.addTrack(e.track);
        if (e.track.kind === "video") {
          const sync = () => setRemoteVideo(!e.track.muted && e.track.readyState === "live");
          e.track.onmute = sync;
          e.track.onunmute = sync;
          e.track.onended = sync;
          sync();
        }
      };
      if (offerer) {
        // Always negotiate audio + video both ways, even if this side has no camera.
        for (const kind of ["audio", "video"] as const) {
          const track = stream?.getTracks().find((t) => t.kind === kind);
          p.addTransceiver(track ?? kind, { direction: "sendrecv", streams: stream ? [stream] : [] });
        }
      } else {
        stream?.getTracks().forEach((t) => p.addTrack(t, stream));
      }
      p.onicecandidate = (e) => {
        if (e.candidate && pc === p) post("candidate", e.candidate.toJSON());
      };
      p.onconnectionstatechange = () => {
        if (pc !== p) return;
        const s = p.connectionState;
        clearTimeout(restartTimer);
        if (s === "connected") setState("connected");
        else if (s === "disconnected" || s === "failed") {
          setState("reconnecting");
          // Give the browser a few seconds to recover by itself, then restart ICE.
          if (offerer) restartTimer = setTimeout(() => pc === p && p.connectionState !== "connected" && offer(true), s === "failed" ? 0 : 5000);
        } else if (s === "new" || s === "connecting") setState((prev) => (prev === "connected" ? "reconnecting" : "connecting"));
      };
    }

    async function flush() {
      const p = pc;
      if (!p?.remoteDescription) return;
      for (const c of queued.splice(0)) await p.addIceCandidate(c).catch(() => {});
    }

    async function handle(s: Signal) {
      const p = pc;
      if (!p || !s.payload) return;
      const data = JSON.parse(s.payload);
      if (s.kind === "offer" && !offerer) {
        await p.setRemoteDescription(data);
        await flush();
        await p.setLocalDescription(await p.createAnswer());
        await post("answer", p.localDescription);
      } else if (s.kind === "answer" && offerer && p.signalingState === "have-local-offer") {
        await p.setRemoteDescription(data);
        await flush();
      } else if (s.kind === "candidate") {
        if (p.remoteDescription) await p.addIceCandidate(data).catch(() => {});
        else queued.push(data);
      }
    }

    async function tick() {
      try {
        const r = await fetch(`${base}?session=${me}&after=${after}`, { cache: "no-store" });
        if (r.ok) {
          const { remote: latest, signals } = (await r.json()) as { remote: string | null; signals: Signal[] };
          if (latest && latest !== remote) {
            // The other side (re)joined: start a fresh connection to it.
            remote = latest;
            connect();
            if (offerer) await offer();
          }
          for (const s of signals) {
            if (seen.has(s.id)) continue;
            seen.add(s.id);
            if (s.session !== remote) continue;
            try {
              await handle(s);
            } catch (e) {
              console.warn("[video] signal failed", s.kind, e);
            }
          }
          if (signals.length) after = Math.max(after, signals[signals.length - 1].at - 5000);
        }
      } catch {
        /* offline: keep polling */
      }
      if (!stopped) timer = setTimeout(tick, pc?.connectionState === "connected" ? 2500 : 1000);
    }

    post("hello").then(tick);

    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(restartTimer);
      pc?.close();
      pc = null;
      setState("idle");
    };
  }, [enabled, appointmentId, role, servers, stream]);

  return { state, remoteStream, remoteVideo };
}
