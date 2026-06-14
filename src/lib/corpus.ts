import type { Article } from "./types";

/**
 * Verified literal-text corpus (demo stand-in for the Supabase `leyes_articulos`
 * vector store). In production these strings are pulled verbatim from the indexed
 * dataset so the assistant can never paraphrase a fundamento. Excerpts below are
 * faithful to the published text; long articles are trimmed with […].
 */
const ARTICLES: Article[] = [
  {
    code: "CPEUM",
    fullCode: "Constitución Política de los Estados Unidos Mexicanos",
    article: "14",
    heading: "Irretroactividad y garantía de audiencia",
    text: "A ninguna ley se dará efecto retroactivo en perjuicio de persona alguna. Nadie podrá ser privado de la libertad o de sus propiedades, posesiones o derechos, sino mediante juicio seguido ante los tribunales previamente establecidos, en el que se cumplan las formalidades esenciales del procedimiento y conforme a las Leyes expedidas con anterioridad al hecho. […]",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "CPEUM",
    fullCode: "Constitución Política de los Estados Unidos Mexicanos",
    article: "16",
    heading: "Actos de molestia · mandamiento escrito",
    text: "Nadie puede ser molestado en su persona, familia, domicilio, papeles o posesiones, sino en virtud de mandamiento escrito de la autoridad competente, que funde y motive la causa legal del procedimiento. […] No podrá librarse orden de aprehensión sino por la autoridad judicial y sin que preceda denuncia o querella de un hecho que la ley señale como delito, sancionado con pena privativa de libertad […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "CPEUM",
    fullCode: "Constitución Política de los Estados Unidos Mexicanos",
    article: "123",
    heading: "Derecho al trabajo digno",
    text: "Toda persona tiene derecho al trabajo digno y socialmente útil; al efecto, se promoverán la creación de empleos y la organización social de trabajo, conforme a la ley. […] Apartado A. Entre los obreros, jornaleros, empleados domésticos, artesanos y de una manera general, todo contrato de trabajo […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "Cód. Comercio",
    fullCode: "Código de Comercio",
    article: "1054",
    heading: "Supletoriedad procesal",
    text: "En caso de no existir convenio de las partes sobre el procedimiento ante tribunales en los términos de los artículos anteriores, salvo que las leyes mercantiles establezcan un procedimiento especial o una supletoriedad expresa, los juicios mercantiles se regirán por las disposiciones de este libro y, en su defecto, se aplicará supletoriamente el Código Federal de Procedimientos Civiles […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "Cód. Comercio",
    fullCode: "Código de Comercio",
    article: "1391",
    heading: "Procede la vía ejecutiva mercantil",
    text: "El procedimiento ejecutivo tiene lugar cuando la demanda se funda en documento que traiga aparejada ejecución. Traen aparejada ejecución: I. La sentencia ejecutoriada o pasada en autoridad de cosa juzgada y la arbitral firme […]; II. Los instrumentos públicos […]; IV. Los títulos de crédito […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "LFT",
    fullCode: "Ley Federal del Trabajo",
    article: "47",
    heading: "Rescisión sin responsabilidad para el patrón",
    text: "Son causas de rescisión de la relación de trabajo, sin responsabilidad para el patrón: […] El patrón que despida a un trabajador deberá darle aviso escrito en el que refiera claramente la conducta o conductas que motivan la rescisión y la fecha o fechas en que se cometieron. […] La falta de aviso al trabajador personalmente o por conducto de la Junta, por sí sola determinará la separación no justificada […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "LFT",
    fullCode: "Ley Federal del Trabajo",
    article: "48",
    heading: "Acciones del trabajador despedido",
    text: "El trabajador podrá solicitar ante el Tribunal, a su elección, que se le reinstale en el trabajo que desempeñaba, o que se le indemnice con el importe de tres meses de salario, a razón del que corresponda a la fecha en que se realice el pago. […] Si en el juicio correspondiente no comprueba el patrón la causa de la rescisión, el trabajador tendrá derecho […] al pago de los salarios vencidos computados desde la fecha del despido […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "LFT",
    fullCode: "Ley Federal del Trabajo",
    article: "518",
    heading: "Prescripción · dos meses por separación",
    text: "Prescriben en dos meses las acciones de los trabajadores que sean separados del trabajo. La prescripción corre a partir del día siguiente a la fecha de la separación.",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "CFF",
    fullCode: "Código Fiscal de la Federación",
    article: "42",
    heading: "Facultades de comprobación",
    text: "Las autoridades fiscales a fin de comprobar que los contribuyentes, los responsables solidarios o los terceros con ellos relacionados han cumplido con las disposiciones fiscales y, en su caso, determinar las contribuciones omitidas o los créditos fiscales, así como para comprobar la comisión de delitos fiscales […] estarán facultadas para: I. Rectificar los errores aritméticos […]; II. Requerir a los contribuyentes […]; III. Practicar visitas domiciliarias […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "CPF",
    fullCode: "Código Penal Federal",
    article: "7",
    heading: "Concepto de delito",
    text: "Delito es el acto u omisión que sancionan las leyes penales. En los delitos de resultado material también será atribuible el resultado a quien omita impedirlo, si éste tenía el deber jurídico de evitarlo. El delito es: I. Instantáneo […]; II. Permanente o continuo […]; III. Continuado […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "CNPP",
    fullCode: "Código Nacional de Procedimientos Penales",
    article: "251",
    heading: "Actuaciones sin autorización judicial previa",
    text: "No requieren autorización del Juez de control los siguientes actos de investigación: I. La inspección del lugar del hecho o del hallazgo; II. La inspección de lugar distinto al de los hechos o del hallazgo; III. La inspección de personas; IV. La revisión corporal; […] VIII. El levantamiento e identificación de cadáver […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "Ley de Amparo",
    fullCode: "Ley de Amparo, Reglamentaria de los Artículos 103 y 107 Constitucionales",
    article: "17",
    heading: "Plazo para promover el amparo",
    text: "El plazo para presentar la demanda de amparo es de quince días, salvo: I. Cuando se reclame una norma general autoaplicativa, o el procedimiento de extradición, en que será de treinta días; II. Cuando se reclame la sentencia definitiva condenatoria en un proceso penal […]; III. Cuando el amparo se promueva contra actos que tengan o puedan tener por efecto privar total o parcialmente […] de la propiedad […] de núcleos de población ejidal o comunal […].",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "CCF",
    fullCode: "Código Civil Federal",
    article: "1796",
    heading: "Perfeccionamiento de los contratos",
    text: "Los contratos se perfeccionan por el mero consentimiento, excepto aquellos que deben revestir una forma establecida por la ley. Desde que se perfeccionan obligan a los contratantes no sólo al cumplimiento de lo expresamente pactado, sino también a las consecuencias que, según su naturaleza, son conforme a la buena fe, al uso o a la ley.",
    source: "DOF · texto vigente · corpus federal",
  },
  {
    code: "LGIPE",
    fullCode: "Ley General de Instituciones y Procedimientos Electorales",
    article: "3",
    heading: "Interpretación y principios rectores",
    text: "Para los efectos de esta Ley se entiende por: […] La interpretación se hará conforme a los criterios gramatical, sistemático y funcional, atendiendo a lo dispuesto en el último párrafo del artículo 14 de la Constitución. […] son principios rectores la certeza, legalidad, independencia, imparcialidad, máxima publicidad, objetividad y paridad […].",
    source: "DOF · texto vigente · corpus federal",
  },
];

const KEY = (code: string, article: string) =>
  `${code.toLowerCase().trim()}::${article.toLowerCase().trim()}`;

const INDEX = new Map<string, Article>(ARTICLES.map((a) => [KEY(a.code, a.article), a]));

export function getArticle(code: string, article: string): Article | undefined {
  return INDEX.get(KEY(code, article));
}

export const CORPUS_SIZE = ARTICLES.length;
