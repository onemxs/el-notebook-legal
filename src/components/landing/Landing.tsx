import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale,
  Sparkles,
  ArrowRight,
  Moon,
  Sun,
  FileText,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { AuthModal } from "@/components/auth/AuthModal";

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-panel-solid/70 p-5 text-left shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        {icon}
      </span>
      <h3 className="mt-3 font-serif text-lg font-medium text-ink">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}

export function Landing() {
  const { enterDemo } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  const openAuth = () => setAuthOpen(true);

  const explore = () => {
    enterDemo();
    navigate("/app");
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas text-ink">
      {/* Soft premium backdrop — slate light, cobalt glow, never pure black */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, var(--accent-soft) 0%, transparent 55%), linear-gradient(180deg, var(--elevated) 0%, var(--canvas) 40%)",
        }}
      />

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white">
            <Scale size={18} strokeWidth={1.75} />
          </span>
          <span className="font-serif text-[19px] font-semibold tracking-tight text-ink">
            PasantIA
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={toggle}
            aria-label="Cambiar tema"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink cursor-pointer"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={openAuth}
            className="rounded-full px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-elevated cursor-pointer"
          >
            Iniciar sesión
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-panel-solid/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          <Sparkles size={12} className="text-accent" />
          Inteligencia jurídica · México
        </span>

        <h1 className="mt-6 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-6xl">
          Tu despacho legal,
          <br />
          <span className="text-accent">potenciado por IA</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
          Analiza expedientes, construye la línea del tiempo del caso y redacta escritos con
          fundamentación verificada. Trabaja solo o invita a tu firma — sin alucinaciones.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={openAuth}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px cursor-pointer sm:w-auto"
          >
            Comenzar gratis
            <ArrowRight size={16} />
          </button>
          <button
            onClick={explore}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-hairline bg-panel-solid px-6 py-3 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-elevated cursor-pointer sm:w-auto"
          >
            Explorar sin cuenta
          </button>
        </div>
        <p className="mt-3 text-[12px] text-ink-subtle">
          Explora con datos de ejemplo — sin registro y sin guardar nada.
        </p>

        {/* Features */}
        <div className="mt-16 grid gap-4 text-left sm:grid-cols-3">
          <Feature icon={<FileText size={18} />} title="Expedientes con IA">
            Sube un documento (PDF, Word, imagen o texto) y la IA extrae partes, fechas y la rama
            del derecho.
          </Feature>
          <Feature icon={<CalendarClock size={18} />} title="Línea del tiempo">
            La cronología del caso se construye sola a partir de cada documento que agregas.
          </Feature>
          <Feature icon={<ShieldCheck size={18} />} title="Fundamentación real">
            Cada conclusión queda ligada al texto literal de la ley aplicable. Cero invención.
          </Feature>
        </div>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-6 text-center text-[12px] text-ink-subtle sm:px-8">
          PasantIA · Inteligencia jurídica para abogados de México
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
