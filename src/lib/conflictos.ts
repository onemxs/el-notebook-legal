import { getSupabase } from "./supabase";
import type { ExtractedField } from "./types";

/** Coincidencia de una parte del caso nuevo con una parte de un caso existente. */
export interface Conflicto {
  casoId: string;
  casoNombre: string;
  parte: string; // nombre de la persona/entidad coincidente
  rolExistente: string;
  rolNuevo: string;
}

/** Normaliza para comparar nombres: sin acentos, minúsculas, sin puntuación. */
export function normalizarNombre(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:'"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERICOS = /^(no especificado|no consta|se ignora|desconocido|n\/?a|pendiente)$/i;

/**
 * Busca conflictos de interés: partes del caso nuevo que ya figuran en otros
 * expedientes del abogado/despacho (RLS acota la consulta a lo accesible).
 * ponytail: coincidencia exacta normalizada — sin fuzzy; si algún día hay
 * falsos negativos por variantes de nombre, subir a trigram/levenshtein.
 */
export async function buscarConflictos(
  partesNuevas: ExtractedField[],
  excluirCasoId?: string,
): Promise<Conflicto[]> {
  const sb = getSupabase();
  if (!sb) return []; // modo demo/local: sin base contra la cual comparar
  const nuevas = partesNuevas.filter(
    (p) => p.value && p.value.trim().length > 3 && !GENERICOS.test(p.value.trim()),
  );
  if (!nuevas.length) return [];

  const { data, error } = await sb.from("casos").select("id, nombre, partes").limit(500);
  if (error || !data) return [];

  const out: Conflicto[] = [];
  const vistos = new Set<string>();
  for (const caso of data as { id: string; nombre: string; partes: ExtractedField[] | null }[]) {
    if (excluirCasoId && caso.id === excluirCasoId) continue;
    for (const existente of caso.partes ?? []) {
      if (!existente?.value) continue;
      for (const nueva of nuevas) {
        if (normalizarNombre(existente.value) !== normalizarNombre(nueva.value)) continue;
        const key = `${caso.id}|${normalizarNombre(nueva.value)}`;
        if (vistos.has(key)) continue;
        vistos.add(key);
        out.push({
          casoId: caso.id,
          casoNombre: caso.nombre,
          parte: nueva.value,
          rolExistente: existente.label || "Parte",
          rolNuevo: nueva.label || "Parte",
        });
      }
    }
  }
  return out;
}
