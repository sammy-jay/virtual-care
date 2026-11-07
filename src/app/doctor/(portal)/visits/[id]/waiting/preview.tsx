"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/format";

export function DoctorPreview() {
  const v = useRef<HTMLVideoElement>(null);
  const s = useRef<MediaStream | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [err, setErr] = useState(false);
  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((st) => {
        s.current = st;
        if (v.current) v.current.srcObject = st;
      })
      .catch(() => setErr(true));
    return () => s.current?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => {
    s.current?.getAudioTracks().forEach((t) => (t.enabled = mic));
    s.current?.getVideoTracks().forEach((t) => (t.enabled = cam));
  }, [mic, cam]);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-[20px] bg-[#132821]">
        <video ref={v} autoPlay playsInline muted className={cn("size-full -scale-x-100 object-cover", !cam && "invisible")} />
        {(err || !cam) && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">{err ? "Camera blocked — allow it in the address bar" : "Camera off"}</div>}
        <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-3 py-1 text-[12px] text-white">Camera preview</span>
      </div>
      <div className="flex gap-2.5">
        <button onClick={() => setMic(!mic)} aria-pressed={!mic} className={cn("flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold", mic ? "bg-sage text-forest" : "bg-coral-tint text-danger")}>
          <Icon name={mic ? "mic" : "micOff"} size={17} /> Mic {mic ? "on" : "off"}
        </button>
        <button onClick={() => setCam(!cam)} aria-pressed={!cam} className={cn("flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold", cam ? "bg-sage text-forest" : "bg-coral-tint text-danger")}>
          <Icon name={cam ? "video" : "camOff"} size={17} /> Camera {cam ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
