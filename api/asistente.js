import Anthropic from "@anthropic-ai/sdk";
import { buscarArticulos, buscarTesis } from "./_rag.js";
import { requireUser } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const auth = await requireUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL_CHAT || "claude-sonnet-4-6";
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  if (!apiKey) {
    return res.status(400).json({ error: "not_configured" });
  }

  try {
    const { query, branch, docContent } = req.body;
    if (!query) return res.status(400).json({ error: "missing_query" });

    const expediente =
      Array.isArray(docContent) && docContent.length
        ? docContent.join("\n\n---\n\n").slice(0, 12000)
        : "";

    // RAG doble: artículos vigentes del corpus + tesis/jurisprudencia del SJF.
    const [articles, tesis] = await Promise.all([
      buscarArticulos(`${query} ${branch ?? ""}`.trim(), branch),
      buscarTesis(query, branch ?? null),
    ]);
    const articlesBlock = articles.length
      ? articles
          .map((a) => `[${a.codigo} Art. ${a.articulo}] ${(a.texto || "").replace(/\s+/g, " ").slice(0, 600)}`)
          .join("\n\n")
      : "";
    const tesisBlock = tesis.length
      ? tesis
          .map(
            (t) =>
              `[Registro digital ${t.registro}] ${t.tipo === "jurisprudencia" ? "Jurisprudencia" : "Tesis aislada"} ${t.clave || ""} — ${t.instancia || ""}\nRUBRO: ${t.rubro}\nCRITERIO: ${(t.sintesis || "").replace(/\s+/g, " ")}`,
          )
          .join("\n\n")
      : "";

    const SYSTEM = `Eres el asistente jurídico de PasantIA para un abogado en México. Respondes consultas sobre el EXPEDIENTE del cliente y su fundamento legal.

REGLAS ESTRICTAS (sin alucinar):
- Responde ÚNICAMENTE con base en (a) el EXPEDIENTE, (b) los ARTÍCULOS DE LEY y (c) las TESIS Y JURISPRUDENCIAS que se te dan abajo. No uses conocimiento externo no verificado.
- Si la respuesta NO consta en el expediente, dilo con claridad ("Eso no consta en el expediente."). NUNCA inventes hechos, nombres, fechas, cantidades, domicilios ni números de artículo.
- Cita los artículos SOLO si aparecen en los provistos, con su código y número (p. ej. "CNPP Art. 308").
- Criterios jurisprudenciales: cita ÚNICAMENTE tesis de la sección TESIS Y JURISPRUDENCIAS, SIEMPRE acompañadas de su Número de Registro Digital (p. ej. «Registro digital 2006224»). Si ninguna tesis provista aplica, di expresamente que no hay criterio jurisprudencial indexado aplicable — JAMÁS inventes registros, rubros ni criterios.
- Español, preciso y conciso, con terminología jurídica formal. Sin preámbulos ni relleno.`;

    const prompt = `PREGUNTA DEL ABOGADO:
${query}

## EXPEDIENTE DEL CLIENTE (única fuente de hechos):
${expediente || "(El expediente aún no tiene documentos analizados.)"}

## ARTÍCULOS DE LEY RELEVANTES (corpus verificado — úsalos para fundamentar):
${articlesBlock || "(No se recuperaron artículos del corpus para esta consulta.)"}

## TESIS Y JURISPRUDENCIAS (índice SJF — únicas citables, siempre con su registro):
${tesisBlock || "(Sin tesis indexadas aplicables a esta consulta — no cites jurisprudencia.)"}

Responde la pregunta apoyándote solo en lo anterior.`;

    const anthropic = new Anthropic({ apiKey, baseURL: baseURL || undefined });
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      temperature: 0.1,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content.find((b) => b.type === "text")?.text?.trim() || "";
    const citations = [
      ...articles.map((a) => ({
        id: `${a.codigo}-${a.articulo}`,
        code: a.codigo,
        article: a.articulo,
        label: `${a.codigo} - Art. ${a.articulo}`,
      })),
      // Tesis citadas en la respuesta (con Registro Digital verificable en el SJF).
      ...tesis
        .filter((t) => content.includes(String(t.registro)))
        .map((t) => ({
          id: `sjf-${t.registro}`,
          code: "SJF",
          article: String(t.registro),
          label: `SJF · Registro ${t.registro}`,
        })),
    ];
    return res.status(200).json({ content, citations });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/asistente]", msg);
    return res.status(500).json({ error: msg });
  }
}
