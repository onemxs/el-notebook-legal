// Cron diario: avisa por correo los plazos procesales próximos (T-7, T-3, T-1).
// Inerte hasta configurar RESEND_API_KEY. Lo dispara Vercel Cron (ver vercel.json);
// protegido por CRON_SECRET para que nadie más lo invoque.
//
// Env requeridas para operar:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (ya configuradas)
//   RESEND_API_KEY        → activa el envío
//   CRON_SECRET           → Vercel Cron lo manda como Authorization: Bearer …
//   RECORDATORIOS_FROM    → remitente verificado en Resend (ej. "PasantIA <avisos@tudominio.mx>")
export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  // Vercel Cron manda el header con CRON_SECRET; si está definido, exígelo.
  if (cronSecret && auth !== cronSecret) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RECORDATORIOS_FROM || "PasantIA <onboarding@resend.dev>";
  if (!url || !key) return res.status(500).json({ error: "supabase_not_configured" });
  if (!resendKey) return res.status(200).json({ skipped: "resend_not_configured" });

  try {
    // Plazos en los hitos de aviso, con el correo del abogado dueño.
    const r = await fetch(`${url}/rest/v1/rpc/plazos_proximos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_hitos: [7, 3, 1] }),
    });
    if (!r.ok) return res.status(502).json({ error: "rpc_failed", detail: await r.text() });
    const plazos = await r.json();

    // Agrupar por abogado → un correo con todos sus plazos.
    const porEmail = new Map();
    for (const p of plazos) {
      if (!porEmail.has(p.email)) porEmail.set(p.email, []);
      porEmail.get(p.email).push(p);
    }

    let enviados = 0;
    for (const [email, items] of porEmail) {
      const filas = items
        .map(
          (p) =>
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(p.caso)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(p.titulo)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:${p.dias <= 1 ? "#b91c1c" : "#b45309"}">${p.dias === 1 ? "mañana" : `en ${p.dias} días`}</td></tr>`,
        )
        .join("");
      const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1c1e">
        <h2 style="color:#022448">Plazos procesales por vencer</h2>
        <p style="color:#526070">Estos términos de tus expedientes en PasantIA se acercan. Verifica el cómputo en tu materia.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #022448">Expediente</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #022448">Término</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #022448">Vence</th>
        </tr></thead><tbody>${filas}</tbody></table>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">PasantIA es una herramienta de apoyo; el cómputo definitivo y la responsabilidad procesal son tuyos.</p>
      </div>`;

      const send = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from,
          to: email,
          subject: `⏰ ${items.length} plazo(s) procesal(es) por vencer — PasantIA`,
          html,
        }),
      });
      if (send.ok) enviados++;
      else console.error("[recordatorios] Resend falló:", await send.text());
    }

    return res.status(200).json({ abogados: porEmail.size, correos_enviados: enviados });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[/api/recordatorios-plazos]", msg);
    return res.status(500).json({ error: msg });
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
