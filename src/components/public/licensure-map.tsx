import { MapHover } from "./map-hover";
import { US_MAP_VIEWBOX, US_STATE_SHAPES } from "./us-map-shapes";

// States too small to hold a label; they are named in the tooltip and the list below the map.
const NO_LABEL = new Set(["CT", "DC", "DE", "HI", "MA", "MD", "NH", "NJ", "RI", "VT"]);
// Nudges for states whose geographic centroid falls in an awkward spot (water, a panhandle, a coast).
const LABEL_NUDGE: Record<string, [number, number]> = { FL: [12, 6], MI: [12, 22], LA: [-8, 0], KY: [6, 2], ID: [0, 16], CA: [-8, 0], NY: [6, 4] };

/**
 * US map of where Dr. Oparaji is licensed: licensed states in forest, others neutral. Identity is
 * never colour alone: licensed states carry a label, the tooltip names each state, and the full list
 * is printed below (the map's table view).
 */
export function LicensureMap({ states }: { states: string[] }) {
  const licensed = new Set(states);
  const names = US_STATE_SHAPES.filter((s) => licensed.has(s.code)).map((s) => s.name);
  return (
    <figure>
      <MapHover>
        <svg viewBox={US_MAP_VIEWBOX} className="h-auto w-full" role="img" aria-label={`Map of the United States. Dr. Oparaji is licensed in ${names.length} states: ${names.join(", ")}.`}>
          {US_STATE_SHAPES.map((s) => {
            const on = licensed.has(s.code);
            return (
              <path
                key={s.code}
                d={s.d}
                data-name={s.name}
                data-licensed={on ? "1" : "0"}
                className={on ? "fill-forest transition-colors hover:fill-forest-deep" : "fill-[#E4E9E6] transition-colors hover:fill-[#D3DAD6]"}
                stroke="#fff"
                strokeWidth={1.25}
                strokeLinejoin="round"
              />
            );
          })}
          <g aria-hidden="true" className="pointer-events-none select-none">
            {US_STATE_SHAPES.filter((s) => licensed.has(s.code) && !NO_LABEL.has(s.code)).map((s) => {
              const [dx, dy] = LABEL_NUDGE[s.code] ?? [0, 0];
              return (
                <text key={s.code} x={s.cx + dx} y={s.cy + dy} textAnchor="middle" dominantBaseline="central" className="fill-white text-[13px] font-bold tracking-wide">
                  {s.code}
                </text>
              );
            })}
          </g>
        </svg>
      </MapHover>

      <figcaption className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-body">
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-[4px] bg-forest" /> Licensed ({names.length} states)
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-[4px] bg-[#E4E9E6]" /> Not licensed yet
        </span>
      </figcaption>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="States where Dr. Oparaji is licensed">
        {names.map((n) => (
          <li key={n} className="rounded-full border border-sage-line bg-sage px-3 py-1 text-[13px] font-semibold text-sage-ink">
            {n}
          </li>
        ))}
      </ul>
    </figure>
  );
}
