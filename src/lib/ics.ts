// Exportación iCalendar (RFC 5545) sin dependencias: los plazos de la agenda
// como eventos de día completo, importables en Google/Apple/Outlook Calendar.

export interface EventoIcs {
  id: string;
  iso: string; // yyyy-mm-dd
  titulo: string;
  detalle?: string;
  caso?: string;
}

/** Escapa texto para iCalendar (\ ; , y saltos de línea). */
export function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Pliega líneas a 74 octetos con continuación por espacio (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  while (line.length > 74) {
    out.push(line.slice(0, 74));
    line = " " + line.slice(74);
  }
  out.push(line);
  return out.join("\r\n");
}

export function buildIcs(eventos: EventoIcs[]): Blob {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PasantIA//Agenda Juridica//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Plazos PasantIA",
  ];
  for (const e of eventos) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(e.iso)) continue;
    const fecha = e.iso.slice(0, 10).replace(/-/g, "");
    const resumen = e.caso ? `${e.titulo} — ${e.caso}` : e.titulo;
    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:${escapeIcs(e.id)}@pasantia`),
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fecha}`,
      fold(`SUMMARY:⚖️ ${escapeIcs(resumen)}`),
      ...(e.detalle ? [fold(`DESCRIPTION:${escapeIcs(e.detalle)}`)] : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Plazo procesal",
      "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
}

export function descargarIcs(eventos: EventoIcs[], nombre = "plazos-pasantia.ics"): void {
  const url = URL.createObjectURL(buildIcs(eventos));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
