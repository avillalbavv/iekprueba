import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpenCheck, CalendarPlus, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { PageBreadcrumb, PageEyebrow } from "@/components/PageHeading";
import { DATA } from "@/lib/poliplanner";
import {
  generateStudyPlan,
  loadStudyPlans,
  planProgress,
  reprogramOverdue,
  saveStudyPlans,
  type StudyPlan,
} from "@/lib/study-planner";
export const Route = createFileRoute("/plan-de-estudio")({ component: StudyPlannerPage });
function StudyPlannerPage() {
  const subjects = useMemo(
    () =>
      [
        ...new Map(DATA.map((s) => [s.materiaId, { id: s.materiaId, name: s.materia }])).values(),
      ].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [],
  );
  const [plans, setPlans] = useState<StudyPlan[]>(() => loadStudyPlans());
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [topics, setTopics] = useState("");
  const [error, setError] = useState("");
  function persist(next: StudyPlan[]) {
    setPlans(next);
    saveStudyPlans(next);
  }
  function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const match = subjects.find((s) => s.id === subject);
      const plan = generateStudyPlan({
        subjectId: subject,
        subjectName: match?.name || subject,
        deadline,
        topics: topics.split(/[,\n]/),
        hoursPerDay: 1.5,
        availableDays: [1, 2, 3, 4, 5, 6],
        sessionMinutes: 60,
        priority: "medium",
      });
      persist([plan, ...plans]);
      setTopics("");
      setError("");
    } catch (x) {
      setError(x instanceof Error ? x.message : "No se pudo crear el plan");
    }
  }
  function update(plan: StudyPlan) {
    persist(plans.map((p) => (p.id === plan.id ? plan : p)));
  }
  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main className="relative mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
        <div className="relative max-w-3xl">
          <PageBreadcrumb current="Planificador de estudio" />
          <PageEyebrow icon={BookOpenCheck}>Organización personal</PageEyebrow>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Planificador de <span className="text-gradient">Estudio</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Distribuí temas y sesiones de forma realista hasta la fecha de tu examen.
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <form onSubmit={create} className="glass h-fit rounded-2xl p-5">
            <h2 className="font-semibold">Crear plan automático</h2>
            <label className="mt-4 block text-sm">
              Materia
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-input bg-background p-3"
              >
                <option value="">Seleccioná…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm">
              Fecha del examen
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-input bg-background p-3"
              />
            </label>
            <label className="mt-4 block text-sm">
              Temas, separados por coma
              <textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                required
                rows={5}
                className="mt-1 w-full rounded-xl border border-input bg-background p-3"
                placeholder="Transistores, polarización, amplificadores"
              />
            </label>
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 font-medium text-primary-foreground">
              <CalendarPlus className="h-4 w-4" />
              Generar sesiones
            </button>
          </form>
          <div className="space-y-5">
            {!plans.length && (
              <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
                Todavía no creaste un plan de estudio.
              </div>
            )}
            {plans.map((plan) => {
              const progress = planProgress(plan);
              return (
                <article key={plan.id} className="glass rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{plan.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        Fecha límite: {new Date(plan.deadline).toLocaleString("es-PY")}
                      </p>
                    </div>
                    <button
                      onClick={() => update(reprogramOverdue(plan))}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reprogramar atrasadas
                    </button>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {progress.percentage}% · {progress.doneMinutes} min realizados ·{" "}
                    {progress.pendingMinutes} min pendientes
                  </p>
                  <div className="mt-4 space-y-2">
                    {plan.sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 rounded-xl border border-border p-3"
                      >
                        <button
                          aria-label="Marcar sesión completada"
                          onClick={() =>
                            update({
                              ...plan,
                              sessions: plan.sessions.map((s) =>
                                s.id === session.id
                                  ? { ...s, status: "completed", progress: 100 }
                                  : s,
                              ),
                            })
                          }
                          className={
                            session.progress === 100 ? "text-emerald-400" : "text-muted-foreground"
                          }
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={session.progress === 100 ? "line-through opacity-60" : ""}>
                            {session.topic}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock3 className="mr-1 inline h-3 w-3" />
                            {new Date(session.startsAt).toLocaleString("es-PY")} ·{" "}
                            {session.durationMinutes} min
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
