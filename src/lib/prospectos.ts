import { getSupabase } from "./supabase";

export type EstadoProspecto = "nuevo" | "contactado" | "reunion" | "propuesta" | "ganado" | "perdido";

export interface Prospecto {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  asunto: string | null;
  rama: string | null;
  fuente: string | null;
  estado: EstadoProspecto;
  valor_estimado: number | null;
  notas: string | null;
  caso_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NuevoProspecto = Pick<Prospecto, "nombre"> &
  Partial<Pick<Prospecto, "telefono" | "email" | "asunto" | "rama" | "fuente" | "valor_estimado" | "notas">>;

export const ESTADOS: { id: EstadoProspecto; label: string }[] = [
  { id: "nuevo", label: "Nuevo" },
  { id: "contactado", label: "Contactado" },
  { id: "reunion", label: "Reunión" },
  { id: "propuesta", label: "Propuesta" },
  { id: "ganado", label: "Ganado" },
  { id: "perdido", label: "Perdido" },
];

export async function listarProspectos(): Promise<Prospecto[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c.from("prospectos").select("*").order("created_at", { ascending: false });
  return error || !data ? [] : (data as Prospecto[]);
}

export async function crearProspecto(p: NuevoProspecto): Promise<Prospecto | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c.from("prospectos").insert([p]).select().single();
  return error ? null : (data as Prospecto);
}

export async function actualizarProspecto(
  id: string,
  cambios: Partial<Omit<Prospecto, "id" | "created_at" | "updated_at">>,
): Promise<boolean> {
  const c = getSupabase();
  if (!c) return false;
  const { error } = await c.from("prospectos").update(cambios).eq("id", id);
  return !error;
}

export async function borrarProspecto(id: string): Promise<boolean> {
  const c = getSupabase();
  if (!c) return false;
  const { error } = await c.from("prospectos").delete().eq("id", id);
  return !error;
}
