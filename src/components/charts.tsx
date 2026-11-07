/** Small hand-built SVG charts matching the boards (05.9 Progress, 09.14 Earnings). */

export function LineChart({ points, label, unit, color = "#17604B", height = 180 }: { points: { x: string; y: number }[]; label: string; unit?: string; color?: string; height?: number }) {
  if (points.length < 2) return <p className="py-8 text-center text-sm text-muted">Log at least two readings to see a trend.</p>;
  const w = 560;
  const h = height;
  const pad = { l: 40, r: 14, t: 14, b: 26 };
  const ys = points.map((p) => p.y);
  const min = Math.floor(Math.min(...ys) - 1);
  const max = Math.ceil(Math.max(...ys) + 1);
  const X = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (points.length - 1);
  const Y = (v: number) => pad.t + ((max - v) * (h - pad.t - pad.b)) / (max - min || 1);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const ticks = [min, (min + max) / 2, max];
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`${label}: from ${points[0].y}${unit ?? ""} to ${last.y}${unit ?? ""}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke="#F1F2F4" />
          <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">
            {Math.round(t)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={X(i)} cy={Y(p.y)} r={i === points.length - 1 ? 5 : 3} fill={i === points.length - 1 ? color : "#fff"} stroke={color} strokeWidth="2" />
      ))}
      {points.map((p, i) =>
        i % Math.ceil(points.length / 6) === 0 || i === points.length - 1 ? (
          <text key={`l${i}`} x={X(i)} y={h - 6} textAnchor="middle" fontSize="11" fill="#6B7280">
            {p.x}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export function BarChart({ bars, height = 200, format = (v: number) => String(v) }: { bars: { label: string; value: number; highlight?: boolean }[]; height?: number; format?: (v: number) => string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="flex items-end gap-3" style={{ height }} role="img" aria-label={bars.map((b) => `${b.label} ${format(b.value)}`).join(", ")}>
      {bars.map((b) => (
        <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[12px] font-bold text-body">{format(b.value)}</span>
          <div className={`w-full max-w-14 rounded-t-xl ${b.highlight ? "bg-forest" : "bg-sage-line"}`} style={{ height: `${Math.max(4, (b.value / max) * (height - 48))}px` }} />
          <span className="text-[12px] text-muted">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBar({ label, value, max, suffix = "", tone = "bg-forest" }: { label: string; value: number; max: number; suffix?: string; tone?: string }) {
  return (
    <div className="py-2">
      <div className="mb-1.5 flex justify-between text-[14.5px]">
        <span>{label}</span>
        <b>
          {value}
          {suffix}
        </b>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-line-soft">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${(value / (max || 1)) * 100}%` }} />
      </div>
    </div>
  );
}
