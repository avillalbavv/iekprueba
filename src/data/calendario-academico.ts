/**
 * calendario-academico.ts — Calendario Académico 2026.
 *
 * Reutiliza los feriados/asuetos ya cargados para la Calculadora de
 * Asistencia (src/lib/asistencia.ts) en vez de duplicarlos.
 *
 * Nota: la fuente que dio origen a esta sección agrupaba feriados y
 * asuetos en una sola lista sin distinguir cuáles son feriado nacional
 * y cuáles asueto institucional — se muestran juntos como "Feriados y
 * Asuetos" hasta contar con esa clasificación oficial.
 */
import { FERIADOS, SEMESTRE_INICIO, SEMESTRE_FIN } from "@/lib/asistencia";

export type CategoriaCalendario = "docente" | "clases" | "feriado";
export type EstadoFecha = "proximamente" | "en-curso" | "finalizado";

export interface EventoFecha {
  id: string;
  categoria: CategoriaCalendario;
  titulo: string;
  fecha: string; // ISO (para ordenar)
  fechaLabel: string; // texto a mostrar
  detalle?: string;
}

function fmt(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Eventos con fecha concreta, para la línea de tiempo. */
export const EVENTOS_CON_FECHA: EventoFecha[] = (
  [
    {
      id: "reunion-profesores",
      categoria: "docente",
      titulo: "Reunión General de Profesores",
      fecha: "2026-07-29",
      fechaLabel: fmt("2026-07-29"),
    },
    {
      id: "periodo-clases-inicio",
      categoria: "clases",
      titulo: "Inicio del período de clases",
      fecha: SEMESTRE_INICIO,
      fechaLabel: fmt(SEMESTRE_INICIO),
    },
    {
      id: "periodo-clases-fin",
      categoria: "clases",
      titulo: "Fin del período de clases",
      fecha: SEMESTRE_FIN,
      fechaLabel: fmt(SEMESTRE_FIN),
    },
    ...FERIADOS.map((f, i) => ({
      id: `feriado-${i}`,
      categoria: "feriado" as const,
      titulo: f.label,
      fecha: f.fecha,
      fechaLabel: fmt(f.fecha),
    })),
  ] satisfies EventoFecha[]
).sort((a, b) => a.fecha.localeCompare(b.fecha));

export interface PeriodoAcademico {
  id: string;
  titulo: string;
  inicio: string;
  fin?: string;
}

export function estadoPeriodo(periodo: PeriodoAcademico, hoy = new Date()): EstadoFecha {
  const actual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  if (actual < periodo.inicio) return "proximamente";
  if (actual > (periodo.fin ?? periodo.inicio)) return "finalizado";
  return "en-curso";
}

export function fechaPeriodoLabel(periodo: PeriodoAcademico): string {
  const inicio = fmt(periodo.inicio);
  return periodo.fin && periodo.fin !== periodo.inicio
    ? `${inicio} al ${fmt(periodo.fin)}`
    : inicio;
}

/** Fuente única de plazos del segundo periodo académico 2026. */
export const TRAMITES: PeriodoAcademico[] = [
  {
    id: "admision-traslado",
    titulo: "Solicitud de admisión directa y traslado",
    inicio: "2026-06-29",
    fin: "2026-07-17",
  },
  { id: "gratuidad", titulo: "Solicitud de gratuidad", inicio: "2026-06-29", fin: "2026-07-17" },
  {
    id: "exoneraciones",
    titulo: "Solicitud de exoneraciones",
    inicio: "2026-06-29",
    fin: "2026-07-17",
  },
  {
    id: "fraccionamiento-deuda",
    titulo: "Fraccionamiento de deuda",
    inicio: "2026-07-20",
    fin: "2026-07-29",
  },
  {
    id: "homologacion",
    titulo: "Solicitud de homologación",
    inicio: "2026-06-29",
    fin: "2026-07-17",
  },
  {
    id: "prorroga-readmision",
    titulo: "Solicitud de prórroga en tiempo de permanencia, extensión de prórroga y readmisión",
    inicio: "2026-06-29",
    fin: "2026-07-17",
  },
  {
    id: "inscripcion-especial",
    titulo: "Solicitud de inscripción especial e inscripción con dispensa de requisito",
    inicio: "2026-06-29",
    fin: "2026-07-17",
  },
  {
    id: "anulacion-inscripcion",
    titulo: "Anulación de inscripción",
    inicio: "2026-08-11",
    fin: "2026-08-28",
  },
  {
    id: "renuncia-examen-final",
    titulo: "Renuncia a derecho de examen final",
    inicio: "2026-07-21",
    fin: "2026-07-29",
  },
  {
    id: "inscripcion-ordinaria",
    titulo: "Inscripción ordinaria (vía web)",
    inicio: "2026-07-28",
    fin: "2026-07-30",
  },
  {
    id: "inscripcion-tardia",
    titulo: "Inscripción tardía para asignaturas con cupos disponibles (vía Secretaría Académica)",
    inicio: "2026-08-03",
    fin: "2026-08-06",
  },
];

export const PERIODOS_EVALUACION: PeriodoAcademico[] = [
  { id: "primer-parcial", titulo: "Primer parcial", inicio: "2026-09-07", fin: "2026-09-19" },
  { id: "segundo-parcial", titulo: "Segundo parcial", inicio: "2026-11-02", fin: "2026-11-14" },
  { id: "primer-final", titulo: "Primer final", inicio: "2026-11-23", fin: "2026-12-09" },
  { id: "segundo-final", titulo: "Segundo final", inicio: "2026-12-10", fin: "2026-12-26" },
];

export const HOMOLOGACIONES: PeriodoAcademico[] = [
  { id: "homologacion-1", titulo: "1ra aplicación", inicio: "2026-04-06", fin: "2026-04-10" },
  { id: "homologacion-2", titulo: "2da aplicación", inicio: "2026-06-29", fin: "2026-07-03" },
  { id: "homologacion-3", titulo: "3ra aplicación", inicio: "2026-08-31", fin: "2026-09-04" },
  { id: "homologacion-4", titulo: "4ta aplicación", inicio: "2026-11-30", fin: "2026-12-04" },
];

export const ENTREGA_DOCUMENTOS: PeriodoAcademico = {
  id: "entrega-documentos-ingresantes",
  titulo: "Entrega de documentos de ingresantes",
  inicio: "2026-08-03",
  fin: "2026-08-28",
};
