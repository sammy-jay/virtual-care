import Link from "next/link";
import type { ReactNode } from "react";
import { IconTile } from "./ui";
import type { IconName } from "./icons";
import { Icon } from "./icons";

/**
 * Confirm dialogs (boards 04.13, 06.9, 10.x …). URL-driven so they work with server actions:
 * the page renders <Modal> when ?dialog=… is present; closing links back to `closeHref`.
 */
export function Modal({
  closeHref,
  title,
  subtitle,
  icon,
  iconTone,
  children,
  width = 520,
}: {
  closeHref: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  iconTone?: "sage" | "gold" | "coral" | "sky" | "forest";
  children: ReactNode;
  width?: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <Link href={closeHref} scroll={false} aria-label="Close dialog" className="absolute inset-0 bg-[linear-gradient(135deg,rgba(231,242,237,.92),rgba(232,239,251,.92))] backdrop-blur-[2px]" />
      <div className="relative w-full rounded-[28px] bg-white p-6 shadow-[0_40px_80px_-30px_rgba(15,70,54,.45)] sm:p-[34px]" style={{ maxWidth: width }}>
        <Link href={closeHref} scroll={false} aria-label="Close" className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full text-muted hover:bg-line-soft">
          <Icon name="x" size={18} />
        </Link>
        {icon && (
          <div className="mb-4">
            <IconTile icon={icon} tone={iconTone} />
          </div>
        )}
        <h2 id="modal-title" className="h-display pr-10 text-[30px] leading-[1.1] sm:text-[32px]">
          {title}
        </h2>
        {subtitle && <p className="mt-2.5 text-[15.5px] text-body">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{children}</div>;
}

export function ModalSummary({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-canvas px-4 py-1">{children}</div>;
}
