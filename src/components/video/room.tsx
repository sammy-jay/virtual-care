"use client";

import { useRouter } from "next/navigation";
import { useMarketHref } from "@/components/market";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/format";
import { usePeer } from "./use-peer";

function Ctrl({ on, onClick, icon, offIcon, label }: { on: boolean; onClick: () => void; icon: "mic" | "video"; offIcon: "micOff" | "camOff"; label: string }) {
  return (
    <button onClick={onClick} aria-pressed={!on} className={cn("flex min-h-12 items-center gap-2 rounded-full px-5 font-bold", on ? "bg-white/12 text-white" : "bg-white text-ink")}>
      <Icon name={on ? icon : offIcon} size={20} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

type Phase = "waiting" | "live" | "ended";

/**
 * Patient room (07.2 waiting · 07.3 in call · 07.4 reconnecting) and the doctor's video tile.
 * Polls /api/visits/:id/state for waiting/admitted/ended. The call itself is peer-to-peer WebRTC
 * (use-peer.ts) by default, or the Daily room when VIDEO_PROVIDER=daily.
 */
export function VideoRoom({
  appointmentId,
  title,
  remoteName,
  selfLabel = "You",
  audioOnly,
  dailyUrl,
  iceServers = [],
  backupUrl,
  onLeaveHref,
  role,
  compact,
  endAction,
}: {
  appointmentId: string;
  title: string;
  remoteName: string;
  selfLabel?: string;
  audioOnly?: boolean;
  dailyUrl?: string;
  /** STUN/TURN servers for peer-to-peer calls (from src/lib/video.ts). */
  iceServers?: RTCIceServer[];
  backupUrl?: string | null;
  onLeaveHref: string;
  role: "patient" | "doctor";
  compact?: boolean;
  /** Doctor only: server action that completes the visit. */
  endAction?: (f: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const leaveHref = useMarketHref()(onLeaveHref);
  const video = useRef<HTMLVideoElement>(null);
  const remoteEl = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [phase, setPhase] = useState<Phase>(role === "doctor" ? "live" : "waiting");
  const [admittedAt, setAdmittedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(!!audioOnly);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (dailyUrl) return;
    navigator.mediaDevices
      ?.getUserMedia({ video: !audioOnly, audio: true })
      .then((s) => {
        stream.current = s;
        if (video.current) video.current.srcObject = s;
        setLocal(s);
        setLocalReady(true);
      })
      .catch(() => {
        setCamOff(true);
        setLocalReady(true);
      });
    return () => stream.current?.getTracks().forEach((t) => t.stop());
  }, [audioOnly, dailyUrl]);

  useEffect(() => {
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    stream.current?.getVideoTracks().forEach((t) => (t.enabled = !camOff));
  }, [muted, camOff]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/visits/${appointmentId}/state`, { cache: "no-store" });
        if (!r.ok) return;
        const s = await r.json();
        setOnline(true);
        if (s.admittedAt) {
          setAdmittedAt(new Date(s.admittedAt).getTime());
          setPhase("live");
        }
        if (s.endedAt || s.status === "COMPLETED" || s.status === "NO_SHOW" || s.status === "CANCELED") {
          setPhase("ended");
          router.push(leaveHref);
        }
      } catch {
        setOnline(false);
      }
    }, 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [appointmentId, leaveHref, router]);

  const peer = usePeer({ appointmentId, role, iceServers, stream: local, enabled: !dailyUrl && phase === "live" && localReady });

  useEffect(() => {
    const el = remoteEl.current;
    if (!el || !peer.remoteStream) return;
    el.srcObject = peer.remoteStream;
    el.play().catch(() => setNeedsTap(true));
  }, [peer.remoteStream]);

  const reconnecting = !online || peer.state === "reconnecting";
  const elapsed = admittedAt ? Math.max(0, Math.floor((now - admittedAt) / 1000)) : 0;
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;


  return (
    <div className={cn("flex flex-col bg-[#0B1A15] text-white", compact ? "h-full rounded-[20px]" : "min-h-screen")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <div className="font-display text-xl">{title}</div>
          <div className="text-[13px] text-white/65">
            Private room · not recorded{phase === "live" && admittedAt ? ` · ${clock} elapsed` : ""}
          </div>
        </div>
        {backupUrl && phase === "live" && (
          <a href={backupUrl} className="text-[13px] font-bold text-gold underline">
            Having trouble? Open backup link
          </a>
        )}
        {phase === "waiting" && (
          <span className="flex items-center gap-2 text-[13px] text-white/75">
            <Icon name="wifi" size={16} /> Connection {online ? "good" : "lost"}
          </span>
        )}
      </div>

      <div className="relative mx-4 flex-1 overflow-hidden rounded-[20px] bg-[#132821]" style={{ minHeight: compact ? 320 : 420 }}>
        {dailyUrl && phase !== "waiting" ? (
          <iframe src={dailyUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" className="absolute inset-0 size-full border-0" title="Video visit" />
        ) : phase === "waiting" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <span className="size-3 animate-ping rounded-full bg-gold" />
            <div className="font-display text-[28px]">Waiting for {remoteName} to join</div>
            <div className="text-sm text-white/70">You will connect automatically.</div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" data-peer={peer.state}>
            <video ref={remoteEl} autoPlay playsInline className={cn("absolute inset-0 size-full object-cover", !(peer.state === "connected" && peer.remoteVideo) && "invisible")} />
            {!(peer.state === "connected" && peer.remoteVideo) && (
              <>
                <span className="flex size-28 items-center justify-center rounded-full bg-forest font-display text-4xl">{remoteName.replace(/^Dr\.?\s*/, "").split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
                <span className="absolute top-[calc(50%+72px)] text-sm text-white/75">
                  {peer.state === "connected" ? `${remoteName.split(" ")[0]} has their camera off` : peer.state === "reconnecting" ? "Reconnecting…" : `Connecting to ${remoteName}…`}
                </span>
              </>
            )}
            <span className="absolute bottom-4 left-4 rounded-full bg-black/40 px-3 py-1 text-[13px]">{remoteName}</span>
            {needsTap && (
              <button
                onClick={() => {
                  remoteEl.current?.play().then(() => setNeedsTap(false)).catch(() => {});
                }}
                className="absolute top-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink"
              >
                Tap to turn on sound
              </button>
            )}
          </div>
        )}

        {reconnecting && (
          <div className="absolute inset-x-4 top-4 flex items-center gap-3 rounded-2xl bg-gold px-4 py-3 text-ink">
            <Icon name="wifi" size={18} />
            <div className="text-sm">
              <b>Reconnecting…</b> {online ? "The connection dropped. Hang on, we are reconnecting you." : "You are offline. Check your internet connection."}
            </div>
          </div>
        )}

        {!dailyUrl && (
          <div className="absolute bottom-4 right-4 aspect-video w-40 overflow-hidden rounded-xl border border-white/20 bg-black sm:w-56">
            <video ref={video} autoPlay playsInline muted className={cn("size-full -scale-x-100 object-cover", camOff && "invisible")} />
            {camOff && <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">Camera off</div>}
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[11px]">{selfLabel}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-5">
        <Ctrl on={!muted} onClick={() => setMuted(!muted)} icon="mic" offIcon="micOff" label={muted ? "Unmute" : "Mute"} />
        <Ctrl on={!camOff} onClick={() => setCamOff(!camOff)} icon="video" offIcon="camOff" label={camOff ? "Camera on" : "Camera off"} />
        {endAction ? (
          <form action={endAction}>
            <input type="hidden" name="id" value={appointmentId} />
            <button className="flex min-h-12 items-center gap-2 rounded-full bg-coral px-6 font-bold text-white">
              <Icon name="leave" size={20} />
              End visit
            </button>
          </form>
        ) : (
          <button onClick={() => router.push(leaveHref)} className="flex min-h-12 items-center gap-2 rounded-full bg-coral px-6 font-bold text-white">
            <Icon name="leave" size={20} />
            Leave
          </button>
        )}
      </div>
    </div>
  );
}
