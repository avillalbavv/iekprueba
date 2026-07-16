/**
 * /aulas — ¿Dónde rindo? v5
 * Ahora usa la misma base de datos que Planificador IEK (generada del Excel),
 * con búsqueda unificada por materia o por profesor, y muestra docente +
 * las fechas de examen completas (incluida la segunda final).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import {
  MapPin,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  X,
  GraduationCap,
  Loader2,
  ExternalLink,
  List,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { PageBreadcrumb, PageEyebrow } from "@/components/PageHeading";
import {
  DATA,
  type Seccion,
  docenteNombre,
  esSeccionSoloExamen,
  examenLabel,
  listExamenes,
  nombreMateriaVisible,
  parseFechaExamen,
  loadSelection,
  TURNO_LABEL,
  TURNO_COLOR,
} from "@/lib/poliplanner";
import { academicNamesMatch } from "@/lib/academic-offer-matcher";
import { normalizeSearch, searchRank, searchVariants } from "@/lib/search";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/aulas")({ component: AulasPage });

const RESULTADOS_MAX = 60;

const ENFASIS_SHORT: Record<string, string> = {
  "CI,EM,TI": "CI · EM · TI",
  "CI,EM,MEC,TI": "Todos",
  CI: "Control Industrial",
  EM: "Electrónica Médica",
  TI: "Teleprocesamiento",
  MEC: "Mecatrónica",
  "-- --": "Plan Básico",
  "": "Plan Básico",
  "---": "Plan Básico",
};

const ACCESOS_MATERIA = [
  "Álgebra",
  "Cálculo I",
  "Física I",
  "Electrónica I",
  "Circuitos Eléctricos I",
];

const EXAM_ORDER = ["parcial1", "parcial2", "final1", "revision1", "final2", "revision2"] as const;
const EXAM_COLOR: Record<string, string> = {
  parcial1: "#3b82f6",
  parcial2: "#a78bfa",
  final1: "#22d3ee",
  revision1: "#94a3b8",
  final2: "#fb923c",
  revision2: "#94a3b8",
};

/* ── Tarjeta de examen individual ── */
function ExamenCell({ tipo, seccion }: { tipo: (typeof EXAM_ORDER)[number]; seccion: Seccion }) {
  const info = seccion.examenes[tipo];
  const color = EXAM_COLOR[tipo];
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
        {examenLabel(tipo)}
      </p>
      {info && (info.dia || info.aula) ? (
        <div className="space-y-1">
          {info.aula && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
              <span className="font-bold text-base" style={{ color }}>
                {info.aula}
              </span>
            </div>
          )}
          {info.dia && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 flex-shrink-0" />
              <span>{info.dia}</span>
            </div>
          )}
          {info.hora && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>{info.hora}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/50 italic">Sin datos</p>
      )}
    </div>
  );
}

function AulaCard({ seccion }: { seccion: Seccion }) {
  const turnoColor = TURNO_COLOR[seccion.turno] ?? "#8b97c2";
  const enf = ENFASIS_SHORT[seccion.enfasis] ?? (seccion.enfasis || "Plan Básico");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examenesConDatos = EXAM_ORDER.filter((tipo) => {
    const info = seccion.examenes[tipo];
    const date = parseFechaExamen(info?.dia || "");
    return Boolean(info && (info.dia || info.aula) && date && date >= today);
  });

  return (
    <article className="card-hover w-full overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold leading-snug text-foreground break-words">
            {nombreMateriaVisible(seccion.materia)}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
            {docenteNombre(seccion.docente)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {seccion.seccion && (
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sección {seccion.seccion}
              </span>
            )}
            {TURNO_LABEL[seccion.turno] && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: `${turnoColor}20`,
                  color: turnoColor,
                  border: `1px solid ${turnoColor}40`,
                }}
              >
                {TURNO_LABEL[seccion.turno]}
              </span>
            )}
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] text-muted-foreground">
              {enf}
            </span>
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] text-muted-foreground">
              Plan {seccion.plan}
            </span>
            {seccion.departamento && (
              <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] text-muted-foreground">
                {seccion.departamento}
              </span>
            )}
            {esSeccionSoloExamen(seccion) && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Solo examen final
              </span>
            )}
          </div>
        </div>
        {String(seccion.semGrupo) !== "---" && seccion.semGrupo !== "" && (
          <div className="flex-shrink-0 text-center">
            <p className="text-2xl font-black text-gradient leading-none">{seccion.semGrupo}</p>
            <p className="text-[10px] text-muted-foreground">Sem.</p>
          </div>
        )}
      </div>
      {/* Exámenes */}
      {examenesConDatos.length > 0 ? (
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          {examenesConDatos.map((tipo) => (
            <ExamenCell key={tipo} tipo={tipo} seccion={seccion} />
          ))}
        </div>
      ) : (
        <p className="px-5 py-4 text-xs italic text-muted-foreground/60">
          No hay exámenes próximos registrados para esta sección.
        </p>
      )}
    </article>
  );
}

interface CalendarExam {
  id: string;
  title: string;
  date: Date;
  time: string;
  room: string;
  detail: string;
  official: boolean;
}
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function ExamCalendar({ events }: { events: CalendarExam[] }) {
  const firstEvent = events[0];
  const firstMonth = firstEvent?.date ?? new Date();
  const [month, setMonth] = useState(
    () => new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1),
  );
  useEffect(() => {
    if (!firstEvent) return;
    setMonth(new Date(firstEvent.date.getFullYear(), firstEvent.date.getMonth(), 1));
  }, [firstEvent]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarExam[]>();
    for (const event of events)
      map.set(dateKey(event.date), [...(map.get(dateKey(event.date)) || []), event]);
    return map;
  }, [events]);
  const move = (delta: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="font-display text-lg font-semibold capitalize text-foreground">
            {month.toLocaleDateString("es-PY", { month: "long", year: "numeric" })}
          </h2>
          <p className="text-xs text-muted-foreground">
            Solo aparecen exámenes de las secciones guardadas en tu horario.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => move(-1)}
            aria-label="Mes anterior"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground"
          >
            Hoy
          </button>
          <button
            onClick={() => move(1)}
            aria-label="Mes siguiente"
            className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-xs font-semibold text-muted-foreground">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
              <div key={day} className="p-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((date) => {
              const dayEvents = grouped.get(dateKey(date)) || [];
              const outside = date.getMonth() !== month.getMonth();
              const isToday = dateKey(date) === dateKey(new Date());
              return (
                <div
                  key={dateKey(date)}
                  className={`min-h-28 border-b border-r border-border p-2 ${outside ? "bg-muted/15 text-muted-foreground/50" : "text-foreground"}`}
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs ${isToday ? "bg-primary font-bold text-primary-foreground" : ""}`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        title={`${event.title} · ${event.detail}`}
                        className={`rounded-md px-2 py-1 text-[10px] leading-tight ${event.official ? "bg-primary text-primary-foreground" : "bg-amber-500/15 text-amber-800 dark:text-amber-200"}`}
                      >
                        <b className="block truncate">{event.title}</b>
                        <span className="block truncate">
                          {event.time || "Hora pendiente"} · {event.room || "Aula pendiente"}
                        </span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3} exámenes
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {!events.length && (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No se encontraron exámenes próximos.
        </p>
      )}
    </div>
  );
}

function AulasPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [query, setQuery] = useState("");
  const [scheduledSectionIds, setScheduledSectionIds] = useState<string[]>([]);
  const [examenesDelegacion, setExamenesDelegacion] = useState<
    {
      id: string;
      subject_name: string;
      section: string | null;
      exam_at: string;
      room: string | null;
      campus: string | null;
      observation: string | null;
    }[]
  >([]);
  const debouncedQuery = useDebouncedValue(query, 180);
  const isSearching = query.trim() !== "" && query !== debouncedQuery;

  useEffect(() => {
    const refresh = () => setScheduledSectionIds(Object.values(loadSelection().secciones));
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("exam_schedules")
      .select("id,subject_name,section,exam_at,room,campus,observation")
      .eq("status", "confirmed")
      .order("exam_at", { ascending: true })
      .then(({ data }) => setExamenesDelegacion(data || []));
  }, []);

  // Índice normalizado: se construye una sola vez (no en cada tecla ni en
  // cada render), evitando trabajo O(n) repetido innecesariamente.
  const searchIndex = useMemo(() => {
    const withKeys = DATA.map((s) => ({
      seccion: s,
      materiaNorm: searchVariants(s.materia).join(" "),
      docenteNorm: normalizeSearch(docenteNombre(s.docente)),
      seccionNorm: normalizeSearch(s.seccion),
      departamentoNorm: normalizeSearch(s.departamento ?? ""),
    }));
    const fuse = new Fuse(withKeys, {
      keys: [
        { name: "materiaNorm", weight: 2 },
        { name: "docenteNorm", weight: 1.5 },
        { name: "seccionNorm", weight: 0.5 },
        { name: "departamentoNorm", weight: 0.5 },
      ],
      threshold: 0.34,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    return { withKeys, fuse };
  }, []);

  const resultadosCompletos = useMemo(() => {
    const qRaw = debouncedQuery.trim();
    if (!qRaw) return [];
    const q = normalizeSearch(qRaw);
    // Paso 1: coincidencia directa por substring (rápida, O(n), ya tolerante
    // a tildes/mayúsculas/números romanos vía normalización previa).
    const directos = searchIndex.withKeys.filter(
      (w) =>
        w.materiaNorm.includes(q) ||
        w.docenteNorm.includes(q) ||
        w.seccionNorm.includes(q) ||
        w.departamentoNorm.includes(q),
    );
    if (directos.length > 0) {
      return directos
        .map((w) => w.seccion)
        .sort(
          (a, b) =>
            searchRank(a.materia, qRaw) - searchRank(b.materia, qRaw) ||
            a.materia.localeCompare(b.materia, "es") ||
            a.seccion.localeCompare(b.seccion, "es"),
        );
    }
    // Paso 2: si no hubo match directo, recién ahí se recurre a Fuse.js
    // (más costoso) para tolerar errores de tipeo.
    return searchIndex.fuse
      .search(qRaw)
      .map((r) => r.item.seccion)
      .sort((a, b) => searchRank(a.materia, qRaw) - searchRank(b.materia, qRaw));
  }, [debouncedQuery, searchIndex]);

  // Se limita el DOM renderizado: con miles de registros, listar todos los
  // resultados de golpe degradaría la fluidez sin aportar valor real —
  // se muestran los primeros N y se invita a refinar la búsqueda.
  const resultados = resultadosCompletos.slice(0, RESULTADOS_MAX);
  const scheduledSections = useMemo(() => {
    const ids = new Set(scheduledSectionIds);
    return DATA.filter((section) => ids.has(section.id));
  }, [scheduledSectionIds]);

  const buscandoPorDocente = useMemo(() => {
    const q = normalizeSearch(debouncedQuery);
    if (!q) return false;
    return (
      resultados.length > 0 &&
      resultados.every((s) => normalizeSearch(docenteNombre(s.docente)).includes(q))
    );
  }, [resultados, debouncedQuery]);

  function seleccionar(m: string) {
    setQuery(m);
  }
  function limpiar() {
    setQuery("");
  }

  const queryActivo = query.trim();
  const examenesPublicados = useMemo(() => {
    const normalized = normalizeSearch(debouncedQuery);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = examenesDelegacion.filter((examen) => new Date(examen.exam_at) >= today);
    if (!normalized) return upcoming.slice(0, 6);
    return upcoming.filter((examen) =>
      normalizeSearch(
        `${examen.subject_name} ${examen.section || ""} ${examen.room || ""}`,
      ).includes(normalized),
    );
  }, [debouncedQuery, examenesDelegacion]);

  const calendarEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const staticEvents: CalendarExam[] = listExamenes(scheduledSections)
      .filter(
        (entry) => entry.fecha >= today && entry.tipo !== "revision1" && entry.tipo !== "revision2",
      )
      .map((entry) => ({
        id: `excel-${entry.seccion.id}-${entry.tipo}-${dateKey(entry.fecha)}`,
        title: nombreMateriaVisible(entry.seccion.materia),
        date: entry.fecha,
        time: entry.info.hora || "",
        room: entry.info.aula || "",
        detail: `${examenLabel(entry.tipo)} · Sección ${entry.seccion.seccion}${entry.seccion.departamento ? ` · ${entry.seccion.departamento}` : ""}`,
        official: false,
      }));
    const delegationEvents: CalendarExam[] = examenesDelegacion
      .filter((entry) =>
        scheduledSections.some((section) => {
          const sameSubject = academicNamesMatch(section.materia, entry.subject_name);
          const sameSection =
            !entry.section || normalizeSearch(entry.section) === normalizeSearch(section.seccion);
          return sameSubject && sameSection;
        }),
      )
      .map((entry) => ({
        id: `delegacion-${entry.id}`,
        title: entry.subject_name,
        date: new Date(entry.exam_at),
        time: new Date(entry.exam_at).toLocaleTimeString("es-PY", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        room: entry.room || "",
        detail: `Publicado por la Delegación${entry.section ? ` · Sección ${entry.section}` : ""}`,
        official: true,
      }))
      .filter((entry) => !Number.isNaN(entry.date.getTime()) && entry.date >= today);
    const unique = new Map<string, CalendarExam>();
    for (const entry of [...delegationEvents, ...staticEvents]) {
      const signature = `${normalizeSearch(entry.title)}::${dateKey(entry.date)}::${entry.time}::${entry.room}`;
      if (!unique.has(signature) || entry.official) unique.set(signature, entry);
    }
    return [...unique.values()].sort(
      (a, b) => a.date.getTime() - b.date.getTime() || a.title.localeCompare(b.title, "es"),
    );
  }, [scheduledSections, examenesDelegacion]);

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="max-w-3xl">
              <PageBreadcrumb current="¿Dónde rindo?" />
              <PageEyebrow icon={MapPin}>Exámenes y aulas</PageEyebrow>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                ¿Dónde <span className="text-gradient">rindo?</span>
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Buscá por materia, profesor, sección o departamento y encontrá aula, día, hora y
                docente de cada examen — primer parcial, segundo parcial, primera final y segunda
                final.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/75">
                Datos de horarios y exámenes: Primer Periodo 2026 · actualización 06/07/2026.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-4xl px-6">
            {/* ── BUSCADOR ── */}
            <Reveal>
              <div className="relative mb-8">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-4 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Materia, profesor, sección o departamento…"
                    aria-label="Buscar por materia, profesor, sección o departamento"
                    className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-12 text-base text-foreground placeholder:text-muted-foreground transition focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {isSearching ? (
                    <Loader2 className="absolute right-4 h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    query && (
                      <button
                        onClick={limpiar}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    ¿Dónde me inscribo para rendir?
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    La inscripción de grado se realiza en el sistema oficial de la FP-UNA. Verificá
                    convocatoria y plazo antes de confirmar.
                  </p>
                  <a
                    href="https://inscripciones.pol.una.py/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Abrir Inscripciones de Grado <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div
                  className="flex h-fit rounded-xl border border-border bg-card p-1"
                  aria-label="Vista de exámenes"
                >
                  <button
                    onClick={() => setView("list")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    <List className="h-3.5 w-3.5" /> Lista
                  </button>
                  <button
                    onClick={() => setView("calendar")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> Calendario
                  </button>
                </div>
              </div>
            </Reveal>

            {examenesPublicados.length > 0 && (
              <Reveal>
                <div className="mb-8">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
                    Datos publicados por la Delegación
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {examenesPublicados.map((examen) => (
                      <article
                        key={examen.id}
                        className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
                      >
                        <h3 className="font-semibold text-foreground">{examen.subject_name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(examen.exam_at).toLocaleString("es-PY", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {examen.section && <span>Sección {examen.section}</span>}
                          <span className="font-semibold text-primary">
                            {examen.room || "Aula pendiente de confirmación"}
                          </span>
                          {examen.campus && <span>{examen.campus}</span>}
                        </div>
                        {examen.observation && (
                          <p className="mt-2 text-xs text-muted-foreground">{examen.observation}</p>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ── RESULTADOS ── */}
            {view === "calendar" ? (
              <Reveal>
                {scheduledSections.length > 0 ? (
                  <ExamCalendar events={calendarEvents} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
                    <CalendarDays className="mx-auto h-10 w-10 text-primary/50" />
                    <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                      Tu calendario todavía está vacío
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      Seleccioná y guardá las secciones que cursás. Acá aparecerán únicamente sus
                      próximos exámenes.
                    </p>
                    <Link
                      to="/poliplanner"
                      className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      Armar mi horario
                    </Link>
                  </div>
                )}
              </Reveal>
            ) : resultados.length > 0 ? (
              <Reveal>
                <p className="mb-4 text-xs text-muted-foreground">
                  <strong className="text-foreground">{resultadosCompletos.length}</strong>{" "}
                  resultado{resultadosCompletos.length !== 1 ? "s" : ""}
                  {buscandoPorDocente ? " del profesor " : " para "}
                  <strong className="text-foreground">"{queryActivo}"</strong>
                  {resultadosCompletos.length > RESULTADOS_MAX &&
                    ` · mostrando los primeros ${RESULTADOS_MAX}, refiná la búsqueda para ver el resto`}
                </p>
                <div className="flex flex-col gap-4 stagger is-visible">
                  {resultados.map((s) => (
                    <AulaCard key={s.id} seccion={s} />
                  ))}
                </div>
              </Reveal>
            ) : queryActivo ? (
              <Reveal>
                <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                  <MapPin className="h-12 w-12 opacity-20" />
                  <p className="text-lg font-medium text-foreground">Sin resultados</p>
                  <p className="text-sm">Probá con otro nombre de materia o de profesor.</p>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-base font-medium text-foreground">
                    Escribí una materia o un profesor para buscar
                  </p>
                  <p className="text-sm">Por ejemplo: "Álgebra" o el apellido de tu profesor</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {ACCESOS_MATERIA.map((m) => (
                      <button
                        key={m}
                        onClick={() => seleccionar(m)}
                        className="rounded-full border border-border bg-card px-4 py-2 text-xs text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
