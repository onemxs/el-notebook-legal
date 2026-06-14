import type { BranchId, LegalBranch } from "./types";

const law = (id: string, name: string, shortName: string, enabled = true) => ({
  id,
  name,
  shortName,
  enabled,
});

export const BRANCHES: Record<BranchId, LegalBranch> = {
  penal: {
    id: "penal",
    name: "Penal",
    tagline: "Proceso acusatorio · responsabilidad penal",
    laws: [
      law("cnpp", "Código Nacional de Procedimientos Penales", "CNPP"),
      law("cpf", "Código Penal Federal", "CPF"),
      law("cpe", "Códigos Penales Estatales", "Cód. Penal Edo.", false),
    ],
    guideQuestions: [
      "¿Existe mandamiento escrito que funde y motive el acto de molestia (art. 16 CPEUM)?",
      "¿Se respetó el plazo de retención y la puesta a disposición sin demora?",
      "¿La conducta encuadra en un tipo penal vigente al momento del hecho?",
      "¿Se acreditan los datos de prueba para vincular a proceso?",
    ],
  },
  electoral: {
    id: "electoral",
    name: "Electoral",
    tagline: "Procesos comiciales · medios de impugnación",
    laws: [
      law("lgipe", "Ley General de Instituciones y Procedimientos Electorales", "LGIPE"),
      law("lgsmime", "Ley General del Sistema de Medios de Impugnación", "LGSMIME"),
    ],
    guideQuestions: [
      "¿El medio de impugnación se presentó dentro de los 4 días que marca la ley?",
      "¿Se cumple el requisito de definitividad de la cadena impugnativa?",
      "¿El promovente acredita interés jurídico o legítimo?",
      "¿El acto reclamado afecta principios rectores (certeza, legalidad, imparcialidad)?",
    ],
  },
  laboral: {
    id: "laboral",
    name: "Laboral",
    tagline: "Relaciones de trabajo · tribunales laborales",
    laws: [
      law("lft", "Ley Federal del Trabajo", "LFT"),
      law("criterios", "Criterios de los Tribunales Laborales", "Criterios TL", false),
    ],
    guideQuestions: [
      "¿La demanda se presentó dentro de los 2 meses que marca el art. 518 LFT?",
      "¿El patrón entregó aviso de rescisión por escrito (art. 47 LFT)?",
      "¿Se reclama reinstalación o indemnización de 3 meses (art. 48 LFT)?",
      "¿Están cuantificados salarios vencidos y prestaciones accesorias?",
    ],
  },
  civil: {
    id: "civil",
    name: "Civil",
    tagline: "Obligaciones · contratos · familia y sucesiones",
    laws: [
      law("ccf", "Código Civil Federal", "CCF"),
      law("ccl", "Códigos Civiles locales (32 entidades)", "CC Local", false),
    ],
    guideQuestions: [
      "¿El contrato se perfeccionó por consentimiento o requiere forma (art. 1796 CCF)?",
      "¿La acción ejercida no ha prescrito conforme al plazo aplicable?",
      "¿Se acredita el incumplimiento que da lugar a rescisión o cumplimiento forzoso?",
      "¿La competencia territorial corresponde al domicilio del demandado?",
    ],
  },
  mercantil: {
    id: "mercantil",
    name: "Mercantil",
    tagline: "Actos de comercio · títulos y operaciones de crédito",
    laws: [
      law("ccom", "Código de Comercio", "Cód. Comercio"),
      law("lgtoc", "Ley General de Títulos y Operaciones de Crédito", "LGTOC"),
    ],
    guideQuestions: [
      "¿El documento base trae aparejada ejecución (art. 1391 Cód. Comercio)?",
      "¿El título de crédito reúne los requisitos de literalidad y autonomía?",
      "¿La acción cambiaria directa está dentro del plazo de prescripción de 3 años?",
      "¿Procede la vía ejecutiva, ordinaria u oral mercantil según la cuantía?",
    ],
  },
  administrativo: {
    id: "administrativo",
    name: "Administrativo",
    tagline: "Actos de autoridad · procedimiento administrativo",
    laws: [
      law("lfpa", "Ley Federal de Procedimiento Administrativo", "LFPA"),
      law("lotfjca", "Ley Orgánica del Tribunal Federal de Justicia Administrativa", "LOTFJA"),
    ],
    guideQuestions: [
      "¿El acto administrativo cumple los elementos y requisitos de validez?",
      "¿Se promovió el recurso o juicio dentro del plazo de 30 / 45 días?",
      "¿Se agotó el principio de definitividad antes del juicio de nulidad?",
      "¿La autoridad fundó y motivó su competencia material y territorial?",
    ],
  },
  fiscal: {
    id: "fiscal",
    name: "Fiscal",
    tagline: "Contribuciones · facultades de comprobación",
    laws: [
      law("cff", "Código Fiscal de la Federación", "CFF"),
      law("lisr", "Ley del Impuesto sobre la Renta", "LISR"),
      law("liva", "Ley del Impuesto al Valor Agregado", "LIVA"),
    ],
    guideQuestions: [
      "¿La autoridad ejerció facultades de comprobación conforme al art. 42 CFF?",
      "¿La resolución determinante está debidamente fundada y motivada?",
      "¿El crédito fiscal fue notificado legalmente y dentro de plazo?",
      "¿Procede recurso de revocación o juicio contencioso administrativo?",
    ],
  },
  amparo: {
    id: "amparo",
    name: "Amparo",
    tagline: "Control constitucional · arts. 103 y 107",
    laws: [
      law("lamparo", "Ley de Amparo", "Ley de Amparo"),
      law("cpeum-amp", "CPEUM (arts. 103 y 107)", "CPEUM"),
    ],
    guideQuestions: [
      "¿La demanda se presentó dentro de los 15 días del art. 17 de la Ley de Amparo?",
      "¿Se identifican correctamente acto reclamado y autoridad responsable?",
      "¿Procede suspensión de oficio o a petición de parte?",
      "¿Se agotó el principio de definitividad o aplica una excepción?",
    ],
  },
  constitucional: {
    id: "constitucional",
    name: "Constitucional",
    tagline: "Derechos humanos · control de convencionalidad",
    laws: [
      law("cpeum", "Constitución Política de los Estados Unidos Mexicanos", "CPEUM"),
      law("tratados", "Tratados Internacionales", "Tratados", false),
    ],
    guideQuestions: [
      "¿Qué derecho humano se estima vulnerado y cuál es su fuente (CPEUM / tratado)?",
      "¿Aplica el principio pro persona conforme al art. 1º constitucional?",
      "¿Existe un test de proporcionalidad aplicable a la restricción?",
      "¿Hay jurisprudencia de la SCJN o criterios de la CoIDH aplicables?",
    ],
  },
};

export const BRANCH_ORDER: BranchId[] = [
  "penal",
  "electoral",
  "laboral",
  "civil",
  "mercantil",
  "administrativo",
  "fiscal",
  "amparo",
  "constitucional",
];

export const BRANCH_LIST = BRANCH_ORDER.map((id) => BRANCHES[id]);
