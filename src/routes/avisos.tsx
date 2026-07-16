/**
 * /avisos — Avisos de la Delegación
 * Sin contenido por ahora (ver src/data/avisos.ts): muestra un estado
 * vacío elegante y ya tiene filtro por tipo listo para cuando se
 * carguen avisos reales.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Bell, Megaphone, CalendarDays, Sparkles } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { AVISOS, TIPO_CONFIG, type AvisoTipo, type Aviso } from "@/data/avisos";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/avisos")({ component: AvisosPage });

const TIPOS = Object.keys(TIPO_CONFIG) as AvisoTipo[];
const ORDEN_TIPOS: Record<AvisoTipo, number> = {
  alerta: 0,
  importante: 1,
  comunicado: 2,
  recordatorio: 3,
  noticia: 4,
};

function AvisoCard({ aviso }: { aviso: Aviso }) {
  const [expandido, setExpandido] = useState(false);
  const cfg = TIPO_CONFIG[aviso.tipo];
  return (
    <article className="card-hover rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
        >
          {cfg.label}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {new Date(aviso.fecha + "T12:00:00").toLocaleDateString("es-PY", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
      <h3 className="font-semibold leading-snug text-foreground">{aviso.titulo}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{aviso.resumen}</p>
      {aviso.detalle && (
        <>
          {expandido && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground/90 border-t border-border pt-2">
              {aviso.detalle}
            </p>
          )}
          <button
            onClick={() => setExpandido((v) => !v)}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            {expandido ? "Ver menos" : "Ver más"}
          </button>
        </>
      )}
    </article>
  );
}

function AvisosPage() {
  const [filtro, setFiltro] = useState<AvisoTipo | "todos">("todos");
  const [published, setPublished] = useState<Aviso[]>([]);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("admin_notices")
      .select("id,title,summary,content,category,priority,publish_at,created_at")
      .eq("status", "published")
      .then(({ data }) => {
        if (!data) return;
        setPublished(
          data.map((row) => ({
            id: row.id,
            tipo:
              row.priority === "urgente"
                ? "alerta"
                : row.priority === "importante"
                  ? "importante"
                  : ((["comunicado", "alerta", "noticia", "recordatorio", "importante"].includes(
                      row.category,
                    )
                      ? row.category
                      : "comunicado") as AvisoTipo),
            titulo: row.title,
            resumen: row.summary,
            detalle: row.content || undefined,
            fecha: (row.publish_at || new Date().toISOString()).slice(0, 10),
            publicadoEn: row.publish_at || row.created_at || undefined,
            destacado: row.priority === "urgente" || row.priority === "importante",
          })),
        );
      });
  }, []);

  const avisos = useMemo(() => {
    const ordenados = [
      ...new Map([...published, ...AVISOS].map((aviso) => [aviso.id, aviso])).values(),
    ].sort((a, b) => {
      const porTipo = ORDEN_TIPOS[a.tipo] - ORDEN_TIPOS[b.tipo];
      if (porTipo !== 0) return porTipo;
      const porPublicacion =
        new Date(b.publicadoEn || `${b.fecha}T12:00:00`).getTime() -
        new Date(a.publicadoEn || `${a.fecha}T12:00:00`).getTime();
      return porPublicacion || b.id.localeCompare(a.id);
    });
    return filtro === "todos" ? ordenados : ordenados.filter((a) => a.tipo === filtro);
  }, [filtro, published]);

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Link to="/" className="transition-colors hover:text-foreground">
                  Inicio
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">Avisos</span>
              </div>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                <span className="text-gradient">Avisos</span>
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Comunicados, alertas, noticias y recordatorios oficiales de la Delegación IEK.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-6">
            {avisos.length > 0 && (
              <Reveal>
                <div className="mb-8 flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltro("todos")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      filtro === "todos"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Todos
                  </button>
                  {TIPOS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setFiltro(t)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        filtro === t
                          ? "text-white"
                          : "border border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                      style={filtro === t ? { background: TIPO_CONFIG[t].color } : undefined}
                    >
                      {TIPO_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              </Reveal>
            )}

            {avisos.length > 0 ? (
              <div className="grid gap-4 stagger is-visible sm:grid-cols-2 lg:grid-cols-3">
                {avisos.map((aviso) => (
                  <AvisoCard key={aviso.id} aviso={aviso} />
                ))}
              </div>
            ) : (
              <Reveal>
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-20 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <Megaphone className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="flex items-center justify-center gap-1.5 text-base font-medium text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" /> Próximamente
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                      Próximamente se publicarán avisos oficiales de la delegación — comunicados,
                      alertas, noticias y recordatorios importantes.
                    </p>
                  </div>
                  <Bell className="h-4 w-4 text-muted-foreground/40" />
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
