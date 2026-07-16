import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";
import { PageBreadcrumb, PageEyebrow } from "@/components/PageHeading";
import { buildAcademicRadar, type RadarItem } from "@/lib/academic-radar";
import { syncRadarNotifications } from "@/lib/notification-service";
export const Route = createFileRoute("/radar-academico")({ component: RadarPage });
const meta = {
  risk: { label: "Riesgo", Icon: ShieldAlert },
  opportunity: { label: "Oportunidad", Icon: Lightbulb },
  action: { label: "Próxima acción", Icon: CheckCircle2 },
  notice: { label: "Aviso", Icon: Bell },
  event: { label: "Evento", Icon: CalendarClock },
};
const priority = {
  low: "Informativo",
  medium: "Atención",
  high: "Importante",
  critical: "Urgente",
};
function Card({ item }: { item: RadarItem }) {
  const { Icon, label } = meta[item.type];
  return (
    <article
      className={`glass card-hover rounded-2xl p-5 border-l-4 ${item.priority === "critical" ? "border-l-red-400" : item.priority === "high" ? "border-l-amber-400" : "border-l-primary"}`}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>{label}</span>
            <span aria-label={`Prioridad ${priority[item.priority]}`}>
              · {priority[item.priority]}
            </span>
          </div>
          <h3 className="mt-1 font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground/70">Fuente: {item.source}</span>
            {item.actionUrl && (
              <Link
                to={item.actionUrl}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                Abrir <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
function RadarPage() {
  const snapshot = useMemo(() => buildAcademicRadar(), []);
  useEffect(() => {
    syncRadarNotifications(snapshot.items);
  }, [snapshot.items]);
  const groups = [
    {
      key: "now",
      title: "Ahora",
      items: snapshot.items
        .filter((i) => i === snapshot.nextClass || i === snapshot.nextExam)
        .slice(0, 3),
    },
    { key: "risks", title: "Riesgos", items: snapshot.items.filter((i) => i.type === "risk") },
    {
      key: "actions",
      title: "Próximas acciones",
      items: snapshot.items.filter((i) => i.type === "action"),
    },
    {
      key: "week",
      title: "Esta semana",
      items: snapshot.items.filter((i) => i.type === "event" || i.type === "notice").slice(0, 8),
    },
  ];
  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main className="relative mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        <Reveal className="relative">
          <PageBreadcrumb current="Mi Semestre" />
          <PageEyebrow icon={CalendarClock}>Resumen académico personalizado</PageEyebrow>
          <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-6xl lg:text-7xl">
            Mi <span className="text-gradient">Semestre</span>
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-xl">
            Todo lo importante de tu cursada en un solo lugar: próximas clases, exámenes, riesgos,
            trámites y acciones recomendadas según tus datos reales.
          </p>
        </Reveal>
        {!snapshot.selectedSections.length && (
          <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            Configurá tu horario para obtener una vista completa y personalizada.
          </div>
        )}
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-4 text-xl font-semibold">{g.title}</h2>
              <div className="space-y-3">
                {g.items.length ? (
                  g.items.map((i) => <Card key={i.id} item={i} />)
                ) : (
                  <div className="glass rounded-2xl p-5 text-sm text-muted-foreground">
                    No hay información confirmada para esta sección.
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
