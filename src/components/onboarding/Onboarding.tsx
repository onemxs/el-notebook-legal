import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale,
  User,
  Building2,
  IdCard,
  Briefcase,
  ImagePlus,
  Sun,
  Moon,
  MonitorSmartphone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { getSupabase } from "@/lib/supabase";

type Tipo = "individual" | "despacho";
type Tema = "claro" | "oscuro" | "auto";

const input =
  "w-full rounded-xl border border-hairline bg-panel-solid pl-10 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none transition-colors";

function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
        active
          ? "border-accent bg-accent-soft shadow-card"
          : "border-hairline bg-panel-solid hover:border-accent/40"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          active ? "bg-accent text-white" : "bg-elevated text-accent"
        }`}
      >
        {icon}
      </span>
      <span className="font-serif text-base font-medium text-ink">{title}</span>
      <span className="text-[12px] leading-relaxed text-ink-muted">{desc}</span>
    </button>
  );
}

export function Onboarding() {
  const { session, perfil, refreshPerfil } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<Tipo>("individual");
  const [nombreDespacho, setNombreDespacho] = useState("");
  const [nombre, setNombre] = useState(
    perfil?.nombre_completo || (session?.user.user_metadata?.full_name as string) || "",
  );
  const [cedula, setCedula] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [tema, setTema] = useState<Tema>("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickLogo = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("El logotipo debe ser una imagen.");
      return;
    }
    setError(null);
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const applyTema = (t: Tema) => {
    if (t === "claro") setTheme("light");
    else if (t === "oscuro") setTheme("dark");
    else setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  };

  const canNext =
    step === 1
      ? tipo === "individual" || nombreDespacho.trim().length > 1
      : step === 2
        ? nombre.trim().length > 1
        : true;

  const finish = async () => {
    const sb = getSupabase();
    if (!sb || !session) {
      setError("No hay sesión activa.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        const path = `${session.user.id}/${Date.now()}-${logoFile.name.replace(/[^\w.-]/g, "_")}`;
        const up = await sb.storage.from("logotipos").upload(path, logoFile, { upsert: true });
        if (!up.error) logoUrl = sb.storage.from("logotipos").getPublicUrl(path).data.publicUrl;
      }

      const patch: Record<string, unknown> = {
        nombre_completo: nombre.trim(),
        cedula: cedula.trim() || null,
        especialidad: especialidad.trim() || null,
        tema,
        onboarding_completo: true,
      };
      if (logoUrl) patch.logotipo_url = logoUrl;

      const { error: upErr } = await sb.from("perfiles").update(patch).eq("id", session.user.id);
      if (upErr) throw new Error(upErr.message);

      if (tipo === "despacho") {
        const { error: rpcErr } = await sb.rpc("migrar_a_despacho", {
          p_nombre: nombreDespacho.trim() || "Mi Despacho",
          p_logotipo_url: logoUrl,
        });
        if (rpcErr) throw new Error(rpcErr.message);
      }

      applyTema(tema);
      await refreshPerfil();
      navigate("/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar el onboarding.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10 text-ink">
      <div className="w-full max-w-lg">
        {/* Brand + progress */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Scale size={16} />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">PasantIA</span>
        </div>
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === step ? "w-8 bg-accent" : n < step ? "w-8 bg-accent/40" : "w-4 bg-hairline"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-hairline bg-panel-solid p-6 shadow-card sm:p-8">
          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-2xl font-medium">¿Cómo vas a trabajar?</h1>
              <p className="mt-1 text-sm text-ink-muted">Puedes cambiar a despacho más adelante.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  active={tipo === "individual"}
                  onClick={() => setTipo("individual")}
                  icon={<User size={18} />}
                  title="Abogado independiente"
                  desc="Tus expedientes son privados, solo tú los ves."
                />
                <ChoiceCard
                  active={tipo === "despacho"}
                  onClick={() => setTipo("despacho")}
                  icon={<Building2 size={18} />}
                  title="Despacho / Firma"
                  desc="Comparte expedientes con tu equipo e invita colaboradores."
                />
              </div>
              {tipo === "despacho" && (
                <div className="relative mt-4 animate-fade-in">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input
                    className={input}
                    placeholder="Nombre del despacho"
                    value={nombreDespacho}
                    onChange={(e) => setNombreDespacho(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-2xl font-medium">Tu identidad</h1>
              <p className="mt-1 text-sm text-ink-muted">Aparecerá en tus escritos y expedientes.</p>
              <div className="mt-5 space-y-2.5">
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input className={input} placeholder="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="relative">
                  <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input className={input} placeholder="Cédula profesional" value={cedula} onChange={(e) => setCedula(e.target.value)} />
                </div>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
                  <input className={input} placeholder="Especialidad (ej. Penal, Civil, Amparo)" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
                </div>

                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-hairline bg-canvas/40 px-3 py-3 text-left transition-colors hover:border-accent/50 hover:bg-accent-soft/40 cursor-pointer"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-elevated text-accent">
                      <ImagePlus size={18} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">
                      {logoFile ? logoFile.name : "Logotipo (opcional)"}
                    </span>
                    <span className="block text-[11px] text-ink-subtle">PNG, JPG o SVG</span>
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h1 className="font-serif text-2xl font-medium">Apariencia</h1>
              <p className="mt-1 text-sm text-ink-muted">Elige cómo se ve PasantIA.</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {(
                  [
                    { id: "claro", label: "Claro", icon: <Sun size={18} /> },
                    { id: "oscuro", label: "Oscuro", icon: <Moon size={18} /> },
                    { id: "auto", label: "Automático", icon: <MonitorSmartphone size={18} /> },
                  ] as { id: Tema; label: string; icon: React.ReactNode }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setTema(opt.id);
                      applyTema(opt.id);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all cursor-pointer ${
                      tema === opt.id
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-hairline bg-panel-solid text-ink-muted hover:border-accent/40"
                    }`}
                  >
                    {opt.icon}
                    <span className="text-[12px] font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => (step === 1 ? navigate("/app") : setStep((s) => s - 1))}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-muted transition-colors hover:bg-elevated hover:text-ink disabled:opacity-50 cursor-pointer"
            >
              <ArrowLeft size={15} />
              {step === 1 ? "Omitir" : "Atrás"}
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-40 cursor-pointer"
              >
                Siguiente
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={busy}
                className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-50 cursor-pointer"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Finalizar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
