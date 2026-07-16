/**
 * /calendario-academico — Calendario Académico 2026
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Users,
  GraduationCap,
  PartyPopper,
  ClipboardList,
  Globe2,
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { PageBreadcrumb, PageEyebrow } from "@/components/PageHeading";
import { supabase } from "@/lib/supabase";
import {
  EVENTOS_CON_FECHA,
  TRAMITES,
  HOMOLOGACIONES,
  PERIODOS_EVALUACION,
  ENTREGA_DOCUMENTOS,
  estadoPeriodo,
  fechaPeriodoLabel,
  type CategoriaCalendario,
  type PeriodoAcademico,
} from "@/data/calendario-academico";

export const Route = createFileRoute("/calendario-academico")({
  component: CalendarioAcademicoPage,
});

const CATEGORIA_META: Record<
  CategoriaCalendario,
  { label: string; color: string; Icon: typeof Users }
> = {
  docente: { label: "Actividad docente", color: "#3b82f6", Icon: Users },
  clases: { label: "Período de clases", color: "#34d399", Icon: GraduationCap },
  feriado: { label: "Feriado / Asueto", color: "#fbbf24", Icon: PartyPopper },
};

const FILTROS: { key: CategoriaCalendario | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "docente", label: "Actividades docentes" },
  { key: "clases", label: "Período de clases" },
  { key: "feriado", label: "Feriados y asuetos" },
];

const ESTADO_META = {
  proximamente: { label: "Próximamente", color: "#3b82f6" },
  "en-curso": { label: "En curso", color: "#34d399" },
  finalizado: { label: "Finalizado", color: "#94a3b8" },
} as const;

function PeriodoCard({
  periodo,
  compact = false,
}: {
  periodo: PeriodoAcademico;
  compact?: boolean;
}) {
  const estado = estadoPeriodo(periodo);
  const meta = ESTADO_META[estado];
  return (
    <div className={`rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-foreground">{periodo.titulo}</p>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{fechaPeriodoLabel(periodo)}</span>
          </p>
        </div>
        <span
          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: `${meta.color}1f`, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
    </div>
  );
}

function CalendarioAcademicoPage() {
  const [filtro, setFiltro] = useState<CategoriaCalendario | "todos">("todos");
  const [eventosDelegacion, setEventosDelegacion] = useState<
    {
      id: string;
      title: string;
      description: string | null;
      starts_at: string;
      ends_at: string | null;
    }[]
  >([]);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("academic_events")
      .select("id,title,description,starts_at,ends_at")
      .eq("status", "published")
      .order("starts_at", { ascending: true })
      .then(({ data }) => setEventosDelegacion(data || []));
  }, []);

  const eventos = useMemo(
    () =>
      filtro === "todos"
        ? EVENTOS_CON_FECHA
        : EVENTOS_CON_FECHA.filter((e) => e.categoria === filtro),
    [filtro],
  );

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="max-w-3xl">
              <PageBreadcrumb current="Calendario Académico" />
              <PageEyebrow icon={CalendarDays}>Fechas y trámites académicos</PageEyebrow>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                Calendario <span className="text-gradient">Académico 2026</span>
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Fechas clave del período, trámites disponibles, exámenes, homologaciones y feriados
                — todo en un solo lugar.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-6 space-y-16">
            {eventosDelegacion.length > 0 && (
              <Reveal>
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">
                      Actualizaciones de la Delegación
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {eventosDelegacion.map((evento) => (
                      <article
                        key={evento.id}
                        className="rounded-xl border border-primary/20 bg-primary/5 p-4"
                      >
                        <h3 className="text-sm font-semibold text-foreground">{evento.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(evento.starts_at).toLocaleString("es-PY", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                          {evento.ends_at
                            ? ` — ${new Date(evento.ends_at).toLocaleString("es-PY", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}`
                            : ""}
                        </p>
                        {evento.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{evento.description}</p>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ── LÍNEA DE TIEMPO ── */}
            <div>
              <Reveal>
                <div className="mb-6 flex flex-wrap gap-2">
                  {FILTROS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFiltro(f.key)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        filtro === f.key
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </Reveal>

              <div className="relative space-y-3 border-l-2 border-border pl-6">
                {eventos.map((e) => {
                  const meta = CATEGORIA_META[e.categoria];
                  return (
                    <Reveal key={e.id}>
                      <div className="card-hover relative rounded-2xl border border-border bg-card p-4">
                        <span
                          className="absolute -left-[31px] top-5 grid h-4 w-4 place-items-center rounded-full ring-4 ring-background"
                          style={{ background: meta.color }}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{ background: `${meta.color}20`, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" /> {e.fechaLabel}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-foreground">{e.titulo}</p>
                        {e.detalle && (
                          <p className="mt-1 text-xs text-muted-foreground">{e.detalle}</p>
                        )}
                      </div>
                    </Reveal>
                  );
                })}
                {eventos.length === 0 && (
                  <p className="py-6 text-sm text-muted-foreground">
                    No hay eventos para este filtro.
                  </p>
                )}
              </div>
            </div>

            {/* ── TRÁMITES ACADÉMICOS ── */}
            <Reveal>
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Trámites académicos</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TRAMITES.map((t) => (
                    <PeriodoCard key={t.id} periodo={t} />
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Todos los procesos inician y finalizan a las 12:00 h del mediodía. Los pedidos
                  posteriores se procesan para el siguiente periodo académico.
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">Periodos de evaluación</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PERIODOS_EVALUACION.map((periodo) => (
                    <PeriodoCard key={periodo.id} periodo={periodo} />
                  ))}
                </div>
              </div>
            </Reveal>

            {/* ── EXÁMENES, HOMOLOGACIONES, INGRESANTES ── */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Reveal>
                <div className="card-hover h-full rounded-2xl border border-border bg-card p-5">
                  <GraduationCap className="mb-3 h-6 w-6 text-blue-400" />
                  <h3 className="font-semibold text-foreground">Exámenes</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Los periodos generales están indicados arriba. El día, la hora y el aula
                    dependen de cada materia.
                  </p>
                  <Link
                    to="/aulas"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Ver fechas por materia <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Reveal>
              <Reveal>
                <div className="card-hover h-full rounded-2xl border border-border bg-card p-5">
                  <Globe2 className="mb-3 h-6 w-6 text-violet-400" />
                  <h3 className="font-semibold text-foreground">Homologaciones internacionales</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {HOMOLOGACIONES.map((h) => (
                      <PeriodoCard key={h.id} periodo={h} compact />
                    ))}
                  </div>
                </div>
              </Reveal>
              <Reveal>
                <div className="card-hover h-full rounded-2xl border border-border bg-card p-5">
                  <FileCheck2 className="mb-3 h-6 w-6 text-emerald-400" />
                  <h3 className="font-semibold text-foreground">Entrega de documentos</h3>
                  <div className="mt-2">
                    <PeriodoCard periodo={ENTREGA_DOCUMENTOS} compact />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
