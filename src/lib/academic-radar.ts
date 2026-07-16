import { AVISOS } from "@/data/avisos";
import { TRAMITES } from "@/data/calendario-academico";
import { calcularStats, cargarMaterias } from "./asistencia";
import {
  DATA,
  findScheduleConflicts,
  listExamenes,
  loadSelection,
  parseHora,
  type Seccion,
} from "./poliplanner";
import { loadStudyPlans } from "./study-planner";

export type RadarItemType = "risk" | "opportunity" | "action" | "notice" | "event";
export type RadarPriority = "low" | "medium" | "high" | "critical";
export interface RadarItem {
  id: string;
  type: RadarItemType;
  priority: RadarPriority;
  title: string;
  description: string;
  source: string;
  relatedEntityId?: string;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
}
export interface RadarSnapshot {
  items: RadarItem[];
  selectedSections: Seccion[];
  generatedAt: string;
  nextClass: RadarItem | null;
  nextExam: RadarItem | null;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const stable = (parts: (string | number | undefined)[]) =>
  parts
    .filter(Boolean)
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ:-]+/g, "-");
const atTime = (day: Date, range: string) => {
  const parsed = parseHora(range);
  if (!parsed) return null;
  const d = new Date(day);
  d.setHours(Math.floor(parsed.start / 60), parsed.start % 60, 0, 0);
  return d;
};
const selectedSections = () => {
  const selection = loadSelection();
  const ids = new Set(Object.values(selection.secciones));
  return DATA.filter((s) => ids.has(s.id));
};

export function buildAcademicRadar(now = new Date()): RadarSnapshot {
  const createdAt = now.toISOString();
  const sections = selectedSections();
  const items: RadarItem[] = [];
  const push = (item: Omit<RadarItem, "id" | "createdAt"> & { id?: string }) =>
    items.push({
      ...item,
      id: item.id ?? stable([item.type, item.source, item.relatedEntityId, item.title]),
      createdAt,
    });
  if (!sections.length)
    push({
      type: "action",
      priority: "medium",
      title: "Configurá tu horario",
      description: "Seleccioná materias y secciones para recibir alertas personalizadas.",
      source: "Planificador IEK",
      actionUrl: "/poliplanner",
    });

  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const upcomingClasses: { at: Date; section: Seccion; room: string | null }[] = [];
  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const name = dayNames[day.getDay()];
    for (const s of sections)
      for (const c of s.clases)
        if (c.dia === name) {
          const at = atTime(day, c.hora);
          if (at && at > now) upcomingClasses.push({ at, section: s, room: c.aula });
        }
  }
  upcomingClasses.sort((a, b) => +a.at - +b.at);
  const next = upcomingClasses[0];
  const nextClass = next
    ? {
        id: stable(["class", next.section.id, next.at.toISOString()]),
        type: "event" as const,
        priority: "medium" as const,
        title: `Próxima clase: ${next.section.materia}`,
        description: `${next.at.toLocaleDateString("es-PY", { weekday: "long" })}, ${next.at.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })} · ${next.room || "No hay aula confirmada"}`,
        source: "Horario guardado",
        relatedEntityId: next.section.id,
        actionUrl: "/poliplanner",
        createdAt,
      }
    : null;
  if (nextClass) items.push(nextClass);

  const exams = listExamenes(sections, { incluirRevisiones: false })
    .map((e) => ({ ...e, at: new Date(`${isoDay(e.fecha)}T${e.info.hora || "00:00"}:00`) }))
    .filter((e) => e.at >= now)
    .sort((a, b) => +a.at - +b.at);
  const exam = exams[0];
  const nextExam = exam
    ? {
        id: stable(["exam", exam.seccion.id, exam.tipo, exam.at.toISOString()]),
        type: "event" as const,
        priority: (+exam.at - +now < 7 * 864e5 ? "high" : "medium") as RadarPriority,
        title: `Próximo examen: ${exam.seccion.materia}`,
        description: `${exam.at.toLocaleDateString("es-PY")} a las ${exam.info.hora || "hora pendiente"} · ${exam.info.aula || "No hay aula confirmada"}`,
        source: "Cronograma de exámenes",
        relatedEntityId: exam.seccion.id,
        actionUrl: "/aulas",
        createdAt,
      }
    : null;
  if (nextExam) items.push(nextExam);

  for (const m of cargarMaterias()) {
    const stats = calcularStats(m);
    if (stats.presentes + stats.faltasConsumidas > 0 && stats.porcentajeActual < 70)
      push({
        type: "risk",
        priority: stats.porcentajeActual < 50 ? "critical" : "high",
        title: `Asistencia comprometida: ${m.nombre}`,
        description: `Tu asistencia registrada es ${stats.porcentajeActual.toFixed(1)} %. Revisá tu habilitación y las clases restantes.`,
        source: "Calculadora de asistencia",
        relatedEntityId: m.id,
        actionUrl: "/asistencia",
      });
  }
  const conflicts = findScheduleConflicts(sections);
  if (conflicts.length)
    push({
      type: "risk",
      priority: "high",
      title: "Conflictos en el horario",
      description: `Se detectaron ${conflicts.length} solapamientos superiores al margen permitido.`,
      source: "Planificador IEK",
      actionUrl: "/poliplanner",
    });

  const plans = loadStudyPlans();
  for (const e of exams.filter((e) => +e.at - +now < 14 * 864e5)) {
    if (!plans.some((p) => p.subjectId === e.seccion.materiaId && p.status === "active"))
      push({
        type: "action",
        priority: "high",
        title: `Prepará ${e.seccion.materia}`,
        description: "Hay un examen próximo y todavía no existe un plan de estudio activo.",
        source: "Planificador de estudio",
        relatedEntityId: e.seccion.materiaId,
        actionUrl: "/plan-de-estudio",
      });
  }
  for (const p of plans) {
    const pending = p.sessions.filter((s) => s.status === "pending" && new Date(s.startsAt) < now);
    if (pending.length)
      push({
        type: "risk",
        priority: pending.length > 2 ? "high" : "medium",
        title: `Plan atrasado: ${p.subjectName}`,
        description: `Tenés ${pending.length} sesiones pendientes. Podés reprogramarlas automáticamente.`,
        source: "Planificador de estudio",
        relatedEntityId: p.id,
        actionUrl: "/plan-de-estudio",
      });
  }

  for (const t of TRAMITES) {
    const start = new Date(`${t.inicio}T00:00:00`),
      end = new Date(`${t.fin ?? t.inicio}T23:59:59`);
    if (end >= now && +start - +now < 14 * 864e5)
      push({
        type: "event",
        priority: +end - +now < 4 * 864e5 ? "high" : "medium",
        title: t.titulo,
        description: `${start <= now ? "En curso" : "Abre pronto"}. Finaliza el ${end.toLocaleDateString("es-PY")}.`,
        source: "Calendario académico",
        relatedEntityId: t.id,
        actionUrl: "/calendario-academico",
        expiresAt: end.toISOString(),
      });
  }
  for (const a of AVISOS.filter((a) => a.destacado).slice(0, 3))
    push({
      type: "notice",
      priority: a.tipo === "importante" ? "high" : "medium",
      title: a.titulo,
      description: a.resumen,
      source: "Delegación IEK",
      relatedEntityId: a.id,
      actionUrl: "/avisos",
    });
  const rank = { critical: 4, high: 3, medium: 2, low: 1 };
  const unique = [...new Map(items.map((i) => [i.id, i])).values()].sort(
    (a, b) => rank[b.priority] - rank[a.priority] || a.title.localeCompare(b.title, "es"),
  );
  return { items: unique, selectedSections: sections, generatedAt: createdAt, nextClass, nextExam };
}
