import { getSupabase } from "./supabase";

export interface DocumentoGenerado {
  id: string;
  tipo: string;
  nombre: string;
  contenido: string;
  created_at: string;
}

/** Guarda un documento de Notaría Express (sin expediente). Devuelve el id o null. */
export async function guardarDocumentoGenerado(datos: {
  tipo: string;
  nombre: string;
  contenido: string;
}): Promise<string | null> {
  const c = getSupabase();
  if (!c) return null;
  const { data, error } = await c
    .from("documentos_generados")
    .insert([datos])
    .select("id")
    .single();
  return error ? null : (data as { id: string }).id;
}

export async function listarDocumentosGenerados(): Promise<DocumentoGenerado[]> {
  const c = getSupabase();
  if (!c) return [];
  const { data, error } = await c
    .from("documentos_generados")
    .select("id, tipo, nombre, contenido, created_at")
    .order("created_at", { ascending: false });
  return error || !data ? [] : (data as DocumentoGenerado[]);
}

export async function borrarDocumentoGenerado(id: string): Promise<boolean> {
  const c = getSupabase();
  if (!c) return false;
  const { error } = await c.from("documentos_generados").delete().eq("id", id);
  return !error;
}
