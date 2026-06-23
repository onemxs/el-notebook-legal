import { useState } from "react";
import { UserRound, Building2, ShieldCheck, Users, Copy, CheckCheck, Upload, ArrowLeft } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";
import { Toggle } from "@/components/ui/Toggle";

function Bar({ used, limit, label, detail }: { used: number; limit: number; label: string; detail: string }) {
  const pct = Math.round((used / limit) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-medium text-[#022448]">{label}</span>
        <span className="text-gray-500">{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "#022448" }} />
      </div>
      <p className="mt-1 text-[11px] text-gray-500">{detail}</p>
    </div>
  );
}

const MIEMBROS_SIMULADOS = [
  { nombre: "Lic. Omar Hernández", rol: "Dueño", ultima: "Hace 2 min" },
  { nombre: "Lic. María F. López", rol: "Colaborador", ultima: "Hace 15 min" },
  { nombre: "Lic. Roberto Méndez", rol: "Colaborador", ultima: "Ayer 6:30pm" },
];

export function ConfiguracionView() {
  const { settings, updateSettings, systemUsage, members } = useWorkspace();
  const { perfil } = useAuth();
  const [nombreDespacho, setNombreDespacho] = useState("Mi Despacho");
  const [especialidad, setEspecialidad] = useState(perfil?.especialidad ?? "");
  const [cedula, setCedula] = useState("");
  const [copiado, setCopiado] = useState(false);
  const isDespacho = settings.accountMode === "despacho";

  const copiarCodigo = () => {
    navigator.clipboard.writeText("PAS-47D2-K9M8").then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div className="flex h-full overflow-y-auto bg-canvas scroll-zone">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="font-serif text-2xl font-medium text-[#022448]">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">Identidad del despacho, consumo y colaboración</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* ─── Left column ─── */}
          <div className="space-y-6">
            {/* Perfil */}
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md">
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[#022448]">
                <UserRound size={16} /> Perfil del Despacho
              </h2>
              <div className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Nombre del Despacho</label>
                  <input
                    value={nombreDespacho}
                    onChange={(e) => setNombreDespacho(e.target.value)}
                    className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Especialidad</label>
                  <input
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    placeholder="Ej. Mercantil, Civil, Laboral"
                    className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-gray-500">Cédula Profesional</label>
                  <input
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej. 12345678"
                    className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none"
                  />
                </div>
                <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white/40 px-4 py-5 text-center transition-colors hover:border-[#022448]/50">
                  <Upload size={20} className="text-[#022448]/60" />
                  <div>
                    <p className="text-[12px] font-medium text-[#022448]">Subir logotipo del bufete</p>
                    <p className="text-[10px] text-gray-400">PNG, JPG · 500×500 px recomendado</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Servidor */}
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md">
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#022448]">
                <ShieldCheck size={16} /> Servidor
              </h2>
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-green-500 shadow-sm" />
                <div>
                  <p className="text-[12px] font-medium text-green-800">Conectado con éxito</p>
                  <p className="text-[11px] text-green-600">Base de Datos Procesal en la Nube de PasantIA</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right column ─── */}
          <div className="space-y-6">
            {/* Plan y Consumo */}
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md">
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[#022448]">
                <Building2 size={16} /> Plan y Consumo
              </h2>
              <div className="space-y-5">
                <Bar
                  used={systemUsage.iaCreditsUsed}
                  limit={systemUsage.iaCreditsLimit}
                  label="Créditos de Inteligencia Artificial"
                  detail={`${Math.round((systemUsage.iaCreditsUsed / systemUsage.iaCreditsLimit) * 100)}% de créditos de IA consumidos este mes`}
                />
                <Bar
                  used={systemUsage.localAudioMinutesUsed}
                  limit={systemUsage.localAudioMinutesLimit}
                  label="Procesamiento Local de Audiencias"
                  detail="90 de 180 minutos de procesamiento de audio local utilizados (Coste de servidor: Incluido en Plan)"
                />
              </div>
            </div>

            {/* Despacho Multi-Abogado */}
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md">
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[#022448]">
                <Users size={16} /> Despacho Multi-Abogado
              </h2>
              <div className="mb-4 flex items-center justify-between rounded-xl border border-hairline bg-white/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#022448]/10 text-[#022448]">
                    {isDespacho ? <Building2 size={16} /> : <UserRound size={16} />}
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-[#022448]">{isDespacho ? "Modo Despacho" : "Modo Abogado"}</p>
                    <p className="text-[10px] text-gray-500">{isDespacho ? "Todos los expedientes del equipo" : "Solo tus expedientes asignados"}</p>
                  </div>
                </div>
                <Toggle
                  checked={isDespacho}
                  onChange={(v) => updateSettings({ accountMode: v ? "despacho" : "abogado" })}
                  label="Alternar modo"
                />
              </div>

              {isDespacho && (
                <>
                  <div className="mb-4">
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">Código de Invitación</label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value="PAS-47D2-K9M8"
                        className="flex-1 rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm font-mono tracking-widest text-[#022448] focus:outline-none"
                      />
                      <button
                        onClick={copiarCodigo}
                        className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white/80 px-3 py-2 text-[11px] font-medium text-[#022448] transition-colors hover:bg-white cursor-pointer"
                      >
                        {copiado ? <CheckCheck size={14} /> : <Copy size={14} />}
                        {copiado ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">Comparte este código con tus colegas para que se unan al despacho</p>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-medium text-gray-500">Equipo ({members.length || MIEMBROS_SIMULADOS.length})</p>
                    <div className="space-y-1.5">
                      {(members.length > 0 ? members : MIEMBROS_SIMULADOS).map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-hairline bg-white/40 px-3 py-2.5"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#022448]/10 text-[11px] font-bold text-[#022448]">
                            {(m.nombre ?? m.nombre_completo ?? "?")[0]}
                          </div>
                          <div className="flex-1">
                            <p className="text-[12px] font-medium text-[#022448]">{m.nombre ?? m.nombre_completo}</p>
                            <p className="text-[10px] text-gray-500">{m.rol ?? m.rol_organizacion}</p>
                          </div>
                          <span className="text-[10px] text-gray-400">{m.ultima ?? "Desconectado"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
