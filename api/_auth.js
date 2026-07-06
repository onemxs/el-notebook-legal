// Guard de los endpoints de IA: exige un JWT válido de Supabase y aplica una
// cuota horaria por usuario (tabla api_uso vía registrar_uso_api).
// Verificamos el token contra /auth/v1/user — cubre expiración y revocación sin
// dependencias extra. El prefijo `_` evita que Vercel lo trate como endpoint.
//
// Política de fallos: auth cae CERRADA (sin token válido no hay IA); la cuota
// cae ABIERTA (si el RPC no responde, no bloqueamos al usuario legítimo).
export async function requireUser(req) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { error: "server_not_configured", status: 500 };

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "auth_required", status: 401 };

  let user;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { error: "invalid_token", status: 401 };
    user = await r.json();
  } catch {
    return { error: "auth_unavailable", status: 503 };
  }
  if (!user?.id) return { error: "invalid_token", status: 401 };

  try {
    const limite = Number(process.env.API_RATE_LIMIT_HOUR || 60);
    const rl = await fetch(`${url}/rest/v1/rpc/registrar_uso_api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_user: user.id, p_limite: limite }),
    });
    if (rl.ok) {
      // 'ok' | 'limite' | 'suspendida' — el RPC aplica cuota personalizada (perfiles.cuota_ia)
      const estado = await rl.json();
      if (estado === "suspendida") return { error: "account_suspended", status: 403 };
      if (estado === "limite") return { error: "rate_limited", status: 429 };
    }
  } catch {
    /* cuota cae abierta */
  }

  return { user };
}

// Contabilidad de tokens por llamada (ia_tokens_diario) — alimenta el costo
// estimado del panel admin. Se llama tras cada respuesta de Anthropic con
// response.model y response.usage. Falla en silencio: la contabilidad jamás
// debe romper la respuesta al abogado.
export async function registrarTokensIA(userId, modelo, usage) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !userId || !usage) return;
  try {
    await fetch(`${url}/rest/v1/rpc/registrar_tokens_ia`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        p_user: userId,
        p_modelo: modelo || "desconocido",
        p_in: usage.input_tokens || 0,
        p_out: usage.output_tokens || 0,
      }),
    });
  } catch {
    /* la contabilidad no bloquea */
  }
}
