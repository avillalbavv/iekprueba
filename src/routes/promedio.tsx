/**
 * /promedio — Calculadora de Promedio General v2
 *
 * Rediseño: ya no se cargan materias a mano. Las materias se toman
 * directamente de la base de datos generada del Excel (agrupadas por
 * semestre). El usuario solo marca cuáles aprobó y con qué nota;
 * el promedio se recalcula en tiempo real. Persistencia en localStorage.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart2, Search, Check, RotateCcw, Info } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { PageBreadcrumb, PageEyebrow } from "@/components/PageHeading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DATA, esSeccionSoloExamen, groupByMateria } from "@/lib/poliplanner";
import { normalizeSearch, searchRank } from "@/lib/search";
import { writeLocalState } from "@/lib/user-state";

export const Route = createFileRoute("/promedio")({ component: PromedioPage });

/* ================================================================
   CONSTANTES
================================================================ */
const NOTA_COLOR: Record<number, string> = {
  1: "#f87171",
  2: "#a78bfa",
  3: "#3b82f6",
  4: "#22d3ee",
  5: "#34d399",
};
const NOTA_LABEL: Record<number, string> = {
  1: "Insuf.",
  2: "Regular",
  3: "Bueno",
  4: "Distint.",
  5: "Sobres.",
};
const STORAGE_KEY = "iek-promedio-db-v2";

function uniqueMaterias() {
  // Una fila por materia (sin duplicar por sección/turno), agrupadas por semestre.
  const groups = groupByMateria(DATA.filter((m) => !esSeccionSoloExamen(m)));
  return groups.map((g) => ({ id: g.id, materia: g.materia, semestre: g.semestre, plan: g.plan }));
}

function semestreOrder(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) && s !== "—" ? n : 99;
}

/* ================================================================
   PÁGINA
================================================================ */
function PromedioPage() {
  const materias = useMemo(() => uniqueMaterias(), []);

  const semestres = useMemo(() => {
    const map = new Map<
      string,
      { id: string; materia: string; semestre: string; plan: string }[]
    >();
    materias.forEach((m) => {
      if (!map.has(m.semestre)) map.set(m.semestre, []);
      map.get(m.semestre)!.push(m);
    });
    return [...map.entries()]
      .sort((a, b) => semestreOrder(a[0]) - semestreOrder(b[0]))
      .map(([sem, items]) => ({
        sem,
        items: items.sort((a, b) => a.materia.localeCompare(b.materia, "es")),
      }));
  }, [materias]);

  const [notas, setNotas] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [openSemestres, setOpenSemestres] = useState<string[]>(["1"]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setNotas(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      writeLocalState(STORAGE_KEY, JSON.stringify(notas));
    } catch {
      /* ignore */
    }
  }, [notas, hydrated]);

  function toggle(materiaId: string) {
    setNotas((prev) => {
      const next = { ...prev };
      if (materiaId in next) delete next[materiaId];
      else next[materiaId] = 3;
      return next;
    });
  }

  function setNota(materiaId: string, nota: number) {
    setNotas((prev) => ({ ...prev, [materiaId]: nota }));
  }

  function limpiarTodo() {
    if (!confirm("¿Desmarcar todas las materias aprobadas?")) return;
    setNotas({});
  }

  const stats = useMemo(() => {
    const valores = Object.values(notas);
    if (!valores.length) return null;
    const materiasCount = valores.length;
    const materiasNota1 = valores.filter((v) => v === 1).length;

    // Regla obligatoria del reglamento: una materia con nota final 1 (aplazada)
    // se computa DOS VECES en el promedio general, porque la recursada vuelve
    // a contarse al aprobarla. Ej: notas 5, 4, 1 → (5 + 4 + 1 + 1) / 4.
    const valoresPonderados = valores.flatMap((v) => (v === 1 ? [1, 1] : [v]));
    const divisor = valoresPonderados.length;
    const suma = valoresPonderados.reduce((a, b) => a + b, 0);
    const promedio = suma / divisor;

    const distribucion = [1, 2, 3, 4, 5].map((nota) => ({
      nota,
      cantidad: valoresPonderados.filter((v) => v === nota).length,
    }));

    return { materiasCount, materiasNota1, divisor, suma, promedio, distribucion };
  }, [notas]);

  const promedioColor = stats
    ? stats.promedio >= 4
      ? "#34d399"
      : stats.promedio >= 3
        ? "#3b82f6"
        : stats.promedio >= 2
          ? "#a78bfa"
          : "#f87171"
    : "#8b97c2";

  const semestresFiltrados = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return semestres;
    return semestres
      .map((s) => ({
        sem: s.sem,
        items: s.items
          .filter((m) => normalizeSearch(m.materia).includes(q))
          .sort(
            (a, b) =>
              searchRank(a.materia, q) - searchRank(b.materia, q) ||
              a.materia.localeCompare(b.materia, "es"),
          ),
      }))
      .filter((s) => s.items.length > 0);
  }, [semestres, query]);

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="max-w-3xl">
              <PageBreadcrumb current="Promedio General" />
              <PageEyebrow icon={BarChart2}>Progreso académico</PageEyebrow>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                Promedio <span className="text-gradient">General</span>
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Marcá las materias que ya aprobaste y elegí la nota — el listado sale directo del
                plan de materias, sin tener que escribir nada.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-6 lg:grid-cols-5">
              {/* ══ STATS (sticky) ══ */}
              <div className="order-2 space-y-4 lg:order-1 lg:col-span-2">
                <Reveal>
                  <div className="sticky top-[84px] space-y-4">
                    <div className="card-hover rounded-2xl border border-border bg-card p-6">
                      {stats ? (
                        <>
                          <div className="mb-5 grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-3xl font-black text-foreground">
                                {stats.materiasCount}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">Materias</p>
                            </div>
                            <div className="text-center">
                              <p className="text-3xl font-black text-foreground">{stats.suma}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">Suma total</p>
                            </div>
                            <div className="text-center">
                              <p
                                className="text-3xl font-black tabular-nums"
                                style={{ color: promedioColor }}
                              >
                                {stats.promedio.toFixed(2)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">Promedio</p>
                            </div>
                          </div>

                          <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-foreground/10">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${(stats.promedio / 5) * 100}%`,
                                background: promedioColor,
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-5 gap-1.5">
                            {stats.distribucion.map(({ nota, cantidad }) => (
                              <div key={nota} className="text-center">
                                <div className="relative mb-1 flex h-14 items-end justify-center">
                                  <div
                                    className="w-full rounded-t-md transition-all duration-500"
                                    style={{
                                      height: stats.divisor
                                        ? `${Math.max(4, (cantidad / stats.divisor) * 56)}px`
                                        : "4px",
                                      background: `${NOTA_COLOR[nota]}80`,
                                      border: `1px solid ${NOTA_COLOR[nota]}60`,
                                    }}
                                  />
                                </div>
                                <p
                                  className="text-xs font-bold"
                                  style={{ color: NOTA_COLOR[nota] }}
                                >
                                  {nota}
                                </p>
                                <p className="text-[10px] text-muted-foreground">{cantidad}</p>
                              </div>
                            ))}
                          </div>

                          {stats.materiasNota1 > 0 && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-3 text-xs text-muted-foreground">
                              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                              <span>
                                <strong className="text-foreground">
                                  Regla del reglamento aplicada:
                                </strong>{" "}
                                {stats.materiasNota1 === 1
                                  ? "1 materia con nota 1 se cuenta"
                                  : `${stats.materiasNota1} materias con nota 1 se cuentan`}{" "}
                                dos veces en el promedio (se recursa y vuelve a computarse al
                                aprobarla). Por eso el promedio usa {stats.divisor} valores en vez
                                de {stats.materiasCount}.
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-6 text-center text-muted-foreground">
                          <BarChart2 className="mx-auto mb-3 h-10 w-10 opacity-20" />
                          <p className="text-sm font-medium text-foreground">
                            Todavía no marcaste materias
                          </p>
                          <p className="mt-1 text-xs">
                            Elegí materias de la lista para ver tu promedio acá.
                          </p>
                        </div>
                      )}
                    </div>
                    {stats && (
                      <button
                        onClick={limpiarTodo}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Desmarcar todas
                      </button>
                    )}
                  </div>
                </Reveal>
              </div>

              {/* ══ LISTA POR SEMESTRE ══ */}
              <div className="order-1 space-y-5 lg:order-2 lg:col-span-3">
                <Reveal>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar materia…"
                      className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </Reveal>

                <Accordion
                  type="multiple"
                  value={query.trim() ? semestresFiltrados.map((s) => s.sem) : openSemestres}
                  onValueChange={query.trim() ? undefined : setOpenSemestres}
                  className="space-y-3"
                >
                  {semestresFiltrados.map(({ sem, items }) => {
                    const aprobadasEnSemestre = items.filter(({ id }) => id in notas).length;
                    return (
                      <Reveal key={sem}>
                        <AccordionItem
                          value={sem}
                          className="rounded-2xl border border-border bg-card px-4 border-b-0"
                        >
                          <AccordionTrigger className="py-3.5 hover:no-underline">
                            <span className="flex items-center gap-2.5">
                              <span className="text-sm font-semibold text-foreground">
                                {sem === "—" ? "Sin semestre asignado" : `${sem}° Semestre`}
                              </span>
                              <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                {items.length} materias
                              </span>
                              {aprobadasEnSemestre > 0 && (
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {aprobadasEnSemestre} aprobadas
                                </span>
                              )}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-1.5 pb-1">
                              {items.map(({ id, materia, plan }) => {
                                const aprobada = id in notas;
                                const nota = notas[id] ?? 3;
                                return (
                                  <div
                                    key={id}
                                    className={`rounded-xl border transition-colors ${aprobada ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                                  >
                                    <button
                                      onClick={() => toggle(id)}
                                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                                    >
                                      <span
                                        className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-md border transition-colors ${aprobada ? "border-primary bg-primary" : "border-border"}`}
                                      >
                                        {aprobada && (
                                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                        )}
                                      </span>
                                      <span className="flex-1 text-sm font-medium text-foreground">
                                        {materia}
                                        <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                          Plan {plan}
                                        </span>
                                      </span>
                                      {aprobada && (
                                        <span
                                          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                                          style={{
                                            background: `${NOTA_COLOR[nota]}20`,
                                            color: NOTA_COLOR[nota],
                                          }}
                                        >
                                          {nota} — {NOTA_LABEL[nota]}
                                          {nota === 1 ? " · cuenta doble" : ""}
                                        </span>
                                      )}
                                    </button>
                                    {aprobada && (
                                      <div className="flex gap-1.5 px-4 pb-3">
                                        {[1, 2, 3, 4, 5].map((v) => (
                                          <button
                                            key={v}
                                            onClick={() => setNota(id, v)}
                                            aria-label={`Nota ${v}`}
                                            className="h-8 flex-1 rounded-lg text-sm font-bold transition-all"
                                            style={
                                              nota === v
                                                ? {
                                                    background: `${NOTA_COLOR[v]}25`,
                                                    color: NOTA_COLOR[v],
                                                    border: `2px solid ${NOTA_COLOR[v]}`,
                                                  }
                                                : {
                                                    background: "var(--muted)",
                                                    color: "var(--muted-foreground)",
                                                    border: "2px solid transparent",
                                                  }
                                            }
                                          >
                                            {v}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Reveal>
                    );
                  })}
                  {semestresFiltrados.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No se encontraron materias.
                    </p>
                  )}
                </Accordion>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
