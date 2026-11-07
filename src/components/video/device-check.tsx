"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/format";

type State = "asking" | "ready" | "blocked" | "nodevice";

/** 07.1 / 07.5 — camera preview, device pickers, live mic level, or the blocked state. */
export function DeviceCheck({ joinAction, appointmentId, backupUrl }: { joinAction: (f: FormData) => Promise<void>; appointmentId: string; backupUrl?: string | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<State>("asking");
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cam, setCam] = useState<string>();
  const [mic, setMic] = useState<string>();
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: cam ? { deviceId: { exact: cam } } : true, audio: mic ? { deviceId: { exact: mic } } : true });
        if (video.current) video.current.srcObject = stream;
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCams(devices.filter((d) => d.kind === "videoinput"));
        setMics(devices.filter((d) => d.kind === "audioinput"));
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          setLevel(Math.min(1, data.reduce((a, b) => a + b, 0) / data.length / 60));
          raf = requestAnimationFrame(tick);
        };
        tick();
        setState("ready");
      } catch (e) {
        const name = (e as DOMException).name;
        setState(name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "nodevice");
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [cam, mic, attempt]);

  if (state === "blocked" || state === "nodevice")
    return (
      <div className="card mx-auto max-w-[620px] text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-[20px] bg-coral-tint text-danger">
          <Icon name="camOff" size={30} />
        </div>
        <h1 className="h-display mt-4 text-[32px]">{state === "blocked" ? "Camera access is blocked" : "We could not find a camera"}</h1>
        <p className="mx-auto mt-2 max-w-[460px] text-[15.5px] text-body">
          {state === "blocked" ? "Your browser is stopping this site: allow camera and microphone in the address bar, then try again." : "Plug in a camera, or join with audio only."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => { setState("asking"); setAttempt((n) => n + 1); }} className="rounded-full bg-forest px-6 py-3 font-bold text-white">
            Try again
          </button>
          <form action={joinAction}>
            <input type="hidden" name="id" value={appointmentId} />
            <input type="hidden" name="audio" value="1" />
            <button className="rounded-full border-[1.5px] border-forest px-6 py-3 font-bold text-forest">Join audio only</button>
          </form>
        </div>
        {backupUrl && (
          <p className="mt-4 text-sm text-muted">
            Or use the{" "}
            <a href={backupUrl} className="font-bold text-forest underline">
              backup video link
            </a>{" "}
            from your doctor.
          </p>
        )}
      </div>
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="relative aspect-video overflow-hidden rounded-[20px] bg-ink">
        <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
        {state === "asking" && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Asking for camera access…</div>}
      </div>
      <div className="card flex flex-col gap-4">
        <div>
          <label htmlFor="cam" className="label">Camera</label>
          <select id="cam" className="field" value={cam ?? ""} onChange={(e) => setCam(e.target.value || undefined)}>
            {cams.map((c, i) => (
              <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mic" className="label">Microphone</label>
          <select id="mic" className="field" value={mic ?? ""} onChange={(e) => setMic(e.target.value || undefined)}>
            {mics.map((c, i) => (
              <option key={c.deviceId} value={c.deviceId}>{c.label || `Microphone ${i + 1}`}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="label">Mic level</div>
          <div className="flex h-3 gap-1" aria-label={`Mic level ${Math.round(level * 100)}%`} role="meter" aria-valuenow={Math.round(level * 100)} aria-valuemin={0} aria-valuemax={100}>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className={cn("flex-1 rounded-sm", i / 12 < level ? "bg-forest" : "bg-line-soft")} />
            ))}
          </div>
        </div>
        <p className="rounded-xl bg-sky-tint px-3.5 py-2.5 text-[13.5px] text-sky-ink">Tip: use Wi-Fi if you can. Audio-only works on weak networks.</p>
        <form action={joinAction} className="flex flex-col gap-2.5">
          <input type="hidden" name="id" value={appointmentId} />
          <button disabled={state !== "ready"} className="rounded-full bg-forest px-6 py-3.5 font-bold text-white disabled:opacity-60">
            Join visit
          </button>
          <button name="audio" value="1" className="rounded-full border-[1.5px] border-forest px-6 py-3 font-bold text-forest">
            Join audio only
          </button>
        </form>
        <Link href="/portal/visits" className="text-center text-sm font-bold text-muted">
          Back to my visits
        </Link>
      </div>
    </div>
  );
}
