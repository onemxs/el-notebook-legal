import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2, AlertTriangle, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// Migración individual → despacho desde la app (reusa el RPC migrar_a_despacho,
// que crea la org, nombra dueño y ELEVA los expedientes existentes).
export function CrearDespachoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refreshPerfil } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { error: rpcErr } = await sb.rpc("migrar_a_despacho", {
      p_nombre: nombre.trim() || "Mi Despacho",
      p_logotipo_url: null,
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setBusy(false);
      return;
    }
    await refreshPerfil();
    setBusy(false);
    onClose();
    navigate("/equipo");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      icon={<Building2 size={18} />}
      title="Crear despacho"
      subtitle="Pasa de cuenta individual a despacho"
    >
      <div className="animate-fade-in">
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-accent-soft px-3.5 py-3 text-accent">
          <Users size={16} className="mt-0.5 shrink-0" />
          <p className="text-[12px] leading-relaxed">
            Tus expedientes actuales se comparten con tu equipo y podrás invitar colaboradores. Tú
            quedas como <strong>dueño</strong>.
          </p>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-ink-muted" htmlFor="despachoNombre">
          Nombre del despacho
        </label>
        <div className="relative">
          <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            id="despachoNombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && crear()}
            placeholder="Ej. Méndez & Asociados"
            autoFocus
            className="w-full rounded-xl border border-hairline bg-panel-solid pl-10 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:outline-none"
          />
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={crear}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-tactile transition-all hover:bg-accent-hover active:translate-y-px disabled:opacity-50 cursor-pointer"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Crear despacho
        </button>
      </div>
    </Modal>
  );
}
