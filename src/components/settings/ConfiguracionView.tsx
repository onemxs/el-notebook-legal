import { useState } from "react";
import { UserRound, Building2, ShieldCheck, Users, Copy, CheckCheck, Upload, Award, Save, MapPin } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";
import { actualizarPerfil } from "@/lib/supabase";
import { Toggle } from "@/components/ui/Toggle";

function Bar({ used, limit, label, detail }: { used: number; limit: number; label: string; detail: string }) {
  const pct = Math.round((used / limit) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="font-medium text-[#022448] dark:text-white">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">{used.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: "#022448" }} />
      </div>
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{detail}</p>
    </div>
  );
}

const MIEMBROS_SIMULADOS = [
  { id: "1", nombre_completo: "Lic. Omar Hernández", rol_organizacion: "dueno" as const, ultima_conexion: "Hace 2 min" },
  { id: "2", nombre_completo: "Lic. María F. López", rol_organizacion: "invitado" as const, ultima_conexion: "Hace 15 min" },
  { id: "3", nombre_completo: "Lic. Roberto Méndez", rol_organizacion: "invitado" as const, ultima_conexion: "Ayer 6:30pm" },
];

export function ConfiguracionView() {
  const { settings, updateSettings, systemUsage, members, referralData } = useWorkspace();
  const { perfil, refreshPerfil } = useAuth();
  const [nombreDespacho, setNombreDespacho] = useState("Mi Despacho");
  const [especialidad, setEspecialidad] = useState(perfil?.especialidad ?? "");
  const [cedula, setCedula] = useState(perfil?.cedula ?? "");
  const [telefono, setTelefono] = useState(perfil?.telefono_despacho ?? "");
  const [direccion, setDireccion] = useState(perfil?.domicilio_despacho ?? "");
  const [ciudad, setCiudad] = useState(perfil?.ciudad_despacho ?? "");
  const [entidad, setEntidad] = useState(perfil?.entidad_despacho ?? "");
  const [copiado, setCopiado] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isDespacho = settings.accountMode === "despacho";

  const guardarPerfil = async () => {
    setIsSaving(true);
    setSaveError(null);
    const { error } = await actualizarPerfil({
      cedula: cedula.trim() || null,
      especialidad: especialidad.trim() || null,
      ciudad_despacho: ciudad.trim() || null,
      entidad_despacho: entidad.trim() || null,
      domicilio_despacho: direccion.trim() || null,
      telefono_despacho: telefono.trim() || null,
    });
    await refreshPerfil();
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText("PAS-47D2-K9M8").then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };
  const copiarReferral = () => {
    navigator.clipboard.writeText(`https://pasantia.mx/registro?ref=${referralData.inviteCode}`).then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2500);
    });
  };

  return (
    <div className="flex h-full overflow-y-auto bg-canvas scroll-zone">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="font-serif text-2xl font-medium text-[#022448] dark:text-white">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Identidad del despacho, consumo y colaboración</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* ─── Left column ─── */}
          <div className="space-y-6">
            {/* Perfil */}
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[#022448] dark:text-white">
                <UserRound size={16} /> Perfil del Despacho
              </h2>
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="input-nombre-despacho" className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Nombre del Despacho</label>
                  <input
                    id="input-nombre-despacho"
                    name="nombre_despacho"
                    value={nombreDespacho}
                    onChange={(e) => setNombreDespacho(e.target.value)}
                    className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white focus:dark:border-blue-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="input-especialidad" className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Especialidad</label>
                  <input
                    id="input-especialidad"
                    name="especialidad"
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    placeholder="Ej. Mercantil, Civil, Laboral"
                    className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white focus:dark:border-blue-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="input-cedula" className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Cédula Profesional</label>
                  <input
                    id="input-cedula"
                    name="cedula_profesional"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej. 12345678"
                    className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white focus:dark:border-blue-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="input-telefono" className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Teléfono de Contacto</label>
                  <input
                    id="input-telefono"
                    name="telefono_contacto"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. +52 55 1234 5678"
                    className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white focus:dark:border-blue-500/50"
                  />
                </div>
                <div>
                  <label htmlFor="input-direccion" className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Dirección del Despacho</label>
                  <input
                    id="input-direccion"
                    name="direccion_despacho"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej. Calle Hidalgo 43, Col. Centro, CP 95700"
                    className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white focus:dark:border-blue-500/50"
                  />
                </div>
                {/* Ubicación: se usa para FECHAR y FIRMAR los escritos en el lugar real (no CDMX). */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-ciudad" className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      <MapPin size={11} /> Ciudad / Municipio
                    </label>
                    <input
                      id="input-ciudad"
                      name="ciudad_despacho"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej. San Andrés Tuxtla"
                      className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white focus:dark:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-entidad" className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Estado</label>
                    <input
                      id="input-entidad"
                      name="entidad_despacho"
                      value={entidad}
                      onChange={(e) => setEntidad(e.target.value)}
                      placeholder="Ej. Veracruz"
                      className="w-full rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm text-[#022448] placeholder:text-gray-300 focus:border-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white focus:dark:border-blue-500/50"
                    />
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
                  Esta ubicación se usa para fechar y firmar tus escritos en tu ciudad real (no "Ciudad de México").
                </p>
                <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white/40 px-4 py-5 text-center transition-colors hover:border-[#022448]/50 dark:border-white/20 dark:bg-white/[0.04] dark:hover:border-white/40">
                  <Upload size={20} className="text-[#022448]/60 dark:text-white/60" />
                  <div>
                    <p className="text-[12px] font-medium text-[#022448] dark:text-white">Subir logotipo del bufete</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">PNG, JPG · 500×500 px recomendado</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Servidor */}
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#022448] dark:text-white">
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
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[#022448] dark:text-white">
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
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[#022448] dark:text-white">
                <Users size={16} /> Despacho Multi-Abogado
              </h2>
              <div className="mb-4 flex items-center justify-between rounded-xl border border-hairline bg-white/50 px-4 py-3 dark:bg-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#022448]/10 text-[#022448] dark:bg-white/[0.08] dark:text-white">
                    {isDespacho ? <Building2 size={16} /> : <UserRound size={16} />}
                  </span>
                  <div>
                    <p className="text-[12px] font-medium text-[#022448] dark:text-white">{isDespacho ? "Modo Despacho" : "Modo Abogado"}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{isDespacho ? "Todos los expedientes del equipo" : "Solo tus expedientes asignados"}</p>
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
                    <label htmlFor="input-codigo-invitacion" className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Código de Invitación</label>
                    <div className="flex gap-2">
                      <input
                        id="input-codigo-invitacion"
                        name="codigo_invitacion"
                        readOnly
                        value="PAS-47D2-K9M8"
                        className="flex-1 rounded-lg border border-hairline bg-white/80 px-3 py-2 text-sm font-mono tracking-widest text-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white"
                      />
                      <button
                        onClick={copiarCodigo}
                        className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white/80 px-3 py-2 text-[11px] font-medium text-[#022448] transition-colors hover:bg-white cursor-pointer dark:bg-black/40 dark:border-white/10 dark:text-white dark:hover:bg-white/[0.08]"
                      >
                        {copiado ? <CheckCheck size={14} /> : <Copy size={14} />}
                        {copiado ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">Comparte este código con tus colegas para que se unan al despacho</p>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">Equipo ({members.length || MIEMBROS_SIMULADOS.length})</p>
                    <div className="space-y-1.5">
                      {(members.length > 0 ? members : MIEMBROS_SIMULADOS).map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-hairline bg-white/40 px-3 py-2.5 dark:bg-white/[0.04]"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#022448]/10 text-[11px] font-bold text-[#022448] dark:bg-white/[0.08] dark:text-white">
                            {(m.nombre_completo ?? "?")[0]}
                          </div>
                          <div className="flex-1">
                            <p className="text-[12px] font-medium text-[#022448] dark:text-white">{m.nombre_completo}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{m.rol_organizacion === "dueno" ? "Dueño" : m.rol_organizacion === "invitado" ? "Invitado" : m.rol_organizacion}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{m.ultima_conexion ?? "Desconectado"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Programa de Referidos */}
            <div className="rounded-2xl border border-white/80 bg-white/60 p-5 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04] dark:shadow-2xl">
              <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[#022448] dark:text-white">
                <Award size={16} /> Programa de Referidos Jurídicos
              </h2>
              <div className="mb-4">
                <label htmlFor="input-enlace-referido" className="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Tu enlace de invitación</label>
                <div className="flex gap-2">
                  <input
                    id="input-enlace-referido"
                    name="enlace_referido"
                    readOnly
                    value={`https://pasantia.mx/registro?ref=${referralData.inviteCode}`}
                    className="flex-1 rounded-lg border border-hairline bg-white/80 px-3 py-2 text-[11px] font-mono text-[#022448] focus:outline-none dark:bg-black/40 dark:border-white/10 dark:text-white"
                  />
                  <button
                    onClick={copiarReferral}
                    className="flex items-center gap-1.5 rounded-lg border border-hairline bg-white/80 px-3 py-2 text-[11px] font-medium text-[#022448] transition-colors hover:bg-white cursor-pointer"
                  >
                    {referralCopied ? <CheckCheck size={14} /> : <Copy size={14} />}
                    {referralCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/60 bg-white/40 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Abogados Invitados</p>
                  <p className="mt-1 font-serif text-2xl font-medium text-[#022448] dark:text-white">{referralData.totalInvited}</p>
                </div>
                <div className="rounded-xl border border-white/60 bg-white/40 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Registros Exitosos</p>
                  <p className="mt-1 font-serif text-2xl font-medium text-[#022448] dark:text-white">{referralData.activeSubscriptions}</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50/70 px-4 py-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-green-600">Próxima Factura</p>
                  <p className="mt-1 text-[12px] font-semibold text-green-800">
                    {referralData.stripeRewardApplied ? "Próximo mes: $0.00 MXN (Bonificación Aplicada)" : "Próximo mes: Pendiente"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button
            onClick={guardarPerfil}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-[#022448] px-6 py-2.5 font-medium text-white shadow-md transition-all hover:bg-[#022448]/90 active:scale-95 disabled:opacity-60 dark:bg-accent dark:text-[#090D16]"
          >
            <Save size={16} className={isSaving ? "animate-spin" : ""} />
            {isSaving ? "Guardando…" : "Guardar Configuración"}
          </button>
        </div>
      </div>
      {/* Toasts */}
      {saveSuccess && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-xl bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-float">
          Configuración guardada con éxito
        </div>
      )}
      {saveError && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-xl bg-danger px-5 py-3 text-sm font-medium text-white shadow-float">
          No se pudo guardar: {saveError}
        </div>
      )}
      {referralCopied && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-xl bg-[#022448] px-5 py-3 text-sm font-medium text-white shadow-float">
          ¡Enlace de invitación copiado con éxito!
        </div>
      )}
    </div>
  );
}
