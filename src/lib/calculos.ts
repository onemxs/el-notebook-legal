// Calculadoras jurídicas de PasantIA: liquidación laboral (LFT), intereses
// moratorios y conversión UMA. Todo determinista y en el cliente.
//
// ⚠️ Constantes oficiales — actualizar cada año:
//   · UMA: INEGI la publica en enero, vigente el 1 de febrero (DOF).
//   · Salario mínimo: CONASAMI lo publica en diciembre, vigente el 1 de enero.

/** UMA diaria por año (pesos MXN). Fuente: INEGI/DOF. */
export const UMA_DIARIA: Record<number, number> = {
  2022: 96.22,
  2023: 103.74,
  2024: 108.57,
  2025: 113.14,
  2026: 117.31, // DOF 09/01/2026, vigente desde 01/02/2026
};
export const UMA_ANIOS = Object.keys(UMA_DIARIA).map(Number).sort((a, b) => b - a);

/** Salario mínimo diario 2026 (DOF 09/12/2025, vigente 01/01/2026). */
export const SALARIO_MINIMO_2026 = { general: 315.04, frontera: 440.87 };

/** Días de vacaciones por años de servicio CUMPLIDOS (art. 76 LFT, reforma 2023). */
export function diasVacaciones(aniosCumplidos: number): number {
  if (aniosCumplidos < 1) return 12; // durante el primer año se devengan 12 en proporción
  if (aniosCumplidos <= 5) return 12 + (aniosCumplidos - 1) * 2; // 12,14,16,18,20
  return 22 + Math.floor((aniosCumplidos - 6) / 5) * 2; // 6-10:22 · 11-15:24 · 16-20:26…
}

export interface EntradaLiquidacion {
  salarioDiario: number;
  fechaIngreso: string; // ISO yyyy-mm-dd
  fechaSalida: string; // ISO
  tipo: "despido" | "renuncia";
  incluirVeinteDias: boolean; // art. 50-II LFT (supuestos específicos)
  diasAguinaldo: number; // default 15 (art. 87)
  primaVacacionalPct: number; // default 25 (art. 80)
  zonaFrontera: boolean; // tope de prima de antigüedad (art. 486)
}

export interface ConceptoLiquidacion {
  concepto: string;
  fundamento: string;
  dias: number | null;
  importe: number;
}

export interface ResultadoLiquidacion {
  aniosServicio: number; // con fracción
  salarioDiarioIntegrado: number;
  conceptos: ConceptoLiquidacion[];
  total: number;
}

const MS_DIA = 86400000;
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Liquidación conforme a LFT. Despido injustificado: 3 meses (art. 48),
 * opcional 20 días/año (art. 50-II), prima de antigüedad (art. 162, salario
 * topado a 2× mínimo por art. 486) y proporcionales (aguinaldo art. 87,
 * vacaciones art. 76 + prima art. 80). Renuncia: solo proporcionales, y prima
 * de antigüedad únicamente con 15+ años (art. 162-III).
 * ponytail: no incluye salarios caídos ni retenciones ISR — eso es litigio y
 * fiscal, no aritmética de escritorio; el resultado es BRUTO.
 */
export function calcularLiquidacion(e: EntradaLiquidacion): ResultadoLiquidacion | null {
  const ingreso = new Date(`${e.fechaIngreso}T12:00:00`);
  const salida = new Date(`${e.fechaSalida}T12:00:00`);
  if (isNaN(ingreso.getTime()) || isNaN(salida.getTime()) || salida <= ingreso) return null;
  if (!(e.salarioDiario > 0)) return null;

  const diasServicio = Math.round((salida.getTime() - ingreso.getTime()) / MS_DIA);
  const anios = diasServicio / 365;
  const aniosCumplidos = Math.floor(anios);

  // Salario diario integrado (art. 84): cuota diaria + aguinaldo y prima
  // vacacional proporcionales (las del año de servicio que cursa).
  const vacAnioEnCurso = diasVacaciones(aniosCumplidos + 1);
  const factor = 1 + e.diasAguinaldo / 365 + (vacAnioEnCurso * (e.primaVacacionalPct / 100)) / 365;
  const sdi = r2(e.salarioDiario * factor);

  const conceptos: ConceptoLiquidacion[] = [];

  if (e.tipo === "despido") {
    conceptos.push({
      concepto: "Indemnización constitucional (3 meses)",
      fundamento: "Art. 48 LFT",
      dias: 90,
      importe: r2(90 * sdi),
    });
    if (e.incluirVeinteDias) {
      const dias = r2(20 * anios);
      conceptos.push({
        concepto: "20 días por año de servicio",
        fundamento: "Art. 50-II LFT",
        dias,
        importe: r2(dias * sdi),
      });
    }
  }

  // Prima de antigüedad: 12 días/año con salario topado al doble del mínimo.
  const aplicaPrima = e.tipo === "despido" || anios >= 15;
  if (aplicaPrima) {
    const minimo = e.zonaFrontera ? SALARIO_MINIMO_2026.frontera : SALARIO_MINIMO_2026.general;
    const salarioTopado = Math.min(e.salarioDiario, 2 * minimo);
    const dias = r2(12 * anios);
    conceptos.push({
      concepto: "Prima de antigüedad (12 días/año, salario topado)",
      fundamento: "Arts. 162 y 486 LFT",
      dias,
      importe: r2(dias * salarioTopado),
    });
  }

  // Proporcionales del año en curso (con salario de cuota diaria, no SDI).
  const inicioAnioCal = new Date(salida.getFullYear(), 0, 1);
  const diasAnioCal = Math.round((salida.getTime() - inicioAnioCal.getTime()) / MS_DIA) + 1;
  const aguinaldoDias = r2((e.diasAguinaldo * diasAnioCal) / 365);
  conceptos.push({
    concepto: `Aguinaldo proporcional (${diasAnioCal} días del año)`,
    fundamento: "Art. 87 LFT",
    dias: aguinaldoDias,
    importe: r2(aguinaldoDias * e.salarioDiario),
  });

  const ultimoAniversario = new Date(ingreso);
  ultimoAniversario.setFullYear(ingreso.getFullYear() + aniosCumplidos);
  const diasDesdeAniv = Math.max(0, Math.round((salida.getTime() - ultimoAniversario.getTime()) / MS_DIA));
  const vacDias = r2((vacAnioEnCurso * diasDesdeAniv) / 365);
  const vacImporte = r2(vacDias * e.salarioDiario);
  conceptos.push({
    concepto: `Vacaciones proporcionales (${vacDias} de ${vacAnioEnCurso} días)`,
    fundamento: "Arts. 76 y 79 LFT",
    dias: vacDias,
    importe: vacImporte,
  });
  conceptos.push({
    concepto: `Prima vacacional (${e.primaVacacionalPct}%)`,
    fundamento: "Art. 80 LFT",
    dias: null,
    importe: r2(vacImporte * (e.primaVacacionalPct / 100)),
  });

  return {
    aniosServicio: r2(anios),
    salarioDiarioIntegrado: sdi,
    conceptos,
    total: r2(conceptos.reduce((acc, c) => acc + c.importe, 0)),
  };
}

export interface ResultadoInteres {
  dias: number;
  interes: number;
  total: number;
}

/**
 * Interés moratorio SIMPLE sobre días naturales / 365.
 * Presets de tasa legal anual: 6% mercantil (art. 362 Cód. Comercio) y
 * 9% civil federal (art. 2395 CCF). Si se pactó otra tasa, es editable.
 */
export function calcularInteres(
  capital: number,
  tasaAnualPct: number,
  desde: string,
  hasta: string,
): ResultadoInteres | null {
  const d1 = new Date(`${desde}T12:00:00`);
  const d2 = new Date(`${hasta}T12:00:00`);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) return null;
  if (!(capital > 0) || !(tasaAnualPct >= 0)) return null;
  const dias = Math.round((d2.getTime() - d1.getTime()) / MS_DIA);
  const interes = r2(capital * (tasaAnualPct / 100) * (dias / 365));
  return { dias, interes, total: r2(capital + interes) };
}

/** Conversión UMA ↔ pesos. La UMA mensual oficial es diaria × 30.4 (anual ×12). */
export function umaAPesos(cantidad: number, anio: number, unidad: "diaria" | "mensual" | "anual"): number {
  const base = UMA_DIARIA[anio];
  if (!base || !(cantidad >= 0)) return NaN;
  const mult = unidad === "diaria" ? 1 : unidad === "mensual" ? 30.4 : 30.4 * 12;
  return r2(cantidad * base * mult);
}

export function pesosAUma(pesos: number, anio: number): number {
  const base = UMA_DIARIA[anio];
  if (!base || !(pesos >= 0)) return NaN;
  return Math.round((pesos / base) * 100) / 100;
}

export const fmtMXN = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
