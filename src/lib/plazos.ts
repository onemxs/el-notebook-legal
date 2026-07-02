// Cálculo de términos procesales en días hábiles del Poder Judicial Federal.
//
// Días inhábiles considerados:
//  · Sábados y domingos.
//  · Art. 19 de la Ley de Amparo y art. 74 LFT (descanso obligatorio). Se
//    descuentan tanto las fechas literales como los lunes movibles: el cálculo
//    es deliberadamente conservador (ante la duda, el término vence antes).
//  · Recesos del PJF conforme a los acuerdos generales del CJF: 16–31 de julio
//    y 16–31 de diciembre.
// El cómputo inicia el día hábil siguiente a la fecha en que surte efectos la
// notificación — verifica la regla de "surtimiento" de tu materia.

const FIJOS = new Set([
  "1-1", // Año nuevo
  "2-5", // Constitución
  "3-21", // Natalicio de Juárez
  "5-1", // Día del Trabajo
  "5-5", // Batalla de Puebla (art. 19 LA)
  "9-14", // (art. 19 LA)
  "9-16", // Independencia
  "10-12", // (art. 19 LA)
  "11-20", // Revolución
  "12-25", // Navidad
]);

export function esInhabil(d: Date): boolean {
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return true;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (FIJOS.has(`${m}-${day}`)) return true;
  // Lunes movibles (LFT art. 74): 1er lunes de febrero, 3er lunes de marzo y de noviembre.
  if (dow === 1) {
    const nth = Math.ceil(day / 7);
    if ((m === 2 && nth === 1) || (m === 3 && nth === 3) || (m === 11 && nth === 3)) return true;
  }
  // Recesos del PJF.
  if ((m === 7 || m === 12) && day >= 16) return true;
  return false;
}

export interface ResultadoPlazo {
  vencimiento: Date;
  /** Hábiles de hoy (exclusivo) al vencimiento (inclusivo); negativo si ya venció. */
  habilesRestantes: number;
  vencido: boolean;
}

/** El término corre a partir del día hábil siguiente a la notificación. */
export function calcularPlazo(fechaNotificacion: Date, diasHabiles: number): ResultadoPlazo {
  const d = new Date(fechaNotificacion);
  d.setHours(12, 0, 0, 0);
  let contados = 0;
  while (contados < diasHabiles) {
    d.setDate(d.getDate() + 1);
    if (!esInhabil(d)) contados++;
  }

  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const vencido = d.toDateString() !== hoy.toDateString() && +d < +hoy;
  let rest = 0;
  const c = new Date(Math.min(+hoy, +d));
  const fin = new Date(Math.max(+hoy, +d));
  while (c.toDateString() !== fin.toDateString()) {
    c.setDate(c.getDate() + 1);
    if (!esInhabil(c)) rest++;
  }
  return { vencimiento: d, habilesRestantes: vencido ? -rest : rest, vencido };
}

/** Plazos frecuentes; cualquier otro término entra con "Personalizado". */
export const PRESETS_PLAZO: { label: string; dias: number }[] = [
  { label: "Amparo indirecto — 15 días (art. 17 Ley de Amparo)", dias: 15 },
  { label: "Recurso de revisión — 10 días (art. 86 Ley de Amparo)", dias: 10 },
  { label: "Recurso de queja — 5 días (art. 98 Ley de Amparo)", dias: 5 },
  { label: "Recurso de reclamación — 3 días (art. 104 Ley de Amparo)", dias: 3 },
  { label: "Apelación penal contra sentencia — 10 días (CNPP)", dias: 10 },
  { label: "Apelación penal contra auto — 3 días (CNPP)", dias: 3 },
];
