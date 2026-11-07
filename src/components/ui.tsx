import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";
import { Icon, type IconName } from "./icons";

// ─── Buttons ─────────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "outline" | "ink" | "gold" | "danger" | "ghost" | "white";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-forest text-white border-forest hover:bg-forest-deep",
  secondary: "bg-white text-forest border-forest hover:bg-sage",
  outline: "bg-transparent text-ink border-ink hover:bg-ink/5",
  ink: "bg-ink text-white border-ink",
  gold: "bg-gold text-ink border-gold hover:brightness-95",
  danger: "bg-danger text-white border-danger hover:brightness-95",
  ghost: "bg-transparent text-forest border-transparent hover:bg-sage",
  white: "bg-white text-ink border-white",
};
const SIZE: Record<Size, string> = {
  sm: "px-4 py-2 text-[13.5px] min-h-9",
  md: "px-6 py-[11px] text-[15px] min-h-11",
  lg: "px-7 py-[15px] text-base min-h-[52px]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none text-center",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export function Button({ variant, size, className, icon, children, ...rest }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: Size; icon?: IconName }) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={18} strokeWidth={2.1} />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, icon, children, ...rest }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: Size; icon?: IconName }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={18} strokeWidth={2.1} />}
      {children}
    </Link>
  );
}

// ─── Surfaces ────────────────────────────────────────────────────────────────

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("eyebrow", className)}>{children}</div>;
}

export function PageTitle({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-display text-[32px] leading-[1.1] md:text-[38px]">{title}</h1>
        {subtitle && <div className="mt-1.5 text-[15.5px] text-body">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

// ─── Tags ────────────────────────────────────────────────────────────────────

type Tone = "sage" | "gold" | "coral" | "sky" | "gray" | "forest" | "ink";
const TONE: Record<Tone, string> = {
  sage: "bg-sage text-forest",
  gold: "bg-gold-tint text-gold-ink",
  coral: "bg-coral-tint text-coral-ink",
  sky: "bg-sky-tint text-sky",
  gray: "bg-line-soft text-body",
  forest: "bg-forest text-white",
  ink: "bg-ink text-white",
};

export function Tag({ tone = "sage", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold", TONE[tone], className)}>{children}</span>;
}

const STATUS: Record<string, [Tone, string]> = {
  SCHEDULED: ["sky", "Scheduled"],
  PENDING_PAYMENT: ["gold", "Awaiting payment"],
  COMPLETED: ["sage", "Completed"],
  CANCELED: ["gray", "Cancelled"],
  NO_SHOW: ["coral", "No-show"],
  PAID: ["sage", "Paid"],
  FREE: ["gray", "Free"],
  FAILED: ["coral", "Failed"],
  REFUNDED: ["gold", "Refunded"],
  PARTIALLY_REFUNDED: ["gold", "Part refunded"],
  PENDING: ["gold", "Pending"],
  NEW: ["coral", "New"],
  REPLIED: ["sage", "Replied"],
  CLOSED: ["gray", "Closed"],
  ACTIVE: ["sage", "Active"],
  BLOCKED: ["coral", "Blocked"],
  OPEN: ["gold", "Open"],
  DECLINED: ["gray", "Declined"],
  DRAFT: ["gold", "Draft"],
  PUBLISHED: ["sage", "Published"],
};

export function StatusTag({ status }: { status: string }) {
  const [tone, label] = STATUS[status] ?? ["gray", status];
  return <Tag tone={tone}>{label}</Tag>;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

const ALERT = {
  info: ["bg-sky-tint text-sky-ink", "check"],
  success: ["bg-sage text-success", "check"],
  warning: ["bg-gold-tint text-warning", "alert"],
  error: ["bg-coral-tint text-danger", "alert"],
} as const;

export function Alert({ tone = "info", children, className }: { tone?: keyof typeof ALERT; children: ReactNode; className?: string }) {
  const [cls, icon] = ALERT[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-[14px] px-4 py-[13px] text-sm leading-[1.45]", cls, className)}>
      <Icon name={icon} size={18} strokeWidth={2} className="mt-px" />
      <div>{children}</div>
    </div>
  );
}

// ─── Form bits ───────────────────────────────────────────────────────────────

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-danger">
      <Icon name="alert" size={15} strokeWidth={2} />
      {children}
    </p>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...rest
}: ComponentProps<"input"> & { label: ReactNode; name: string; error?: string; hint?: ReactNode }) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} name={name} className="field" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      {error ? <FieldError id={`${id}-err`}>{error}</FieldError> : hint ? <p className="mt-1.5 text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextArea({ label, name, error, className, ...rest }: ComponentProps<"textarea"> & { label: ReactNode; name: string; error?: string }) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <textarea id={id} name={name} className="field min-h-[110px] resize-y" aria-invalid={error ? true : undefined} {...rest} />
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function Select({ label, name, error, children, className, ...rest }: ComponentProps<"select"> & { label: ReactNode; name: string; error?: string }) {
  const id = rest.id ?? `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select id={id} name={name} className="field appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236B7280%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_14px_center] bg-no-repeat pr-10" aria-invalid={error ? true : undefined} {...rest}>
        {children}
      </select>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function Checkbox({ children, name, error, ...rest }: ComponentProps<"input"> & { name: string; error?: string }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-[14.5px] leading-[1.45] text-body">
        <input type="checkbox" name={name} className="mt-0.5 size-5 flex-none accent-forest" aria-invalid={error ? true : undefined} {...rest} />
        <span>{children}</span>
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

// ─── Misc ────────────────────────────────────────────────────────────────────

export function Avatar({ initials, size = 36, tone = "forest" }: { initials: string; size?: number; tone?: "forest" | "sage" | "gold" | "coral" | "sky" }) {
  const t = { forest: "bg-forest text-white", sage: "bg-sage text-forest", gold: "bg-gold-tint text-gold-ink", coral: "bg-coral-tint text-coral-ink", sky: "bg-sky-tint text-sky" }[tone];
  return (
    <span className={cn("inline-flex flex-none items-center justify-center rounded-full font-bold", t)} style={{ width: size, height: size, fontSize: Math.round(size / 3) }}>
      {initials}
    </span>
  );
}

export function Badge({ children, tone = "coral" }: { children: ReactNode; tone?: "coral" | "forest" }) {
  return <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold text-white", tone === "coral" ? "bg-coral" : "bg-forest")}>{children}</span>;
}

export function Row({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-t border-line-soft py-[11px] text-[14.5px] first:border-t-0", className)}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  );
}

export function EmptyState({ icon = "calendar", title, body, action }: { icon?: IconName; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-field bg-white px-6 py-10 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-sage text-forest">
        <Icon name={icon} size={22} />
      </span>
      <div className="font-display text-[22px]">{title}</div>
      {body && <p className="mt-1 max-w-sm text-[14.5px] text-body">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-line-soft", className)} />;
}

export function Toggle({ name, defaultChecked, label, description }: { name: string; defaultChecked?: boolean; label: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3.5 border-t border-line-soft py-3.5 first:border-t-0">
      <span className="flex-1">
        <b>{label}</b>
        {description && <span className="block text-[13px] text-muted">{description}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative h-[26px] w-11 flex-none rounded-full bg-field transition-colors peer-checked:bg-forest peer-focus-visible:outline-3 peer-focus-visible:outline-forest/40 after:absolute after:left-[3px] after:top-[3px] after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[18px]" />
    </label>
  );
}

export function IconTile({ icon, tone = "sage", size = 56 }: { icon: IconName; tone?: "sage" | "gold" | "coral" | "sky" | "forest"; size?: number }) {
  const t = { sage: "bg-sage text-forest", gold: "bg-gold-tint text-gold-ink", coral: "bg-coral-tint text-danger", sky: "bg-sky-tint text-sky", forest: "bg-forest text-white" }[tone];
  return (
    <div className={cn("flex flex-none items-center justify-center rounded-[18px]", t)} style={{ width: size, height: size }}>
      <Icon name={icon} size={Math.round(size * 0.46)} strokeWidth={1.8} />
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-[22px] font-normal">{children}</h2>
      {action}
    </div>
  );
}
