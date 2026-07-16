/**
 * avisos.ts — Avisos de la Delegación.
 *
 * Sin contenido todavía (AVISOS = []). Para publicar un aviso más
 * adelante alcanza con agregar un objeto a este array — la página ya
 * está preparada para mostrarlo, filtrarlo por tipo y ordenarlo por
 * fecha sin tener que tocar el componente.
 */

export type AvisoTipo = "comunicado" | "alerta" | "noticia" | "recordatorio" | "importante";

export const TIPO_CONFIG: Record<
  AvisoTipo,
  { label: string; color: string; bg: string; border: string }
> = {
  comunicado: {
    label: "Comunicado",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.3)",
  },
  alerta: {
    label: "Alerta",
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    border: "rgba(248,113,113,0.3)",
  },
  noticia: {
    label: "Noticia",
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.12)",
    border: "rgba(34,211,238,0.3)",
  },
  recordatorio: {
    label: "Recordatorio",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.3)",
  },
  importante: {
    label: "Importante",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.3)",
  },
};

export interface Aviso {
  id: string;
  tipo: AvisoTipo;
  titulo: string;
  resumen: string;
  detalle?: string;
  fecha: string; // ISO yyyy-mm-dd
  publicadoEn?: string; // ISO completo para conservar el orden exacto de publicación
  destacado?: boolean;
}

export const AVISOS: Aviso[] = [
  {
    id: "reglamento-2026-vigencia",
    tipo: "importante",
    titulo: "Nuevo Reglamento Académico 2026: qué es y desde cuándo aplica",
    resumen:
      "La FP-UNA aprobó un Reglamento Académico nuevo que reemplaza al Reglamento de Cátedra de 2016. Entra en vigencia el segundo periodo académico 2026.",
    detalle:
      "El Consejo Directivo de la FP-UNA aprobó el ajuste el 29/06/2026 y lo elevó al Consejo Superior Universitario para su homologación el 06/07/2026 — según el reglamento anterior, ese paso es el que le da vigencia formal. El propio texto fija su entrada en vigencia para el segundo periodo académico 2026 y deroga completamente el Reglamento de Cátedra 2016. Mirá el detalle completo en la sección Nuevo Reglamento 2026.",
    fecha: "2026-07-06",
    destacado: true,
  },
  {
    id: "reglamento-2026-formula-nota",
    tipo: "comunicado",
    titulo: "Cambia la fórmula de la nota final",
    resumen:
      "Ahora el proceso pesa más que el examen final: RP = 0,4×EF + 0,6×PEP (antes era 0,6×EF + 0,4×PP).",
    detalle:
      "El examen final sigue necesitando un mínimo de 50% para ser considerado, y ese piso no cambia. Lo que cambia es el peso relativo: antes el examen final valía más que el trabajo del semestre; ahora es al revés. La Calculadora de Notas ya está actualizada con la fórmula nueva.",
    fecha: "2026-07-06",
    destacado: true,
  },
  {
    id: "reglamento-2026-asistencia",
    tipo: "comunicado",
    titulo: "Asistencia mínima única para todas las materias",
    resumen:
      "70% de asistencia te da derecho a rendir desde la 1ª convocatoria; entre 50% y 70%, solo desde la 2ª; menos de 50%, sin derecho.",
    detalle:
      "Antes cada cátedra definía su propio porcentaje mínimo en la Planilla de Cátedra. Ahora es un esquema fijo e igual para toda la Facultad. Las prácticas de laboratorio obligatorias siguen siendo aparte: 100% de asistencia, recuperable hasta el 25%. La Calculadora de Asistencia ya aplica este esquema automáticamente.",
    fecha: "2026-07-06",
    destacado: true,
  },
  {
    id: "reglamento-2026-parciales",
    tipo: "recordatorio",
    titulo: "El recuperatorio de parciales no cambia",
    resumen:
      "El recuperatorio continúa realizándose junto con el examen final, como ya ocurría anteriormente.",
    detalle:
      "Este punto no debe presentarse como una novedad introducida por el reglamento académico 2026.",
    fecha: "2026-07-06",
  },
  {
    id: "reglamento-2026-sin-promocion",
    tipo: "recordatorio",
    titulo: "Aclaración: no existe una vía de 'promoción' sin rendir el final",
    resumen:
      "Ni el reglamento anterior ni el nuevo contemplan aprobar una materia sin rendir el examen final.",
    detalle:
      "Circula la idea de que con el reglamento nuevo se podría 'promocionar' una materia por buen rendimiento en parciales. Revisamos el texto oficial y esa figura no existe en ninguno de los dos reglamentos. Todas las materias requieren evaluación final, con derecho sujeto al PEP y a la asistencia.",
    fecha: "2026-07-06",
  },
  {
    id: "reglamento-2026-otros-cambios",
    tipo: "noticia",
    titulo: "Otros cambios administrativos del reglamento 2026",
    resumen:
      "Se permite hasta 30 minutos de solapamiento de horario, cambia el límite de asignaturas por periodo, y más.",
    detalle:
      "La malla 2026 se aplica únicamente a ingresantes 2026 y la malla 2008 continúa vigente para quienes pertenecen a ese plan. Se permite inscribirse con hasta 30 minutos de solapamiento de horario (Planificador IEK ya lo tiene en cuenta). El tope de estudiantes por sección baja de 55 a 50. El tribunal examinador pasa a tener 3 docentes en vez de 2.",
    fecha: "2026-07-06",
  },
  {
    id: "reglamento-2026-transitorio",
    tipo: "recordatorio",
    titulo: "El reglamento no tiene un régimen transitorio general",
    resumen:
      "Las reglas nuevas se aplican desde su entrada en vigencia; la malla correspondiente depende de la cohorte y del registro académico.",
    detalle:
      "Las reglas nuevas (fórmula de nota, asistencia, etc.) aplican desde su entrada en vigencia. La malla 2026 corresponde a ingresantes 2026 y la malla 2008 sigue vigente para estudiantes pertenecientes a ese plan.",
    fecha: "2026-07-06",
  },
  {
    id: "reglamento-2026-recomendacion",
    tipo: "recordatorio",
    titulo: "Recomendación: revisá tus herramientas antes de empezar el semestre",
    resumen:
      "La Calculadora de Notas, la Calculadora de Asistencia y Planificador IEK ya están actualizadas al reglamento 2026.",
    detalle:
      "Te recomendamos revisar tu situación en cada materia con las calculadoras actualizadas antes de que arranque el segundo periodo académico, para no llevarte sorpresas con el nuevo esquema de asistencia o la nueva fórmula de nota.",
    fecha: "2026-07-06",
  },
];
