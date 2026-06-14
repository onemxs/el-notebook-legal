import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal to <body> so the overlay escapes any ancestor with backdrop-filter /
  // transform, which would otherwise become the containing block for `fixed`.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-[rgba(10,12,18,0.55)] backdrop-blur-md"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${SIZES[size]} max-h-[88vh] overflow-hidden rounded-2xl border border-hairline bg-panel-solid shadow-float outline-none animate-scale-in flex flex-col`}
      >
        <header className="flex items-start gap-3 border-b border-hairline px-6 py-4">
          {icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-xl font-medium leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>
        <div className="scroll-zone flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="border-t border-hairline bg-canvas/40 px-6 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
