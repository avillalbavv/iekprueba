import RAW from "@/data/poliplanner-horario-2026.json";
import { normalizeAcademicName } from "./search";
import { academicNamesMatch } from "./academic-offer-matcher";
import { esTipoRevision } from "./academic-events";
import { writeLocalState } from "./user-state";
import { normalizeScheduleData } from "./schedule-data-normalizer";
import type { EnfasisId } from "./malla-curricular";

export { normalizeScheduleData } from "./schedule-data-normalizer";

/* ───────────────────────── Tipos ───────────────────────── */

export interface Docente {
  titulo: string;
  apellido: string;
  nombre: string;
  correo: string;
}

export interface ClaseInfo {
  dia: string; // Lunes..Sábado
  hora: string; // "HH:MM - HH:MM"
  aula: string | null;
  fechas?: string[]; // Fechas ISO cuando la fuente limita una clase a días concretos.
  tipo?: "teoria" | "laboratorio";
}

export interface ExamenInfo {
  dia: string; // "Vie 10/04/26"
  hora: string; // "HH:MM"
  aula: string;
}

export interface Seccion {
  id: string;
  sourceRow?: number;
  departamento?: string;
  materiaId: string;
  nombreNormalizado: string;
  carrera: string;
  plan: string;
  materia: string;
  seccion: string;
  turno: string;
  nivel: string | number;
  semGrupo: string | number;
  enfasis: string;
  docente: Docente;
  docenteEsPlantel?: boolean;
  modoSeleccion?: "seccion" | "turno" | "opcion";
  laboratorio?: {
    grupo: string;
    docente: string;
  };
  clases: ClaseInfo[];
  examenes: Partial<
    Record<"parcial1" | "parcial2" | "final1" | "revision1" | "final2" | "revision2", ExamenInfo>
  >;
  mesaExaminadora: { presidente: string; miembro1: string; miembro2: string };
}

export interface MateriaGroup {
  id: string;
  materia: string;
  semestre: string;
  plan: string;
  secciones: Seccion[];
}

/* ───────────────────────── Datos ───────────────────────── */

const BUNDLED_DATA: Seccion[] = normalizeScheduleData(
  RAW as Omit<Seccion, "materiaId" | "nombreNormalizado">[],
);

/** Oferta enriquecida y mutable en el lugar: fuente común para todas las herramientas. */
export const DATA: Seccion[] = [...BUNDLED_DATA];

/** Sustituye la oferta completa sin romper las referencias importadas por otros módulos. */
export function replaceScheduleData(source: Seccion[]): void {
  const normalized = normalizeScheduleData(source);
  if (!normalized.length) throw new Error("La actualización no contiene secciones válidas");
  const importedPlans = new Set(normalized.map((section) => section.plan));
  const bundledPlansNotReplaced = BUNDLED_DATA.filter(
    (section) => !importedPlans.has(section.plan),
  );
  DATA.splice(0, DATA.length, ...bundledPlansNotReplaced, ...normalized);
  nombreOfertadoCache.clear();
  seccionesPorMateriaCache.clear();
  seccionesCursablesCache.clear();
}

/** Recupera la oferta incluida en la aplicación cuando no queda una revisión remota activa. */
export function resetScheduleData(): void {
  replaceScheduleData(BUNDLED_DATA);
}

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
export type Dia = (typeof DIAS)[number];

export const TURNO_LABEL: Record<string, string> = { M: "Mañana", T: "Tarde", N: "Noche" };
export const TURNO_COLOR: Record<string, string> = { M: "#fbbf24", T: "#3b82f6", N: "#a78bfa" };

const EXAMEN_LABEL: Record<string, string> = {
  parcial1: "1er Parcial",
  parcial2: "2do Parcial",
  final1: "1er Final",
  revision1: "Revisión 1",
  final2: "2do Final",
  revision2: "Revisión 2",
};
export function examenLabel(key: string): string {
  return EXAMEN_LABEL[key] ?? key;
}

/* ───────────────────────── Semestre helper ───────────────────────── */

function isNumeric(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== "" && s !== "---" && !Number.isNaN(Number(s));
}

export function semestreLabel(rec: { nivel: string | number; semGrupo: string | number }): string {
  if (isNumeric(rec.semGrupo)) return String(rec.semGrupo);
  if (isNumeric(rec.nivel)) return String(rec.nivel);
  return "—";
}

/* ───────────────────────── Agrupación por materia ───────────────────────── */

export function groupByMateria(data: Seccion[] = DATA): MateriaGroup[] {
  const map = new Map<string, MateriaGroup>();
  for (const s of data) {
    const key = s.materiaId;
    if (!map.has(key)) {
      map.set(key, {
        id: s.materiaId,
        materia: s.materia,
        semestre: semestreLabel(s),
        plan: s.plan,
        secciones: [],
      });
    }
    map.get(key)!.secciones.push(s);
  }
  return [...map.values()].sort((a, b) => a.materia.localeCompare(b.materia, "es"));
}

/* ───────────────────────── Paleta de colores por materia ───────────────────────── */

const PALETTE = [
  "#3b82f6",
  "#22d3ee",
  "#a78bfa",
  "#fb923c",
  "#34d399",
  "#f472b6",
  "#facc15",
  "#f87171",
  "#818cf8",
  "#2dd4bf",
  "#e879f9",
  "#4ade80",
  "#60a5fa",
  "#fbbf24",
  "#c084fc",
];

export function colorForMateria(materia: string): string {
  let hash = 0;
  for (let i = 0; i < materia.length; i++) hash = (hash * 31 + materia.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/* ───────────────────────── Parseo de horas y solapamiento ───────────────────────── */

export interface TimeRange {
  start: number;
  end: number;
}

export function parseHora(hora: string): TimeRange | null {
  const m = hora.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  return { start, end };
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Minutos de solapamiento real entre dos rangos horarios (0 si no se solapan). */
export function overlapMinutes(a: TimeRange, b: TimeRange): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

/** Art. 5.c del Reglamento Académico FP-UNA: la inscripción requiere que no
 * exista superposición entre los horarios de clases o evaluaciones. */
export const SOLAPAMIENTO_PERMITIDO_MIN = 0;

/* ───────────────────────── Layout de solapamientos (vista semanal) ───────────────────────── */

export interface LayoutInput<T> {
  item: T;
  start: number;
  end: number;
}
export interface LayoutResult<T> {
  item: T;
  start: number;
  end: number;
  col: number;
  cols: number;
}

/**
 * Distribuye eventos que se solapan en el tiempo en columnas lado a lado
 * (como Google Calendar), en vez de apilarlos unos sobre otros. Devuelve,
 * para cada evento, en qué columna va y cuántas columnas tiene su grupo.
 */
export function layoutDaySchedule<T>(items: LayoutInput<T>[]): LayoutResult<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const result: LayoutResult<T>[] = [];
  let cluster: typeof sorted = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const withCol: { it: (typeof sorted)[0]; col: number }[] = [];
    for (const it of cluster) {
      let placed = false;
      for (let c = 0; c < columnEnds.length; c++) {
        if (columnEnds[c] <= it.start) {
          columnEnds[c] = it.end;
          withCol.push({ it, col: c });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columnEnds.push(it.end);
        withCol.push({ it, col: columnEnds.length - 1 });
      }
    }
    const cols = columnEnds.length;
    for (const { it, col } of withCol) result.push({ ...it, col, cols });
    cluster = [];
  }

  for (const it of sorted) {
    if (cluster.length === 0 || it.start < clusterEnd) {
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.end);
    } else {
      flushCluster();
      cluster = [it];
      clusterEnd = it.end;
    }
  }
  flushCluster();
  return result;
}

export interface ScheduleConflict {
  dia: Dia;
  a: { seccion: Seccion; clase: ClaseInfo };
  b: { seccion: Seccion; clase: ClaseInfo };
  overlapMin: number;
}

/** Detecta cualquier solapamiento de clases entre las secciones elegidas. */
export function findScheduleConflicts(secciones: Seccion[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < secciones.length; i++) {
    for (let j = i + 1; j < secciones.length; j++) {
      const a = secciones[i],
        b = secciones[j];
      if (a.materiaId === b.materiaId) continue;
      for (const ca of a.clases) {
        const ra = parseHora(ca.hora);
        if (!ra) continue;
        for (const cb of b.clases) {
          if (ca.dia !== cb.dia) continue;
          const rb = parseHora(cb.hora);
          if (!rb) continue;
          const overlapMin = overlapMinutes(ra, rb);
          if (overlapMin > SOLAPAMIENTO_PERMITIDO_MIN) {
            conflicts.push({
              dia: ca.dia as Dia,
              a: { seccion: a, clase: ca },
              b: { seccion: b, clase: cb },
              overlapMin,
            });
          }
        }
      }
    }
  }
  return conflicts;
}

/* ───────────────────────── Exámenes: parseo de fecha y colisiones ───────────────────────── */

/** "Vie 10/04/26" → Date (o null si vacío/ilegible) */
export function parseFechaExamen(dia: string): Date | null {
  const m = (dia || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  return new Date(year, Number(mo) - 1, Number(d));
}

export interface ExamEntry {
  seccion: Seccion;
  tipo: string;
  info: ExamenInfo;
  fecha: Date;
}

export interface ListExamenesOptions {
  incluirRevisiones?: boolean;
}

export function listExamenes(
  secciones: Seccion[],
  { incluirRevisiones = true }: ListExamenesOptions = {},
): ExamEntry[] {
  const out: ExamEntry[] = [];
  for (const s of secciones) {
    for (const [tipo, info] of Object.entries(s.examenes)) {
      if (!info || !info.dia) continue;
      if (!incluirRevisiones && esTipoRevision(tipo)) continue;
      const fecha = parseFechaExamen(info.dia);
      if (!fecha) continue;
      out.push({ seccion: s, tipo, info, fecha });
    }
  }
  return out.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

export interface ExamConflict {
  fecha: Date;
  entries: ExamEntry[];
}

/** Agrupa exámenes que caen el mismo día (incluso con distinta hora, para avisar con anticipación). */
export function findExamConflicts(examenes: ExamEntry[]): ExamConflict[] {
  const byDate = new Map<string, ExamEntry[]>();
  for (const e of examenes) {
    const key = e.fecha.toDateString();
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(e);
  }
  const conflicts: ExamConflict[] = [];
  for (const [, entries] of byDate) {
    const materiasUnicas = new Set(entries.map((e) => e.seccion.materiaId));
    if (materiasUnicas.size > 1) {
      conflicts.push({ fecha: entries[0].fecha, entries });
    }
  }
  return conflicts.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

/* ───────────────────────── Persistencia local ───────────────────────── */

const STORAGE_KEY = "poliplanner:seleccion:v2";

export interface PlannerSelection {
  malla: "plan-2008" | "vigente-2026";
  enfasis: string | null;
  materiaIds: string[];
  secciones: Record<string, string>; // materiaId de la malla -> seccion.id ofertada
}

export function loadSelection(): PlannerSelection {
  const empty: PlannerSelection = {
    malla: "plan-2008",
    enfasis: null,
    materiaIds: [],
    secciones: {},
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      malla: parsed.malla === "vigente-2026" ? "vigente-2026" : "plan-2008",
      enfasis: typeof parsed.enfasis === "string" ? parsed.enfasis : null,
      materiaIds: Array.isArray(parsed.materiaIds) ? parsed.materiaIds : [],
      secciones: typeof parsed.secciones === "object" && parsed.secciones ? parsed.secciones : {},
    };
  } catch {
    return empty;
  }
}

export function saveSelection(sel: PlannerSelection) {
  if (typeof window === "undefined") return;
  try {
    writeLocalState(STORAGE_KEY, JSON.stringify(sel));
  } catch {
    /* localStorage puede fallar en modo privado; se ignora silenciosamente */
  }
}

export function docenteNombre(d: Docente): string {
  const partes = [d.titulo, d.apellido, d.nombre].filter(Boolean);
  return partes.join(" ").trim() || "Docente a confirmar";
}

/* ───────────────────────── Enlace malla curricular ↔ oferta del período ───────────────────────── */

/**
 * Dado el nombre de una materia de la malla curricular completa (que puede
 * no coincidir carácter a carácter con el nombre en el Excel del período,
 * ej. "Cálculo VI" vs "Cálculo VI (Transformadas de Laplace y Fourier)"),
 * busca el nombre real ofertado este período más parecido.
 * Devuelve null si la materia no se dicta este período.
 */
const nombreOfertadoCache = new Map<string, string | null>();

export function nombreOfertadoParaMalla(nombreMalla: string): string | null {
  if (nombreOfertadoCache.has(nombreMalla)) return nombreOfertadoCache.get(nombreMalla)!;
  const resultado =
    [...new Set(DATA.map((section) => section.materia))]
      .filter((name) => academicNamesMatch(nombreMalla, name))
      .sort((a, b) => a.localeCompare(b, "es"))[0] || null;
  nombreOfertadoCache.set(nombreMalla, resultado);
  return resultado;
}

const seccionesPorMateriaCache = new Map<string, Seccion[]>();
const seccionesCursablesCache = new Map<string, Seccion[]>();

const ENFASIS_EXCEL: Record<EnfasisId, string[]> = {
  "control-industrial": ["ci", "control industrial"],
  "electronica-medica": ["em", "electronica medica"],
  mecatronica: ["mec", "mecatronica"],
  teleprocesamiento: ["ti", "teleprocesamiento"],
};

/** Filtra las filas específicas de una orientación sin excluir las materias comunes. */
export function seccionAplicaAEnfasis(section: Seccion, enfasis?: EnfasisId | null): boolean {
  if (!enfasis) return true;
  const source = normalizeAcademicName(section.enfasis);
  const tokens = source.split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens.every((token) => /^-+$/.test(token))) return true;
  return ENFASIS_EXCEL[enfasis].some(
    (alias) => tokens.includes(alias) || (alias.includes(" ") && source.includes(alias)),
  );
}

/** Una sección es solo de examen cuando la fuente oficial no informa ningún horario de clase. */
export function esSeccionSoloExamen(section: Pick<Seccion, "clases">): boolean {
  return section.clases.length === 0;
}

/** Nombre apto para mostrar, sin la marca operativa del Excel. */
export function nombreMateriaVisible(nombre: string): string {
  return nombre
    .replace(/\s*\(\s*\*+\s*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Todas las secciones ofertadas este período para una materia de la malla curricular. */
export function seccionesPorMateriaMalla(
  nombreMalla: string,
  plan = "2008",
  enfasis?: EnfasisId | null,
): Seccion[] {
  const cacheKey = `${plan}::${enfasis || "todos"}::${nombreMalla}`;
  if (seccionesPorMateriaCache.has(cacheKey)) return seccionesPorMateriaCache.get(cacheKey)!;
  const result = DATA.filter(
    (section) =>
      section.plan === plan &&
      academicNamesMatch(nombreMalla, section.materia) &&
      seccionAplicaAEnfasis(section, enfasis),
  ).sort(
    (a, b) =>
      a.turno.localeCompare(b.turno) ||
      a.seccion.localeCompare(b.seccion, "es") ||
      (a.sourceRow || 0) - (b.sourceRow || 0),
  );
  seccionesPorMateriaCache.set(cacheKey, result);
  return result;
}

/** Secciones con al menos un horario semanal válido informado por la fuente oficial. */
export function seccionesCursablesPorMateriaMalla(
  nombreMalla: string,
  plan = "2008",
  enfasis?: EnfasisId | null,
): Seccion[] {
  const cacheKey = `${plan}::${enfasis || "todos"}::${nombreMalla}`;
  if (seccionesCursablesCache.has(cacheKey)) return seccionesCursablesCache.get(cacheKey)!;
  const result = seccionesPorMateriaMalla(nombreMalla, plan, enfasis).filter(
    (section) => !esSeccionSoloExamen(section),
  );
  seccionesCursablesCache.set(cacheKey, result);
  return result;
}

/** Departamentos informados por el Excel para una materia. */
export function departamentosPorMateriaMalla(
  nombreMalla: string,
  plan = "2008",
  enfasis?: EnfasisId | null,
): string[] {
  return [
    ...new Set(
      seccionesPorMateriaMalla(nombreMalla, plan, enfasis)
        .map((section) => section.departamento?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
}

/** Etiqueta visible de una alternativa. La sección X/Y queda como dato interno. */
export function etiquetaSeleccion(section: Seccion, alternatives: Seccion[] = []): string {
  const mode =
    section.modoSeleccion || (section.plan === "2026" ? ("opcion" as const) : ("seccion" as const));
  if (mode === "turno") {
    const shift = TURNO_LABEL[section.turno] || section.turno || "sin confirmar";
    let label = `Turno ${shift}`;
    if (section.laboratorio?.grupo) label += ` · laboratorio ${section.laboratorio.grupo}`;
    const comparable = alternatives.filter(
      (candidate) =>
        candidate.turno === section.turno &&
        (candidate.laboratorio?.grupo || "") === (section.laboratorio?.grupo || ""),
    );
    if (comparable.length > 1) {
      const index = comparable.findIndex((candidate) => candidate.id === section.id);
      if (index >= 0) label += ` · horario ${index + 1}`;
    }
    return label;
  }
  if (section.laboratorio?.grupo) return `Grupo de laboratorio ${section.laboratorio.grupo}`;
  if (mode === "opcion") {
    return alternatives.length === 1 ? "Opción única" : `Opción ${section.seccion}`;
  }
  return `Sección ${section.seccion}`;
}

/** Resumen corto del horario semanal de una sección, ej: "Lu 10:00-12:15 · Mi 10:00-12:15" */
export function resumenHorario(s: Seccion): string {
  if (!s.clases.length) return "Sin clases presenciales registradas";
  const abbr: Record<string, string> = {
    Lunes: "Lu",
    Martes: "Ma",
    Miércoles: "Mi",
    Jueves: "Ju",
    Viernes: "Vi",
    Sábado: "Sa",
  };
  return s.clases
    .map((c) => `${c.tipo === "laboratorio" ? "Lab " : ""}${abbr[c.dia] ?? c.dia} ${c.hora}`)
    .join(" · ");
}
