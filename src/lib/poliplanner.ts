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
  docentesPosibles?: string[];
  docenteEsPlantel?: boolean;
  modoSeleccion?: "seccion" | "turno" | "opcion";
  tipoOferta?: "teoria" | "laboratorio";
  soloExamenFinal?: boolean;
  requiereLaboratorio?: boolean;
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
  seccionesTeoricasCache.clear();
  laboratoriosCache.clear();
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
    for (let j = i; j < secciones.length; j++) {
      const a = secciones[i],
        b = secciones[j];
      for (let aIndex = 0; aIndex < a.clases.length; aIndex++) {
        const ca = a.clases[aIndex];
        const ra = parseHora(ca.hora);
        if (!ra) continue;
        const bStart = i === j ? aIndex + 1 : 0;
        for (let bIndex = bStart; bIndex < b.clases.length; bIndex++) {
          const cb = b.clases[bIndex];
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
  hora: string;
  entries: ExamEntry[];
}

/** Agrupa únicamente exámenes de materias distintas con la misma fecha y hora. */
export function findExamConflicts(examenes: ExamEntry[]): ExamConflict[] {
  const byDateAndTime = new Map<string, { hora: string; entries: ExamEntry[] }>();
  for (const e of examenes) {
    const match = (e.info.hora || "").match(/(\d{1,2}):(\d{2})/);
    if (!match) continue;
    const hora = `${match[1].padStart(2, "0")}:${match[2]}`;
    const key = `${e.fecha.toDateString()}::${hora}`;
    const group = byDateAndTime.get(key) ?? { hora, entries: [] };
    group.entries.push(e);
    byDateAndTime.set(key, group);
  }
  const conflicts: ExamConflict[] = [];
  for (const { hora, entries } of byDateAndTime.values()) {
    const materiasUnicas = new Set(entries.map((e) => e.seccion.materiaId));
    if (materiasUnicas.size > 1) {
      conflicts.push({ fecha: entries[0].fecha, hora, entries });
    }
  }
  return conflicts.sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime() || a.hora.localeCompare(b.hora),
  );
}

/* ───────────────────────── Persistencia local ───────────────────────── */

const STORAGE_KEY = "poliplanner:seleccion:v2";

export interface PlannerSelection {
  malla: "plan-2008" | "vigente-2026";
  enfasis: string | null;
  materiaIds: string[];
  secciones: Record<string, string>; // materiaId de la malla -> sección teórica
  laboratorios: Record<string, string>; // materiaId de la malla -> práctica
}

export function loadSelection(): PlannerSelection {
  const empty: PlannerSelection = {
    malla: "plan-2008",
    enfasis: null,
    materiaIds: [],
    secciones: {},
    laboratorios: {},
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
      laboratorios:
        typeof parsed.laboratorios === "object" && parsed.laboratorios ? parsed.laboratorios : {},
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
const seccionesTeoricasCache = new Map<string, Seccion[]>();
const laboratoriosCache = new Map<string, Seccion[]>();

/** La planilla de la malla anterior conserva una materia con Plan 2009. */
function sectionMatchesMallaPlan(sectionPlan: string, requestedPlan: string): boolean {
  if (requestedPlan === "2008") return sectionPlan === "2008" || sectionPlan === "2009";
  return sectionPlan === requestedPlan;
}

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

/** Una sección es solo de examen cuando tiene (*) o no informa ningún horario de clase. */
export function esSeccionSoloExamen(section: Pick<Seccion, "clases" | "soloExamenFinal">): boolean {
  return Boolean(section.soloExamenFinal) || section.clases.length === 0;
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
      sectionMatchesMallaPlan(section.plan, plan) &&
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

function idDerivado(prefix: "teoria" | "laboratorio", key: string): string {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index++) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function claveTeoria(section: Seccion): string {
  return [
    section.plan,
    section.sourceRow ?? "",
    normalizeAcademicName(section.materia),
    section.seccion,
    section.turno,
    String(section.semGrupo),
    normalizeAcademicName(section.enfasis),
  ].join("::");
}

function claveLaboratorio(section: Seccion): string {
  const clases = section.clases
    .filter((clase) => clase.tipo === "laboratorio")
    .map((clase) => `${clase.dia}:${clase.hora}:${clase.aula || ""}`)
    .sort()
    .join("|");
  return [
    section.plan,
    normalizeAcademicName(section.materia),
    section.laboratorio?.grupo || "Único",
    normalizeAcademicName(section.laboratorio?.docente || ""),
    clases,
  ].join("::");
}

function docenteDesdeTexto(nombre: string): Docente {
  const limpio = nombre.trim();
  return {
    titulo: "",
    apellido: "",
    nombre: limpio && normalizeAcademicName(limpio) !== "docente a confirmar" ? limpio : "",
    correo: "",
  };
}

/** Convierte una alternativa combinada del importador en su materia teórica. */
export function separarOfertaTeorica(section: Seccion): Seccion {
  const key = claveTeoria(section);
  return {
    ...section,
    id: idDerivado("teoria", key),
    tipoOferta: "teoria",
    laboratorio: undefined,
    clases: section.clases.filter((clase) => clase.tipo !== "laboratorio"),
  };
}

/** Convierte una alternativa combinada del importador en una práctica independiente. */
export function separarOfertaLaboratorio(section: Seccion): Seccion | null {
  if (!section.laboratorio) return null;
  const clases = section.clases.filter((clase) => clase.tipo === "laboratorio");
  if (!clases.length) return null;
  const key = claveLaboratorio(section);
  const docenteLaboratorio = section.laboratorio.docente || "Docente a confirmar";
  return {
    ...section,
    id: idDerivado("laboratorio", key),
    seccion: "",
    turno: "",
    tipoOferta: "laboratorio",
    docente: docenteDesdeTexto(docenteLaboratorio),
    docentesPosibles:
      normalizeAcademicName(docenteLaboratorio) === "docente a confirmar"
        ? []
        : [docenteLaboratorio],
    docenteEsPlantel: false,
    clases,
    examenes: {},
    mesaExaminadora: { presidente: "", miembro1: "", miembro2: "" },
  };
}

/** Opciones teóricas únicas. Nunca incluyen horas de laboratorio. */
export function seccionesTeoricasPorMateriaMalla(
  nombreMalla: string,
  plan = "2008",
  enfasis?: EnfasisId | null,
): Seccion[] {
  const cacheKey = `${plan}::${enfasis || "todos"}::${nombreMalla}`;
  if (seccionesTeoricasCache.has(cacheKey)) return seccionesTeoricasCache.get(cacheKey)!;
  const unicas = new Map<string, Seccion>();
  for (const section of seccionesCursablesPorMateriaMalla(nombreMalla, plan, enfasis)) {
    const teoria = separarOfertaTeorica(section);
    if (!teoria.clases.length) continue;
    if (!unicas.has(teoria.id)) unicas.set(teoria.id, teoria);
  }
  const result = [...unicas.values()].sort(
    (a, b) =>
      a.turno.localeCompare(b.turno) ||
      a.seccion.localeCompare(b.seccion, "es") ||
      (a.sourceRow || 0) - (b.sourceRow || 0),
  );
  seccionesTeoricasCache.set(cacheKey, result);
  return result;
}

/** Prácticas únicas de una materia. No incluyen teoría, sección X/Y ni exámenes. */
export function laboratoriosPorMateriaMalla(
  nombreMalla: string,
  plan = "2008",
  enfasis?: EnfasisId | null,
): Seccion[] {
  const cacheKey = `${plan}::${enfasis || "todos"}::${nombreMalla}`;
  if (laboratoriosCache.has(cacheKey)) return laboratoriosCache.get(cacheKey)!;
  const unicos = new Map<string, Seccion>();
  for (const section of seccionesCursablesPorMateriaMalla(nombreMalla, plan, enfasis)) {
    const laboratorio = separarOfertaLaboratorio(section);
    if (laboratorio && !unicos.has(laboratorio.id)) unicos.set(laboratorio.id, laboratorio);
  }
  const result = [...unicos.values()].sort(
    (a, b) =>
      (a.laboratorio?.grupo || "").localeCompare(b.laboratorio?.grupo || "", "es", {
        numeric: true,
      }) || resumenHorario(a).localeCompare(resumenHorario(b), "es"),
  );
  laboratoriosCache.set(cacheKey, result);
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

/** Etiqueta visible: sección oficial X/Y, turno y grupo de laboratorio cuando corresponde. */
export function etiquetaSeleccion(section: Seccion, _alternatives: Seccion[] = []): string {
  if (section.tipoOferta === "laboratorio") {
    const group = section.laboratorio?.grupo;
    return group && group !== "Único" ? `Laboratorio ${group}` : "Laboratorio";
  }
  const sectionName = section.seccion || "Sin sección";
  const shift = TURNO_LABEL[section.turno] || section.turno;
  let label = `Sección ${sectionName}`;
  if (shift) label += ` · ${shift}`;
  if (section.laboratorio?.grupo) {
    label +=
      section.laboratorio.grupo === "Único"
        ? " · laboratorio"
        : ` · laboratorio ${section.laboratorio.grupo}`;
  }
  return label;
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
