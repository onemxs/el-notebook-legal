import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Article } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the public Supabase config is present (RLS-protected reads). */
export const SUPA_CONFIGURED = Boolean(url && anon);

let client: SupabaseClient | null = null;
function db(): SupabaseClient | null {
  if (!SUPA_CONFIGURED) return null;
  if (!client)
    client = createClient(url!, anon!, {
      // Auth must persist + auto-refresh, and detect the OAuth tokens that Google
      // returns in the URL hash after redirect.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  return client;
}

/** The shared Supabase client (or null when not configured) — used by auth. */
export function getSupabase(): SupabaseClient | null {
  return db();
}

/** Exact-article lookup for the article viewer (no embedding needed). */
export async function fetchArticulo(codigo: string, articulo: string): Promise<Article | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("leyes_articulos")
    .select("codigo, full_code, rama, articulo, texto, source")
    .eq("codigo", codigo)
    .eq("articulo", articulo)
    .maybeSingle();
  if (error || !data) return null;
  return {
    code: data.codigo,
    fullCode: data.full_code,
    article: data.articulo,
    heading: "",
    text: data.texto,
    source: data.source,
  };
}

export interface MatchedArticulo {
  codigo: string;
  full_code: string;
  rama: string;
  articulo: string;
  texto: string;
  source: string;
  similarity: number;
}

// ────────────────────────────────────────────────────────────────
// Persistencia: Casos, Documentos, Chat
// ────────────────────────────────────────────────────────────────

export interface CasoRow {
  id: string;
  nombre: string;
  rama: string;
  asunto?: string;
  resumen?: string;
  partes: { label: string; value: string }[];
  fechas_clave: { label: string; value: string }[];
  leyes_sugeridas: string[];
  confianza: number;
  archivado: boolean;
  abogado_asignado_id?: string | null;
  creado_en: string;
}

export interface DocumentoRow {
  id: string;
  caso_id: string;
  nombre: string;
  tipo: "pdf" | "video" | "transcription" | "text" | "image";
  contenido?: string;
  duracion_segundos?: number;
  timestamps?: boolean;
  idioma?: string;
  storage_path?: string;
  tamaño_bytes?: number;
  creado_en: string;
}

export async function crearCaso(datos: {
  nombre: string;
  rama: string;
  asunto?: string;
  resumen?: string;
  partes?: { label: string; value: string }[];
  fechas_clave?: { label: string; value: string }[];
  leyes_sugeridas?: string[];
  confianza?: number;
  abogado_asignado_id?: string;
}): Promise<CasoRow | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("casos")
    .insert([
      {
        nombre: datos.nombre,
        rama: datos.rama,
        asunto: datos.asunto ?? null,
        resumen: datos.resumen ?? null,
        partes: datos.partes ?? [],
        fechas_clave: datos.fechas_clave ?? [],
        leyes_sugeridas: datos.leyes_sugeridas ?? [],
        confianza: datos.confianza ?? 0.95,
        abogado_asignado_id: datos.abogado_asignado_id ?? null,
      },
    ])
    .select()
    .single();
  return error ? null : (data as CasoRow);
}

export async function obtenerCasos(): Promise<CasoRow[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c
    .from("casos")
    .select("*")
    .order("creado_en", { ascending: false });
  return error ? [] : (data as CasoRow[]);
}

export async function archiveCaso(id: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from("casos").update({ archivado: true }).eq("id", id);
  return !error;
}

export async function borrarCaso(id: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from("casos").delete().eq("id", id);
  return !error;
}

export async function obtenerCaso(id: string): Promise<CasoRow | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("casos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return error ? null : (data as CasoRow);
}

export async function guardarDocumento(datos: {
  caso_id: string;
  nombre: string;
  tipo: "pdf" | "video" | "transcription" | "text" | "image";
  contenido?: string;
  duracion_segundos?: number;
  timestamps?: boolean;
  idioma?: string;
  tamaño_bytes?: number;
}): Promise<DocumentoRow | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("documentos")
    .insert([
      {
        caso_id: datos.caso_id,
        nombre: datos.nombre,
        tipo: datos.tipo,
        contenido: datos.contenido ?? null,
        duracion_segundos: datos.duracion_segundos ?? null,
        timestamps: datos.timestamps ?? false,
        idioma: datos.idioma ?? "es-MX",
        tamaño_bytes: datos.tamaño_bytes ?? null,
      },
    ])
    .select()
    .single();
  return error ? null : (data as DocumentoRow);
}

export async function obtenerDocumentosCaso(caso_id: string): Promise<DocumentoRow[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c
    .from("documentos")
    .select("*")
    .eq("caso_id", caso_id)
    .order("creado_en", { ascending: false });
  return error ? [] : (data as DocumentoRow[]);
}

export interface TimelineRow {
  fecha: string;
  iso: string;
  titulo: string;
  detalle: string | null;
  severidad: string;
}

export async function guardarTimelineEventos(
  caso_id: string,
  eventos: { fecha: string; iso: string; titulo: string; detalle?: string; severidad?: string }[],
): Promise<void> {
  const c = db();
  if (!c || !eventos.length) return;
  await c.from("timeline_eventos").insert(
    eventos.map((e) => ({
      caso_id,
      fecha: e.fecha,
      iso: e.iso,
      titulo: e.titulo,
      detalle: e.detalle ?? null,
      severidad: e.severidad ?? "info",
    })),
  );
}

export async function obtenerTimelineCaso(caso_id: string): Promise<TimelineRow[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c
    .from("timeline_eventos")
    .select("fecha, iso, titulo, detalle, severidad")
    .eq("caso_id", caso_id)
    .order("iso", { ascending: true });
  return error ? [] : (data as TimelineRow[]);
}

export interface MensajeRow {
  rol: "user" | "assistant";
  contenido: string;
  citas: { id?: string; code?: string; article?: string; label?: string }[];
}

export async function obtenerMensajesCaso(caso_id: string): Promise<MensajeRow[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c
    .from("chat_mensajes")
    .select("rol, contenido, citas")
    .eq("caso_id", caso_id)
    .order("creado_en", { ascending: true });
  return error ? [] : (data as MensajeRow[]);
}

export async function guardarMensajeChat(datos: {
  caso_id: string;
  rol: "user" | "assistant";
  contenido: string;
  documentos_referenciados?: string[];
  citas?: { articulo: string; ley: string; texto: string }[];
}): Promise<{ id: string } | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("chat_mensajes")
    .insert([
      {
        caso_id: datos.caso_id,
        rol: datos.rol,
        contenido: datos.contenido,
        documentos_referenciados: datos.documentos_referenciados ?? [],
        citas: datos.citas ?? [],
      },
    ])
    .select("id")
    .single();
  return error ? null : (data as { id: string });
}

/** Update ultima_conexion for the current user. */
export async function tocarConexion(): Promise<void> {
  const c = db();
  if (!c) return;
  await c.rpc("tocar_conexion");
}

/** Get the firm's collaboration code (owner only). */
export async function obtenerCodigoColaboracion(): Promise<string | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.rpc("obtener_codigo_colaboracion");
  return (data as string) ?? null;
}

/** Generate/regenerate the firm's collaboration code (owner only). */
export async function generarCodigoColaboracion(): Promise<string | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.rpc("generar_codigo_colaboracion");
  return (data as string) ?? null;
}

/** Join a firm using its collaboration code. Returns the firm name on success. */
export async function unirsePorCodigo(codigo: string): Promise<{ firmName?: string; error?: string }> {
  const c = db();
  if (!c) return { error: "Sin conexión al Servidor Seguro." };
  const { data, error } = await c.rpc("unirse_por_codigo", { p_codigo: codigo });
  if (error) return { error: error.message };
  return { firmName: (data as string) ?? undefined };
}

/** Semantic search via the `consultar` Edge Function (embeds query server-side). */
export async function consultarSemantica(
  query: string,
  opts: { rama?: string; codigos?: string[]; matchCount?: number } = {},
): Promise<MatchedArticulo[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c.functions.invoke("consultar", {
    body: {
      query,
      rama: opts.rama ?? null,
      codigos: opts.codigos ?? null,
      matchCount: opts.matchCount ?? 6,
    },
  });
  if (error || !data?.articulos) throw new Error(error?.message ?? "Sin resultados");
  return data.articulos as MatchedArticulo[];
}
