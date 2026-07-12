import Anthropic from "@anthropic-ai/sdk";
import { buscarArticulos, buscarTesis } from "./_rag.js";
import { requireUser, registrarTokensIA } from "./_auth.js";

// Estructura procesal correcta por tipo de escrito. Una contestación NO se
// redacta como demanda: refuta hecho por hecho y opone excepciones nominadas.
function estructuraPorTipo(kind, kindLabel) {
  const k = `${kind || ""} ${kindLabel || ""}`.toLowerCase();

  if (/contestac/.test(k)) {
    return `ESTRUCTURA OBLIGATORIA — CONTESTACIÓN DE DEMANDA (NO la redactes como demanda; NO incluyas un capítulo de "Hechos" narrados por el demandado):
1. RUBRO: tribunal que conoce del asunto, número de expediente (o "__________" si no consta), y las partes con su rol correcto (ACTOR vs. DEMANDADO).
2. PROEMIO: quién contesta y con qué carácter/personalidad; domicilio para oír y recibir notificaciones (usa el del despacho del abogado si se provee; si no, "__________"); autorizados/apoderados en términos de los artículos procesales; manifestación de comparecer DENTRO DEL TÉRMINO LEGAL a dar contestación.
3. CONTESTACIÓN A LAS PRESTACIONES: pronúnciate sobre CADA prestación reclamada por la actora, indicando si se niega, se opone excepción, o en su caso procede, con razón concreta.
4. CONTESTACIÓN A LOS HECHOS: responde UNO POR UNO cada hecho de la demanda, calificándolo expresamente como: "es CIERTO", "es FALSO" (con la explicación de por qué), o "ni lo afirmo ni lo niego por no ser hecho propio / por desconocerlo". No introduzcas una narrativa de hechos nueva.
5. EXCEPCIONES Y DEFENSAS: nominadas y fundadas (p. ej. pago, prescripción, falta de acción y derecho —sine actione agis—, oscuridad y defecto legal en la demanda, plus petitio, las que resulten del expediente). Cada excepción con su fundamento.
6. OBJECIÓN DE PRUEBAS: objeta en cuanto a alcance y valor probatorio las pruebas ofrecidas por la actora que perjudiquen a tu representada.
7. DERECHO: cita los artículos aplicables por su número y código (adjetivos y sustantivos), cada uno con una frase breve de su aplicación al caso. NO reproduzcas el texto íntegro del artículo.
8. PUNTOS PETITORIOS.`;
  }

  if (/apel/.test(k)) {
    return `ESTRUCTURA OBLIGATORIA — RECURSO DE APELACIÓN (no escribas un capítulo de "Hechos"):
1. RUBRO: tribunal de alzada, número de toca/expediente (o "__________" si no consta), y las partes con su rol correcto.
2. PROEMIO: quién promueve y con qué personalidad, contra qué resolución y de qué juzgado (o "__________"), y la vía.
3. AGRAVIOS: analiza el expediente, detecta las violaciones al debido proceso o inconsistencias, y redacta CADA agravio de forma silogística:
   • Premisa Mayor — la norma o principio jurídico violado (cítalo).
   • Premisa Menor — el acto u omisión concreto del juez de origen que la transgrede.
   • Conclusión — el perjuicio causado al recurrente y por qué procede revocar o modificar.
4. DERECHO: cita los artículos aplicables por su número y código, cada uno con una frase breve de su aplicación. NO reproduzcas el texto íntegro.
5. PUNTOS PETITORIOS.`;
  }

  if (/amparo/.test(k)) {
    return `ESTRUCTURA OBLIGATORIA — DEMANDA DE AMPARO:
1. RUBRO y órgano de amparo.
2. QUEJOSO, TERCERO INTERESADO y AUTORIDAD(ES) RESPONSABLE(S).
3. ACTO RECLAMADO (preciso).
4. DERECHOS/GARANTÍAS VIOLADOS (arts. constitucionales y convencionales).
5. ANTECEDENTES (bajo protesta de decir verdad).
6. CONCEPTOS DE VIOLACIÓN (estructurados y fundados).
7. DERECHO (Ley de Amparo y artículos aplicables).
8. PUNTOS PETITORIOS.`;
  }

  if (/alegato/.test(k)) {
    return `ESTRUCTURA OBLIGATORIA — ALEGATOS:
1. RUBRO y proemio breve.
2. SÍNTESIS de la litis.
3. VALORACIÓN DE PRUEBAS: adminicula las pruebas propias que acreditan la acción/excepción y desvirtúa las de la contraria.
4. CONCLUSIONES fundadas.
5. PUNTOS PETITORIOS.`;
  }

  // Demanda / escrito general
  return `ESTRUCTURA OBLIGATORIA — DEMANDA / ESCRITO INICIAL:
1. RUBRO: tribunal, partes con su rol, vía.
2. PROEMIO: promovente, personalidad, domicilio para notificaciones, autorizados.
3. PRESTACIONES reclamadas (enumeradas).
4. HECHOS: narrativa cronológica, hilada y numerada, extraída del expediente.
5. DERECHO: cita los artículos aplicables por su número y código, cada uno con una frase breve de su aplicación. NO reproduzcas el texto íntegro.
6. PRUEBAS ofrecidas (relacionadas con los hechos).
7. PUNTOS PETITORIOS.`;
}

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function fechaEnLetra(d = new Date()) {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const auth = await requireUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Sonnet: rápido (cabe en los 60s de Vercel Hobby) y excelente con el prompt
  // estructurado. Para máxima calidad + escritos más largos, con Vercel Pro
  // (300s) cambiar ANTHROPIC_MODEL_DOCS a "claude-opus-4-8".
  const model = process.env.ANTHROPIC_MODEL_DOCS || "claude-sonnet-4-6";
  const baseURL = process.env.ANTHROPIC_BASE_URL;
  if (!apiKey) return res.status(400).json({ error: "not_configured" });

  try {
    const { kind, kindLabel, branch, branchName, caseName, parties, facts, lawName, despacho } = req.body;

    const partiesBlock = parties?.length
      ? parties.map((p) => `• ${p.label}: ${p.value}`).join("\n")
      : "No especificadas";
    const factsBlock = facts?.length
      ? facts.join("\n\n---\n\n")
      : "Sin documentos analizados en el expediente.";

    // Ubicación real del despacho para el lugar y fecha + domicilio de notificaciones.
    const ciudad = despacho?.ciudad?.trim();
    const entidad = despacho?.entidad?.trim();
    const lugarFirma = ciudad && entidad ? `${ciudad}, ${entidad}` : ciudad || entidad || "";
    const domicilioDespacho = despacho?.domicilio?.trim();

    // RAG obligatorio (backend).
    const ragQuery = [kindLabel, branchName, caseName, partiesBlock, factsBlock]
      .filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 1500);
    const [articles, tesis] = await Promise.all([
      buscarArticulos(ragQuery, branch),
      buscarTesis(`${kindLabel || ""} ${branchName || ""}`.trim(), branch ?? null),
    ]);
    const articlesBlock = articles.length
      ? articles.map((a) => `**${a.codigo} — Art. ${a.articulo} (vigente):**\n${(a.texto || "").slice(0, 800)}`).join("\n\n")
      : "";
    const tesisBlock = tesis.length
      ? tesis.map((t) => `**Registro digital ${t.registro}** · ${t.tipo === "jurisprudencia" ? "Jurisprudencia" : "Tesis aislada"} ${t.clave || ""} (${t.instancia || ""}):\n${t.rubro}\n${(t.sintesis || "").slice(0, 400)}`).join("\n\n")
      : "";

    const estructura = estructuraPorTipo(kind, kindLabel);

    const SYSTEM = `Eres un abogado postulante mexicano de la más alta escuela, experto en derecho procesal y sustantivo, con rigor técnico impecable y redacción forense formal. Redactas de manera COMPLETA y TERMINADA el escrito solicitado (${kindLabel || "Escrito"}), usando ÚNICA y EXCLUSIVAMENTE la información verídica del expediente.

REGLAS DE OBLIGATORIO CUMPLIMIENTO:

1. FIDELIDAD ABSOLUTA — CERO INVENCIÓN: Está PROHIBIDO inventar nombres, números de expediente, cédulas profesionales, números de notaría, fechas, cantidades, domicilios o cualquier dato que NO conste en el expediente. Cuando falte un dato duro que deba tomarse del expediente y no se te haya dado, escribe una línea de subrayado "__________" para que el abogado la complete a mano. NUNCA rellenes con un valor inventado "para que se vea completo". Es preferible un "__________" honesto que un dato falso.

2. INYECCIÓN REAL DE HECHOS: usa los hechos, prestaciones y datos del expediente tal como constan. No los resumas como notas: dales estructura forense conforme al tipo de escrito.

3. FUNDAMENTACIÓN VERIFICADA: usa la ley de la materia (${lawName || "la aplicable"}) y los artículos provistos, citándolos de manera literal. Si invocas jurisprudencia, usa EXCLUSIVAMENTE las tesis de la sección provista con su Número de Registro Digital. Si esa sección viene vacía, fundamenta solo con artículos — PROHIBIDO inventar tesis, rubros, claves o registros.

4. DOMICILIO PARA NOTIFICACIONES: ${domicilioDespacho ? `usa el domicilio del despacho: "${domicilioDespacho}".` : `si no se provee, escribe "__________" para que el abogado lo complete. No inventes una dirección.`}

5. CIERRE: termina tu redacción en los PUNTOS PETITORIOS. NO escribas la fórmula de cierre (PROTESTO LO NECESARIO, lugar, fecha ni línea de firma): el sistema la añade automáticamente con la ubicación y la fecha correctas. NUNCA escribas "Ciudad de México".

6. FORMATO: devuelve SOLO un FRAGMENTO HTML (usa <h2>, <h3>, <p>, <strong>; sin <!DOCTYPE>, <html>, <head>, <body>, <style>, sin atributos style="" ni class=""). No lo envuelvas en fences de markdown.`;

    const prompt = `Redacta un **${kindLabel}** completo, extenso y meticuloso para el siguiente expediente de materia **${branchName}**.

**EXPEDIENTE:** ${caseName}

## PARTES (asígnales su rol procesal correcto):
${partiesBlock}

## EXPEDIENTE DEL CLIENTE (hechos, prestaciones, pruebas y datos — de AQUÍ extrae todo, incluyendo la ubicación del tribunal y los roles):
${factsBlock}

## LEGISLACIÓN PRINCIPAL DE LA RAMA: ${lawName || "la aplicable a la materia"}

${articlesBlock
  ? `## ARTÍCULOS VIGENTES DEL CORPUS (cítalos por su número y código en la sección de Derecho, con una frase de aplicación cada uno; NO reproduzcas su texto íntegro para no agotar el espacio):\n${articlesBlock}`
  : `## ARTÍCULOS: el corpus no devolvió artículos. NO inventes números de artículo; cita los códigos por su nombre y deja "__________" donde no tengas el número verificado.`}

${tesisBlock
  ? `## TESIS Y JURISPRUDENCIAS (índice SJF — únicas citables, con su Registro Digital):\n${tesisBlock}`
  : `## TESIS Y JURISPRUDENCIAS: sin tesis indexadas — NO cites jurisprudencia.`}

${estructura}

EXTENSIÓN (CRÍTICO — LÉELO DOS VECES): tienes un PRESUPUESTO DE ESPACIO LIMITADO. El escrito DEBE quedar COMPLETO con TODOS sus apartados, terminando en la sección de DERECHO (breve) y los PUNTOS PETITORIOS. NO escribas la fórmula de cierre final (PROTESTO / lugar / fecha / firma): la añade el sistema. Para caber:
• Sé ECONÓMICO en cada apartado: frases precisas, sin relleno ni repeticiones. 2 a 4 oraciones por punto son suficientes.
• Apunta a ~900–1,100 palabras en TOTAL. Un escrito completo hasta los petitorios, aunque conciso, es mucho mejor que uno extenso truncado a la mitad.
• Los PUNTOS PETITORIOS enúncialos en frases cortas, una línea cada uno.

Redacta el HTML del escrito completo, sin un solo corchete "[...]" ni marcador de posición vacío; para datos duros faltantes usa "__________".`;

    const anthropic = new Anthropic({ apiKey, baseURL: baseURL || undefined });
    // No-streaming: confiable (el stream de larga duración se corta con "terminated").
    // Techo que, a velocidad Sonnet (~50 tok/s), cabe en los 60s de Vercel Hobby
    // SIN truncar; la instrucción de extensión mantiene el escrito completo y
    // cerrado dentro del presupuesto. Con Vercel Pro (300s) + ANTHROPIC_MODEL_DOCS=opus
    // subir DOCS_MAX_TOKENS para escritos más extensos.
    // Timeout explícito por debajo del maxDuration: si el modelo se atora, aborta
    // limpio (→ el cliente cae a la plantilla) en vez de colgar la función.
    const response = await anthropic.messages.create(
      {
        model,
        max_tokens: Number(process.env.DOCS_MAX_TOKENS || 2800),
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      },
      { timeout: Number(process.env.DOCS_TIMEOUT_MS || 55000) },
    );

    await registrarTokensIA(auth.user.id, response.model, response.usage);

    const rawText = response.content.find((b) => b.type === "text")?.text || "";
    let bodyHtml = toFragment(rawText);
    // Cierre DETERMINISTA: garantiza PROTESTO + lugar/fecha REALES + firma en todo
    // escrito, aunque el modelo se extienda o se corte. Si el modelo escribió su
    // propio cierre pese a la instrucción, lo recortamos para no duplicar ni
    // arriesgar un lugar equivocado.
    const idx = bodyHtml.search(/PROTESTO\s+LO\s+NECESARIO/i);
    if (idx !== -1) bodyHtml = bodyHtml.slice(0, idx).replace(/<(p|h2|h3)[^>]*>\s*(<strong>\s*)?$/i, "").trim();
    const lugarCierre = lugarFirma || "__________";
    const cierre = `<p style="margin-top:2rem"><strong>PROTESTO LO NECESARIO</strong></p>
<p>${lugarCierre}, a ${fechaEnLetra()}.</p>
<p style="margin-top:2.5rem">_____________________________________<br/>Nombre y firma del promovente o de su apoderado legal</p>`;
    return res.status(200).json({ html: `${bodyHtml}\n${cierre}` });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/generar-documento] Error:", msg);
    return res.status(500).json({ error: msg });
  }
}

function toFragment(raw) {
  let s = (raw || "").trim().replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const body = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) s = body[1].trim();
  return s
    .replace(/<\/?(?:html|head|body)[^>]*>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .trim();
}
