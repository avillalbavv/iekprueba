/**
 * asistencia.ts — Calculadora Inteligente de Asistencia
 *
 * Reescrita según el Reglamento Académico de Carreras de Grado de la
 * FP-UNA, Resolución 25/15/68-00, Art. 9°, 11° y 13°.b.
 *
 * El porcentaje se define en el Planeamiento de la Asignatura y nunca puede
 * ser menor al 70 %. Esta calculadora usa ese piso reglamentario.
 *
 * Además, las prácticas de laboratorio obligatorias (si la materia las
 * tiene) son un requisito APARTE: 100% de asistencia, con posibilidad
 * de recuperar hasta el 30% de las prácticas por etapa (Art. 11).
 *
 * Se conserva localStorage como respaldo offline y la capa de cuenta lo
 * sincroniza con Supabase cuando el estudiante inicia sesión.
 */

import { writeLocalState } from "./user-state.ts";

/* ───────────────────────── Calendario académico ───────────────────────── */

export const SEMESTRE_INICIO = "2026-08-03";
export const SEMESTRE_FIN = "2026-11-21";

export interface Feriado {
  fecha: string;
  label: string;
}

export const FERIADOS: Feriado[] = [
  { fecha: "2026-08-10", label: "Aniversario Fundación de San Lorenzo" },
  { fecha: "2026-08-15", label: "Fundación de Asunción" },
  { fecha: "2026-09-21", label: "Día de la Juventud" },
  { fecha: "2026-09-24", label: "Fundación de la Universidad Nacional de Asunción" },
  { fecha: "2026-09-29", label: "Victoria de la Batalla de Boquerón" },
];
const FERIADOS_SET = new Set(FERIADOS.map((f) => f.fecha));

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

const DOW: Record<DiaSemana, number> = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
};

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Todas las fechas de clase de una materia en el semestre, ya sin feriados. */
export function generarFechasClase(
  dias: DiaSemana[],
  fechasPorDia: Partial<Record<DiaSemana, string[]>> = {},
): string[] {
  const dowSet = new Set(dias.map((d) => DOW[d]));
  const dayByDow = new Map(Object.entries(DOW).map(([day, dow]) => [dow, day as DiaSemana]));
  const specificSets = new Map(
    Object.entries(fechasPorDia).map(([day, dates]) => [day, new Set(dates || [])]),
  );
  const start = new Date(SEMESTRE_INICIO + "T00:00:00");
  const end = new Date(SEMESTRE_FIN + "T00:00:00");
  const fechas: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (!dowSet.has(d.getDay())) continue;
    const iso = toISO(d);
    const day = dayByDow.get(d.getDay());
    const specific = day ? specificSets.get(day) : undefined;
    if (specific?.size && !specific.has(iso)) continue;
    if (FERIADOS_SET.has(iso)) continue;
    fechas.push(iso);
  }
  return fechas;
}

/* ───────────────────────── Umbrales del reglamento (Art. 13.b.3, Art. 11) ───────────────────────── */

export const UMBRAL_PRIMERA_CONVOCATORIA = 70;
/** Se conserva por compatibilidad con datos v2; el reglamento no establece un piso inferior para la segunda convocatoria. */
export const UMBRAL_SEGUNDA_CONVOCATORIA = UMBRAL_PRIMERA_CONVOCATORIA;
export const LAB_ASISTENCIA_REQUERIDA = 100;
export const LAB_RECUPERACION_MAXIMA_PCT = 30;

/* ───────────────────────── Modelo de datos ───────────────────────── */

export type EstadoClase = "presente" | "ausente" | "justificada" | "suspendida" | "recuperacion";

export const ESTADO_META: Record<EstadoClase, { label: string; color: string; icon: string }> = {
  presente: { label: "Presente", color: "#34d399", icon: "✓" },
  ausente: { label: "Ausente", color: "#f87171", icon: "✗" },
  justificada: { label: "Justificada", color: "#3b82f6", icon: "J" },
  suspendida: { label: "Suspendida", color: "#94a3b8", icon: "–" },
  recuperacion: { label: "Recuperación", color: "#a78bfa", icon: "R" },
};

/** Seguimiento aparte de prácticas de laboratorio obligatorias (Art. 11°). */
export interface PracticasLab {
  total: number;
  asistidas: number;
  recuperadas: number;
}

export interface Materia {
  id: string;
  materiaId?: string;
  nombre: string;
  carrera: string;
  docente: string;
  dias: DiaSemana[];
  fechasPorDia?: Partial<Record<DiaSemana, string[]>>;
  asistencias: Record<string, EstadoClase>; // fecha ISO -> estado
  practicasLab: PracticasLab | null; // null = la materia no tiene prácticas obligatorias
}

export function nuevaMateria(
  data: Omit<Materia, "id" | "asistencias" | "practicasLab"> & {
    practicasLab?: PracticasLab | null;
  },
): Materia {
  return {
    ...data,
    id: crypto.randomUUID(),
    asistencias: {},
    practicasLab: data.practicasLab ?? null,
  };
}

/* ───────────────────────── Cálculo de estadísticas ───────────────────────── */

export type Semaforo = "verde" | "amarillo" | "rojo";
export type DerechoConvocatoria = "primera" | "segunda" | "ninguna";

export interface MateriaStats {
  fechas: string[];
  totalClases: number; // clases del semestre, sin contar suspendidas
  faltasConsumidas: number; // ausentes marcadas (justificada no resta)
  presentes: number; // presente + recuperación
  clasesPendientesDeMarcar: number; // pasadas y sin marcar
  clasesFuturas: number;
  porcentajeActual: number; // sobre clases marcadas (presente+ausente)
  // Piso reglamentario del 70 %. Los campos "Segunda" se conservan para migrar datos antiguos.
  maxFaltasPrimera: number;
  maxFaltasSegunda: number;
  faltasRestantesPrimera: number; // puede ser negativo (ya perdidas)
  faltasRestantesSegunda: number;
  derecho: DerechoConvocatoria;
  estado: Semaforo;
  // Prácticas de laboratorio (si aplica):
  labStats: {
    requeridas: number;
    cubiertas: number;
    recuperacionMaxima: number;
    habilitado: boolean;
    recuperacionExcedida: boolean;
  } | null;
}

function hoyISO(): string {
  return toISO(new Date());
}

export function calcularStats(m: Materia): MateriaStats {
  const fechas = generarFechasClase(m.dias, m.fechasPorDia);
  const hoy = hoyISO();

  const noSuspendidas = fechas.filter((f) => m.asistencias[f] !== "suspendida");
  const totalClases = noSuspendidas.length;

  let faltasConsumidas = 0,
    presentes = 0;
  let clasesPendientesDeMarcar = 0,
    clasesFuturas = 0;

  for (const f of noSuspendidas) {
    const estado = m.asistencias[f];
    const esPasadaOHoy = f <= hoy;

    // El cálculo depende de si la clase está MARCADA, no de si su fecha ya
    // pasó según el reloj del sistema — el semestre puede estar cargado por
    // adelantado (fechas "futuras" respecto a hoy) y aun así tener clases
    // marcadas manualmente por el estudiante.
    if (estado === "ausente") faltasConsumidas++;
    else if (estado === "presente" || estado === "recuperacion") presentes++;
    else if (estado === "justificada") {
      /* neutral: no suma falta ni presencia */
    } else if (esPasadaOHoy) clasesPendientesDeMarcar++;
    else clasesFuturas++;
  }

  const baseCalculable = presentes + faltasConsumidas; // "justificada" es neutral
  // Sin clases marcadas comienza en 0 %; luego usa solo presente + ausente.
  const porcentajeActual = baseCalculable > 0 ? (presentes / baseCalculable) * 100 : 0;

  // Cuántas faltas se pueden tener sobre el total de clases sin bajar del 70 %.
  const maxFaltasPrimera = Math.max(
    0,
    totalClases - Math.ceil(totalClases * (UMBRAL_PRIMERA_CONVOCATORIA / 100)),
  );
  const maxFaltasSegunda = Math.max(
    0,
    totalClases - Math.ceil(totalClases * (UMBRAL_SEGUNDA_CONVOCATORIA / 100)),
  );
  const faltasRestantesPrimera = maxFaltasPrimera - faltasConsumidas;
  const faltasRestantesSegunda = maxFaltasSegunda - faltasConsumidas;

  let derecho: DerechoConvocatoria = "primera";
  let estado: Semaforo = "verde";
  if (faltasConsumidas > maxFaltasSegunda) {
    derecho = "ninguna";
    estado = "rojo";
  } else if (faltasRestantesPrimera <= 1) {
    estado = "amarillo";
  } // verde pero por poco margen

  let labStats: MateriaStats["labStats"] = null;
  if (m.practicasLab) {
    const { total, asistidas, recuperadas } = m.practicasLab;
    const recuperacionMaxima = Math.floor(total * (LAB_RECUPERACION_MAXIMA_PCT / 100));
    const recuperacionExcedida = recuperadas > recuperacionMaxima;
    const cubiertas = asistidas + Math.min(recuperadas, recuperacionMaxima);
    labStats = {
      requeridas: total,
      cubiertas,
      recuperacionMaxima,
      habilitado: total > 0 ? cubiertas >= total : true,
      recuperacionExcedida,
    };
  }

  return {
    fechas,
    totalClases,
    faltasConsumidas,
    presentes,
    clasesPendientesDeMarcar,
    clasesFuturas,
    porcentajeActual,
    maxFaltasPrimera,
    maxFaltasSegunda,
    faltasRestantesPrimera,
    faltasRestantesSegunda,
    derecho,
    estado,
    labStats,
  };
}

/* ───────────────────────── Simulador predictivo ───────────────────────── */

export interface Simulacion {
  siFaltoHoy: {
    faltasRestantesPrimera: number;
    caeASegunda: boolean;
    perderiaTodoDerecho: boolean;
  } | null;
  vecesQuePuedeFaltarManteniendoPrimera: number;
  clasesConsecutivasParaRecuperar70: number | null; // null = ya cumple o es matemáticamente imposible
  proyeccion: {
    faltasProyectadas: number;
    terminariaConDerecho: boolean;
    terminariaConPrimeraConvocatoria: boolean;
  };
}

export function simular(m: Materia, stats: MateriaStats): Simulacion {
  const hoy = hoyISO();
  const clasesHoy = stats.fechas.filter((f) => f === hoy && m.asistencias[f] !== "suspendida");

  const siFaltoHoy =
    clasesHoy.length > 0
      ? {
          faltasRestantesPrimera: stats.faltasRestantesPrimera - 1,
          caeASegunda:
            stats.faltasConsumidas + 1 > stats.maxFaltasPrimera &&
            stats.faltasConsumidas + 1 <= stats.maxFaltasSegunda,
          perderiaTodoDerecho: stats.faltasConsumidas + 1 > stats.maxFaltasSegunda,
        }
      : null;

  // Clases consecutivas necesarias para volver a estar en el umbral del 70%,
  // asumiendo que a partir de ahora asiste a todas las que le quedan marcar.
  let clasesConsecutivasParaRecuperar70: number | null = null;
  if (
    stats.presentes + stats.faltasConsumidas > 0 &&
    stats.porcentajeActual < UMBRAL_PRIMERA_CONVOCATORIA
  ) {
    const p = UMBRAL_PRIMERA_CONVOCATORIA / 100;
    const P = stats.presentes,
      T = stats.presentes + stats.faltasConsumidas;
    const denom = 1 - p;
    if (denom > 0) {
      const n = Math.ceil((p * T - P) / denom);
      const disponibles = stats.clasesPendientesDeMarcar + stats.clasesFuturas;
      clasesConsecutivasParaRecuperar70 = n > 0 && n <= disponibles ? n : n <= 0 ? 0 : null;
    }
  }

  const clasesMarcadasHastaHoy = stats.presentes + stats.faltasConsumidas;
  const tasaFaltas =
    clasesMarcadasHastaHoy > 0 ? stats.faltasConsumidas / clasesMarcadasHastaHoy : 0;
  const clasesRestantesTotales = stats.clasesPendientesDeMarcar + stats.clasesFuturas;
  const faltasProyectadas = Math.round(tasaFaltas * clasesRestantesTotales);
  const totalFaltasProyectadas = stats.faltasConsumidas + faltasProyectadas;

  return {
    siFaltoHoy,
    vecesQuePuedeFaltarManteniendoPrimera: Math.max(0, stats.faltasRestantesPrimera),
    clasesConsecutivasParaRecuperar70,
    proyeccion: {
      faltasProyectadas,
      terminariaConDerecho: totalFaltasProyectadas <= stats.maxFaltasSegunda,
      terminariaConPrimeraConvocatoria: totalFaltasProyectadas <= stats.maxFaltasPrimera,
    },
  };
}

/* ───────────────────────── Persistencia local ───────────────────────── */

const STORAGE_KEY = "iek-asistencia:v2";

export interface MateriaImportable {
  materiaId?: string;
  nombre: string;
  dias: DiaSemana[];
  fechasPorDia?: Partial<Record<DiaSemana, string[]>>;
  docente?: string;
}

/**
 * Trae materias armadas en Planificador IEK a la Calculadora de Asistencia, sin
 * pedirle al estudiante que las vuelva a cargar a mano. Si la materia ya
 * existe (mismo identificador académico), actualiza días/docente pero conserva las
 * asistencias ya marcadas.
 */
export function importarMateriasDesdePoliPlanner(nuevas: MateriaImportable[]): {
  agregadas: number;
  actualizadas: number;
} {
  const materias = cargarMaterias();
  let agregadas = 0,
    actualizadas = 0;

  for (const n of nuevas) {
    const idx = materias.findIndex((m) =>
      n.materiaId
        ? m.materiaId === n.materiaId
        : m.nombre.trim().toLowerCase() === n.nombre.trim().toLowerCase(),
    );
    if (idx >= 0) {
      const existente = materias[idx];
      const mismosDias =
        existente.dias.length === n.dias.length && existente.dias.every((d) => n.dias.includes(d));
      const mismoDocente = !n.docente || existente.docente === n.docente;
      const mismasFechas =
        JSON.stringify(existente.fechasPorDia || {}) === JSON.stringify(n.fechasPorDia || {});
      if (!mismosDias || !mismoDocente || !mismasFechas) {
        materias[idx] = {
          ...existente,
          dias: n.dias,
          fechasPorDia: n.fechasPorDia,
          docente: n.docente || existente.docente,
        };
        actualizadas++;
      }
    } else {
      materias.push(
        nuevaMateria({
          materiaId: n.materiaId,
          nombre: n.nombre,
          carrera: "IEK",
          docente: n.docente ?? "",
          dias: n.dias,
          fechasPorDia: n.fechasPorDia,
        }),
      );
      agregadas++;
    }
  }

  guardarMaterias(materias);
  return { agregadas, actualizadas };
}

export function cargarMaterias(): Materia[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function guardarMaterias(materias: Materia[]) {
  if (typeof window === "undefined") return;
  try {
    writeLocalState(STORAGE_KEY, JSON.stringify(materias));
  } catch {
    /* localStorage puede fallar en modo privado; se ignora silenciosamente */
  }
}
