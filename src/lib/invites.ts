import { getSupabase } from "./supabase";

export interface Miembro {
  id: string;
  nombre_completo: string | null;
  especialidad: string | null;
  rol_organizacion: "dueno" | "invitado" | "ninguno";
}

export interface Invitacion {
  id: string;
  email_invitado: string;
  token: string;
  estado: "pendiente" | "aceptada" | "expirada";
  created_at: string;
  expires_at: string;
}

/** Members of the caller's organization (RLS restricts to the same org). */
export async function listarMiembros(): Promise<Miembro[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("perfiles")
    .select("id, nombre_completo, especialidad, rol_organizacion")
    .not("organizacion_id", "is", null);
  return (data as Miembro[]) ?? [];
}

/** Invitations for the caller's organization (RLS restricts to the same org). */
export async function listarInvitaciones(): Promise<Invitacion[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("invitaciones")
    .select("id, email_invitado, token, estado, created_at, expires_at")
    .order("created_at", { ascending: false });
  return (data as Invitacion[]) ?? [];
}

/** Create an invitation for a colleague. RLS enforces: caller is the org's dueño. */
export async function crearInvitacion(
  organizacionId: string,
  email: string,
): Promise<{ token?: string; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { error: "Sin conexión a Supabase." };
  const { data, error } = await sb
    .from("invitaciones")
    .insert({ organizacion_id: organizacionId, email_invitado: email.trim().toLowerCase() })
    .select("token")
    .single();
  if (error) return { error: error.message };
  return { token: (data as { token: string }).token };
}

/** Build the shareable acceptance link for an invitation token. */
export function enlaceInvitacion(token: string): string {
  return `${window.location.origin}/invitacion/${token}`;
}
