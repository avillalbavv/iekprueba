import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, CircleAlert, ExternalLink, Search } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { PageBreadcrumb, PageEyebrow } from "@/components/PageHeading";
import { BICHOS, CATEGORIA_LABEL, CATEGORIA_COLOR, type BichoCategoria } from "@/data/bichos";

export const Route = createFileRoute("/manual-de-bichos")({ component: ManualBichosPage });

const CATEGORIAS = Object.keys(CATEGORIA_LABEL) as BichoCategoria[];

function ManualBichosPage() {
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<BichoCategoria | "todas">("todas");

  const resultados = useMemo(() => {
    const q = query.toLowerCase().trim();
    return BICHOS.filter((b) => {
      const texto = [b.titulo, b.resumen, b.detalle, b.importante, ...(b.pasos ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchQ = !q || texto.includes(q);
      const matchCat = categoria === "todas" || b.categoria === categoria;
      return matchQ && matchCat;
    });
  }, [query, categoria]);

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="max-w-3xl">
              <PageBreadcrumb current="Manual de Nuevos Ingresantes" />
              <PageEyebrow icon={BookOpenCheck}>Orientación para nuevos estudiantes</PageEyebrow>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                Manual de <span className="text-gradient">Nuevos Ingresantes</span>
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Información oficial de la FP-UNA explicada en lenguaje claro: inscripción,
                evaluación, trámites, servicios y reglas que necesitás conocer desde el primer día.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <BookOpenCheck className="h-4 w-4" /> {BICHOS.length} guías con fuentes oficiales
              </div>
            </Reveal>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-6">
            {/* ── BUSCADOR + FILTROS ── */}
            <Reveal>
              <div className="mb-8 space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar inscripción, asistencia, homologación…"
                    aria-label="Buscar en el Manual de Nuevos Ingresantes"
                    className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground transition focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategoria("todas")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      categoria === "todas"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Todas
                  </button>
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategoria(c)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        categoria === c
                          ? "text-white"
                          : "border border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                      style={categoria === c ? { background: CATEGORIA_COLOR[c] } : undefined}
                    >
                      {CATEGORIA_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* ── CONTENIDO ── */}
            {resultados.length > 0 ? (
              <div className="grid items-start gap-4 stagger is-visible sm:grid-cols-2">
                {resultados.map((b) => (
                  <article
                    key={b.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div className="p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            background: `${CATEGORIA_COLOR[b.categoria]}20`,
                            color: CATEGORIA_COLOR[b.categoria],
                          }}
                        >
                          {CATEGORIA_LABEL[b.categoria]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Verificado {b.verificadoEl}
                        </span>
                      </div>
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {b.titulo}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {b.resumen}
                      </p>
                    </div>
                    <details className="group border-t border-border">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        Ver guía completa
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-5 border-t border-border px-5 py-5 text-sm">
                        <p className="leading-relaxed text-muted-foreground">{b.detalle}</p>
                        {(b.pasos?.length ?? 0) > 0 && (
                          <div>
                            <h3 className="font-semibold text-foreground">Qué hacer</h3>
                            <ol className="mt-2 space-y-2">
                              {b.pasos?.map((paso, index) => (
                                <li key={paso} className="flex gap-3 text-muted-foreground">
                                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                    {index + 1}
                                  </span>
                                  <span className="leading-relaxed">{paso}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {b.importante && (
                          <div className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-100">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <p className="leading-relaxed">
                              <strong>Importante:</strong> {b.importante}
                            </p>
                          </div>
                        )}
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Fuentes oficiales
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {b.fuentes.map((fuente) => (
                              <a
                                key={fuente.url}
                                href={fuente.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
                              >
                                {fuente.titulo} <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <Reveal>
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-20 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      No encontramos esa información
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                      Probá con otro término o seleccioná una categoría diferente.
                    </p>
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
