import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale,
  Sparkles,
  ArrowRight,
  FolderOpen,
  History,
  ShieldCheck,
  Lock,
  PenSquare,
  MapPin,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/auth/AuthModal";
import { GoogleIcon } from "@/components/ui/GoogleIcon";

function GlassCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-white/40 bg-white/60 p-6 shadow-lg shadow-black/[0.02] backdrop-blur-md transition-all duration-300 hover:border-white/60 hover:shadow-xl hover:shadow-black/[0.04]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#1E3A5F]/10 to-[#1E3A5F]/5 text-[#1E3A5F] ring-1 ring-[#1E3A5F]/10 transition-all duration-300 group-hover:scale-105 group-hover:from-[#1E3A5F]/20 group-hover:to-[#1E3A5F]/10">
        {icon}
      </span>
      <h3 className="mt-4 font-serif text-lg font-medium text-[#1E3A5F]">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[#1E3A5F]/60">{children}</p>
    </div>
  );
}

export function Landing() {
  const { enterDemo } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  const openAuth = () => setAuthOpen(true);

  const explore = () => {
    enterDemo();
    navigate("/app");
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#FBF9F3] text-[#1E3A5F]">
      {/* Glass backdrop orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#1E3A5F]/[0.02] blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-[400px] w-[400px] rounded-full bg-[#1E3A5F]/[0.015] blur-3xl" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/30 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E3A5F] text-white shadow-sm">
              <Scale size={17} strokeWidth={1.75} />
            </span>
            <span className="font-serif text-[19px] font-semibold tracking-tight text-[#1E3A5F]">
              PasantIA
            </span>
          </div>

          <div className="ml-3 hidden items-center gap-1 rounded-full border border-white/30 bg-white/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1E3A5F]/50 backdrop-blur-sm sm:flex">
            <MapPin size={10} />
            México
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={openAuth}
              className="flex items-center gap-2 rounded-full bg-[#1E3A5F] px-4 py-2 text-[13px] font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#1E3A5F]/90 active:translate-y-px cursor-pointer sm:px-5"
            >
              <GoogleIcon mono size={15} />
              <span className="hidden sm:inline">Acceder con Google</span>
              <span className="sm:hidden">Acceder</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-12 sm:pt-24">
        <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-start">
          {/* Hero text block */}
          <div className="flex-1 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/60 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1E3A5F]/50 shadow-sm backdrop-blur-sm">
              <Sparkles size={12} className="text-[#1E3A5F]" />
              Procesal verídica · México
            </span>

            <h1 className="mt-8 font-serif text-[clamp(2rem,5vw,3.75rem)] font-medium leading-[1.06] tracking-tight text-[#1E3A5F]">
              Tu despacho legal,
              <br />
              <span className="text-[#1E3A5F]">
                potenciado por IA <span className="italic">procesal verídica</span>
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-[clamp(0.9rem,1.8vw,1.05rem)] leading-relaxed text-[#1E3A5F]/60 sm:mx-0">
              Analiza expedientes reales — extrae partes, construye la cronología y genera escritos
              fundamentados desde el corpus legal indexado. Sin machotes, sin alucinaciones, sin relleno.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={openAuth}
                className="flex items-center justify-center gap-2.5 rounded-full bg-[#1E3A5F] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#1E3A5F]/20 transition-all duration-200 hover:bg-[#1E3A5F]/90 hover:shadow-xl hover:shadow-[#1E3A5F]/25 active:translate-y-px cursor-pointer"
              >
                <GoogleIcon mono size={17} />
                Comenzar con Google
                <ArrowRight size={16} />
              </button>
              <button
                onClick={explore}
                className="flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/60 px-7 py-3.5 text-sm font-semibold text-[#1E3A5F] shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/80 hover:shadow-md active:translate-y-px cursor-pointer"
              >
                Explorar sin cuenta
              </button>
            </div>
            <p className="mt-4 text-[12px] text-[#1E3A5F]/40">
              Datos de ejemplo · sin registro · nada se guarda
            </p>
          </div>

          {/* Mockup conceptual — Apelación preview */}
          <div className="relative w-full max-w-[380px] shrink-0 sm:mt-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/70 shadow-xl shadow-black/[0.04] backdrop-blur-xl">
              <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
                <Scale size={220} strokeWidth={0.5} className="text-[#1E3A5F]" />
              </div>

              <div className="relative p-6 pb-5 sm:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#1E3A5F]/40">
                  Recurso de Apelación
                </p>
                <h4 className="mt-2 font-serif text-[15px] font-medium leading-snug text-[#1E3A5F]">
                  ...resulta agravante la omisión de los principios de oralidad y contradicción en el
                  desahogo de la prueba pericial, vulnerando el debido proceso...
                </h4>
                <p className="mt-3 text-[11px] leading-relaxed text-[#1E3A5F]/50">
                  ...en concordancia con el criterio jurisprudencial emitido por la SCJN, la resolución
                  carece de fundamentación y motivación...
                </p>
                <div className="mt-4 flex items-center gap-3 border-t border-white/30 pt-3 text-[10px] font-medium text-[#1E3A5F]/40">
                  <span className="flex items-center gap-1">
                    <BookOpen size={10} />
                    Toca: ______
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    San Andrés Tuxtla, Ver.
                  </span>
                </div>
              </div>

              <div className="absolute -right-2.5 -top-2.5 flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-[#1E3A5F] shadow-sm backdrop-blur-md">
                  <ShieldCheck size={10} className="text-[#1E3A5F]" />
                  Hechos analizados: 100%
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-[#1E3A5F] shadow-sm backdrop-blur-md">
                  <BookOpen size={10} className="text-[#1E3A5F]" />
                  Fundamento: Art. 251 CNPP
                </span>
              </div>
            </div>

            <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-6 -z-10 h-32 w-32 rounded-full bg-[#1E3A5F]/[0.03] blur-2xl" />
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-20 grid gap-5 text-left sm:grid-cols-3">
          <GlassCard icon={<FolderOpen size={18} />} title="El Archivero">
            Ingestión masiva de expedientes. Extracción quirúrgica de hechos, partes procesales y
            elementos clave desde documentos PDF y Word.
          </GlassCard>
          <GlassCard icon={<History size={18} />} title="La Línea del Tiempo">
            Cronología dinámica automatizada. Visualiza cada hito procesal y recibe alertas
            inteligentes sobre plazos de prescripción y caducidad.
          </GlassCard>
          <GlassCard icon={<PenSquare size={18} />} title="El Motor RAG">
            Redacción de alta escuela. Generación de clausulado complejo utilizando recuperación de
            vectores para inyectar artículos legales precisos.
          </GlassCard>
        </div>

        {/* Privacy block */}
        <div className="mt-20 rounded-2xl border border-white/40 bg-white/50 p-8 text-left backdrop-blur-md sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#1E3A5F]/10 to-[#1E3A5F]/5 text-[#1E3A5F] ring-1 ring-[#1E3A5F]/10">
              <Lock size={20} />
            </span>
            <div>
              <h2 className="font-serif text-xl font-medium text-[#1E3A5F]">
                Sesión Segura y cifrada de extremo a extremo
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#1E3A5F]/60">
                Protección estricta del secreto profesional. Encriptación de grado bancario para cada
                folio procesal.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/30 bg-white/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-8 text-center sm:flex-row sm:justify-between sm:py-6">
          <p className="text-[12px] text-[#1E3A5F]/40">
            PasantIA · Inteligencia jurídica para abogados de México
          </p>
          <p className="text-[11px] text-[#1E3A5F]/30">
            &copy; {new Date().getFullYear()} · Todos los derechos reservados
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
