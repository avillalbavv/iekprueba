/**
 * /asistencia — Calculadora Inteligente de Asistencia
 *
 * Basada en el Reglamento Académico FP-UNA, Resolución 25/15/68-00.
 * Usa el piso reglamentario del 70 % y controla por separado las prácticas
 * obligatorias (100 %, recuperable hasta 30 % por etapa).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  ChevronRight,
  Plus,
  X,
  Trash2,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  TrendingUp,
  FlaskConical,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import {
  DIAS_SEMANA,
  type DiaSemana,
  type Materia,
  type EstadoClase,
  type Semaforo,
  ESTADO_META,
  FERIADOS,
  SEMESTRE_INICIO,
  SEMESTRE_FIN,
  UMBRAL_PRIMERA_CONVOCATORIA,
  nuevaMateria,
  calcularStats,
  simular,
  cargarMaterias,
  guardarMaterias,
} from "@/lib/asistencia";
import { DATA, esSeccionSoloExamen, groupByMateria } from "@/lib/poliplanner";
import { normalizeSearch, searchRank } from "@/lib/search";

export const Route = createFileRoute("/asistencia")({ component: AsistenciaPage });

const SEMAFORO_META: Record<Semaforo, { label: string; color: string; Icon: typeof CheckCircle2 }> =
  {
    verde: { label: "Seguro", color: "#34d399", Icon: CheckCircle2 },
    amarillo: { label: "En riesgo", color: "#fbbf24", Icon: AlertTriangle },
    rojo: { label: "Sin derecho a rendir", color: "#f87171", Icon: XCircle },
  };

function fmtFecha(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-PY", { weekday: "short", day: "2-digit", month: "short" });
}

/* ═══════════════════════════════ Página principal ═══════════════════════════════ */

function AsistenciaPage() {
  const [hydrated, setHydrated] = useState(false);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setMaterias(cargarMaterias());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    guardarMaterias(materias);
  }, [materias, hydrated]);

  function agregarMateria(data: Parameters<typeof nuevaMateria>[0]) {
    const m = nuevaMateria(data);
    setMaterias((prev) => [...prev, m]);
    setShowForm(false);
    setSelectedId(m.id);
  }

  function eliminarMateria(id: string) {
    if (!confirm("¿Eliminar esta materia y todas sus asistencias marcadas?")) return;
    setMaterias((prev) => prev.filter((m) => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function marcarClase(materiaId: string, fecha: string, estado: EstadoClase | null) {
    setMaterias((prev) =>
      prev.map((m) => {
        if (m.id !== materiaId) return m;
        const asistencias = { ...m.asistencias };
        if (estado === null) delete asistencias[fecha];
        else asistencias[fecha] = estado;
        return { ...m, asistencias };
      }),
    );
  }

  function actualizarLab(
    materiaId: string,
    patch: Partial<{ total: number; asistidas: number; recuperadas: number }>,
  ) {
    setMaterias((prev) =>
      prev.map((m) => {
        if (m.id !== materiaId || !m.practicasLab) return m;
        return { ...m, practicasLab: { ...m.practicasLab, ...patch } };
      }),
    );
  }

  const selected = materias.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Link to="/" className="transition-colors hover:text-foreground">
                  Inicio
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">Calculadora de Asistencia</span>
              </div>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                Calculadora de <span className="text-gradient">Asistencia</span>
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Cargá tus materias y marcá tus clases — el sistema calcula automáticamente si tenés
                derecho a rendir el examen final, según el Reglamento Académico 2026.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                Período: {new Date(SEMESTRE_INICIO + "T00:00:00").toLocaleDateString("es-PY")} al{" "}
                {new Date(SEMESTRE_FIN + "T00:00:00").toLocaleDateString("es-PY")} · Se excluyen
                automáticamente {FERIADOS.length} feriados.{" "}
                <Link to="/reglamento-2026" className="text-primary hover:underline">
                  Ver qué cambió
                </Link>
              </p>
            </Reveal>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            {selected ? (
              <MateriaDetalle
                materia={selected}
                onVolver={() => setSelectedId(null)}
                onEliminar={() => eliminarMateria(selected.id)}
                onMarcar={(fecha, estado) => marcarClase(selected.id, fecha, estado)}
                onLab={(patch) => actualizarLab(selected.id, patch)}
              />
            ) : (
              <>
                <Reveal>
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-foreground">Tus materias</h2>
                    <button
                      onClick={() => setShowForm(true)}
                      className="btn-premium inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                      <Plus className="h-4 w-4" /> Nueva materia
                    </button>
                  </div>
                </Reveal>

                {materias.length === 0 ? (
                  <Reveal>
                    <div className="rounded-3xl border border-dashed border-border px-6 py-20 text-center">
                      <CalendarCheck2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                      <p className="text-base font-medium text-foreground">
                        Todavía no cargaste ninguna materia
                      </p>
                      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                        Agregá tus materias con sus días de clase y el sistema arma automáticamente
                        el calendario de asistencia del semestre.
                      </p>
                    </div>
                  </Reveal>
                ) : (
                  <Reveal variant="stagger" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {materias.map((m) => (
                      <MateriaCard key={m.id} materia={m} onClick={() => setSelectedId(m.id)} />
                    ))}
                  </Reveal>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />

      {showForm && <MateriaFormModal onClose={() => setShowForm(false)} onSave={agregarMateria} />}
    </div>
  );
}

/* ═══════════════════════════════ Tarjeta del dashboard ═══════════════════════════════ */

function MateriaCard({ materia, onClick }: { materia: Materia; onClick: () => void }) {
  const stats = useMemo(() => calcularStats(materia), [materia]);
  const hasRecords = stats.presentes + stats.faltasConsumidas > 0;
  const meta = hasRecords
    ? SEMAFORO_META[stats.estado]
    : { label: "Sin registros", color: "#94a3b8", Icon: CalendarCheck2 };

  return (
    <button
      onClick={onClick}
      className="card-hover w-full rounded-2xl border border-border bg-card p-5 text-left"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display font-semibold text-foreground">{materia.nombre}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{materia.dias.join(", ")}</p>
        </div>
        <span
          className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: `${meta.color}20`, color: meta.color }}
        >
          <meta.Icon className="h-3 w-3" /> {meta.label}
        </span>
      </div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, stats.porcentajeActual)}%`, background: meta.color }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{stats.porcentajeActual.toFixed(0)}% asistencia</span>
        <span>
          {!hasRecords
            ? "Marcá tu primera clase"
            : stats.derecho === "primera"
              ? "Con derecho a final"
              : "Sin derecho a final"}
        </span>
      </div>
      {materia.practicasLab && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <FlaskConical className="h-3 w-3" />
          Laboratorio: {materia.practicasLab.asistidas + materia.practicasLab.recuperadas}/
          {materia.practicasLab.total}
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════ Formulario nueva materia ═══════════════════════════════ */

function MateriaFormModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Parameters<typeof nuevaMateria>[0]) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [materiaId, setMateriaId] = useState<string | undefined>();
  const [carrera, setCarrera] = useState("");
  const [docente, setDocente] = useState("");
  const [dias, setDias] = useState<DiaSemana[]>([]);
  const [tieneLab, setTieneLab] = useState(false);
  const [totalLab, setTotalLab] = useState("");
  const sugerencias = useMemo(() => {
    const q = normalizeSearch(nombre);
    if (!q) return [];
    return groupByMateria(DATA.filter((section) => !esSeccionSoloExamen(section)))
      .filter((m) => normalizeSearch(m.materia).includes(q))
      .sort(
        (a, b) =>
          searchRank(a.materia, q) - searchRank(b.materia, q) ||
          a.materia.localeCompare(b.materia, "es"),
      )
      .slice(0, 6);
  }, [nombre]);

  function toggleDia(d: DiaSemana) {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function submit() {
    if (!nombre.trim() || dias.length === 0) return;
    const total = tieneLab ? Math.max(0, parseInt(totalLab, 10) || 0) : 0;
    onSave({
      materiaId,
      nombre: nombre.trim(),
      carrera: carrera.trim() || "IEK",
      docente: docente.trim(),
      dias,
      practicasLab: tieneLab && total > 0 ? { total, asistidas: 0, recuperadas: 0 } : null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-3 py-5 sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground">Nueva materia</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Nombre de la materia *
            </label>
            <input
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setMateriaId(undefined);
              }}
              placeholder="Ej: Cálculo II"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
            />
            {sugerencias.length > 0 && !materiaId && (
              <div className="mt-2 overflow-hidden rounded-xl border border-border bg-background">
                {sugerencias.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setNombre(m.materia);
                      setMateriaId(m.id);
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-xs last:border-b-0 hover:bg-foreground/5"
                  >
                    <span className="font-medium text-foreground">{m.materia}</span>
                    <span className="flex-shrink-0 text-muted-foreground">
                      Plan {m.plan} · Sem. {m.semestre}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Carrera (opcional)
              </label>
              <input
                value={carrera}
                onChange={(e) => setCarrera(e.target.value)}
                placeholder="IEK"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Docente (opcional)
              </label>
              <input
                value={docente}
                onChange={(e) => setDocente(e.target.value)}
                placeholder="Prof. …"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Días de clase *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDia(d)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    dias.includes(d)
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={tieneLab}
                onChange={(e) => setTieneLab(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Esta materia tiene prácticas de laboratorio obligatorias
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              El reglamento exige 100% de asistencia a prácticas, con recuperación de hasta el 30%
              por etapa (Art. 11°). Se hace seguimiento aparte de la asistencia a clases.
            </p>
            {tieneLab && (
              <div className="mt-2">
                <label className="mb-1 block text-[11px] text-muted-foreground">
                  Total de prácticas en el semestre
                </label>
                <input
                  type="number"
                  min={1}
                  value={totalLab}
                  onChange={(e) => setTotalLab(e.target.value)}
                  placeholder="Ej: 8"
                  className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/60"
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-[11px] text-muted-foreground">
            Esta herramienta usa el piso reglamentario del 70%. Si el Planeamiento de tu asignatura
            exige un porcentaje mayor, prevalece ese documento.
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!nombre.trim() || dias.length === 0}
          className="btn-premium mt-6 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Crear materia
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Vista detalle de una materia ═══════════════════════════════ */

function MateriaDetalle({
  materia,
  onVolver,
  onEliminar,
  onMarcar,
  onLab,
}: {
  materia: Materia;
  onVolver: () => void;
  onEliminar: () => void;
  onMarcar: (fecha: string, estado: EstadoClase | null) => void;
  onLab: (patch: Partial<{ total: number; asistidas: number; recuperadas: number }>) => void;
}) {
  const stats = useMemo(() => calcularStats(materia), [materia]);
  const sim = useMemo(() => simular(materia, stats), [materia, stats]);
  const hasRecords = stats.presentes + stats.faltasConsumidas > 0;
  const meta = hasRecords
    ? SEMAFORO_META[stats.estado]
    : { label: "Sin registros", color: "#94a3b8", Icon: CalendarCheck2 };

  const alertas = useMemo(() => {
    const out: { tipo: "warn" | "danger"; texto: string }[] = [];
    if (!hasRecords) return out;
    if (stats.derecho === "ninguna")
      out.push({
        tipo: "danger",
        texto:
          "Tu asistencia bajó del piso reglamentario del 70%: no cumplís el requisito de asistencia para la evaluación final.",
      });
    else if (stats.faltasRestantesPrimera === 1)
      out.push({
        tipo: "warn",
        texto: "Te queda 1 sola ausencia más antes de bajar del piso reglamentario.",
      });
    else if (stats.faltasRestantesPrimera === 0)
      out.push({
        tipo: "warn",
        texto: "No te quedan faltas disponibles para mantener el piso reglamentario.",
      });

    if (
      sim.clasesConsecutivasParaRecuperar70 !== null &&
      sim.clasesConsecutivasParaRecuperar70 > 0
    ) {
      out.push({
        tipo: "warn",
        texto: `Debés asistir a las próximas ${sim.clasesConsecutivasParaRecuperar70} clases consecutivas para volver al 70% requerido.`,
      });
    }
    if (stats.labStats && !stats.labStats.habilitado) {
      out.push({
        tipo: "danger",
        texto: `Prácticas de laboratorio: te faltan ${stats.labStats.requeridas - stats.labStats.cubiertas} de ${stats.labStats.requeridas}. Se exige 100% (recuperable hasta 30% por etapa).`,
      });
    }
    return out;
  }, [stats, sim, hasRecords]);

  return (
    <div>
      <Reveal>
        <button
          onClick={onVolver}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a mis materias
        </button>
      </Reveal>

      <Reveal>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">{materia.nombre}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {materia.dias.join(", ")}
              {materia.docente && <> · {materia.docente}</>}
              {materia.carrera && <> · {materia.carrera}</>}
            </p>
          </div>
          <button
            onClick={onEliminar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar materia
          </button>
        </div>
      </Reveal>

      {alertas.length > 0 && (
        <Reveal>
          <div className="mb-6 space-y-2">
            {alertas.map((a, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                  a.tipo === "danger"
                    ? "border-red-400/30 bg-red-400/5 text-red-500"
                    : "border-amber-400/30 bg-amber-400/5 text-amber-500"
                }`}
              >
                {a.tipo === "danger" ? (
                  <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                )}
                {a.texto}
              </div>
            ))}
          </div>
        </Reveal>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Estado actual</p>
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: `${meta.color}20`, color: meta.color }}
                >
                  <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
                </span>
              </div>

              <p className="text-4xl font-black tabular-nums" style={{ color: meta.color }}>
                {stats.porcentajeActual.toFixed(0)}%
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                {hasRecords
                  ? "Asistencia calculada sobre las clases marcadas"
                  : "Comienza en 0 % y se actualiza cuando marques una clase"}
              </p>

              <BarraProgreso
                label={`Piso reglamentario (${UMBRAL_PRIMERA_CONVOCATORIA}%)`}
                pct={Math.min(100, (stats.porcentajeActual / UMBRAL_PRIMERA_CONVOCATORIA) * 100)}
                color={
                  !hasRecords ? "#94a3b8" : stats.derecho === "primera" ? "#34d399" : "#f87171"
                }
              />

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {Math.max(0, stats.faltasRestantesPrimera)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Faltas disponibles al 70%</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {stats.presentes + stats.faltasConsumidas}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Clases marcadas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {stats.clasesPendientesDeMarcar}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Clases sin marcar</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{stats.clasesFuturas}</p>
                  <p className="text-[11px] text-muted-foreground">Clases pendientes</p>
                </div>
              </div>
            </div>
          </Reveal>

          {materia.practicasLab && stats.labStats && (
            <Reveal>
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                <div className="mb-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Prácticas de laboratorio</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Requiere {LAB_100_LABEL} de asistencia, recuperable hasta 30% por etapa (Art.
                  11°).
                </p>
                <div className="mb-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
                  <LabInput
                    label="Total"
                    value={materia.practicasLab.total}
                    onChange={(v) => onLab({ total: v })}
                  />
                  <LabInput
                    label="Asistidas"
                    value={materia.practicasLab.asistidas}
                    onChange={(v) => onLab({ asistidas: v })}
                  />
                  <LabInput
                    label="Recuperadas"
                    value={materia.practicasLab.recuperadas}
                    onChange={(v) => onLab({ recuperadas: v })}
                  />
                </div>
                <BarraProgreso
                  label="Cobertura"
                  pct={
                    stats.labStats.requeridas > 0
                      ? (stats.labStats.cubiertas / stats.labStats.requeridas) * 100
                      : 100
                  }
                  color={stats.labStats.habilitado ? "#34d399" : "#f87171"}
                />
                {stats.labStats.recuperacionExcedida && (
                  <p className="mt-1 text-[11px] text-amber-500">
                    Superaste el máximo recuperable ({stats.labStats.recuperacionMaxima} de{" "}
                    {stats.labStats.requeridas}); el excedente no cuenta.
                  </p>
                )}
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Simulador</p>
              </div>
              <div className="space-y-3 text-xs">
                {sim.siFaltoHoy && (
                  <SimRow
                    pregunta="¿Qué pasa si falto hoy?"
                    respuesta={
                      sim.siFaltoHoy.perderiaTodoDerecho
                        ? "Perderías todo derecho a rendir el final."
                        : `Te quedarían ${Math.max(0, sim.siFaltoHoy.faltasRestantesPrimera)} falta(s) antes de bajar del piso reglamentario.`
                    }
                    negativo={sim.siFaltoHoy.perderiaTodoDerecho || sim.siFaltoHoy.caeASegunda}
                  />
                )}
                <SimRow
                  pregunta="¿Cuántas veces más puedo faltar sin bajar del 70%?"
                  respuesta={`${sim.vecesQuePuedeFaltarManteniendoPrimera} vez${sim.vecesQuePuedeFaltarManteniendoPrimera === 1 ? "" : "es"} más.`}
                />
                {sim.clasesConsecutivasParaRecuperar70 !== null && (
                  <SimRow
                    pregunta="¿Cuántas clases consecutivas para volver al 70%?"
                    respuesta={
                      sim.clasesConsecutivasParaRecuperar70 === 0
                        ? "Ya cumplís el 70%."
                        : `${sim.clasesConsecutivasParaRecuperar70} clases seguidas.`
                    }
                  />
                )}
                <SimRow
                  pregunta="Si mantengo mi ritmo actual, ¿termino con derecho a rendir?"
                  respuesta={
                    sim.proyeccion.terminariaConPrimeraConvocatoria
                      ? `Sí, mantendrías el piso reglamentario — proyectás ${sim.proyeccion.faltasProyectadas} falta(s) más.`
                      : sim.proyeccion.terminariaConDerecho
                        ? `Sí — proyectás ${sim.proyeccion.faltasProyectadas} falta(s) más.`
                        : `No — proyectás ${sim.proyeccion.faltasProyectadas} falta(s) más, quedando sin derecho.`
                  }
                  negativo={!sim.proyeccion.terminariaConDerecho}
                />
              </div>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-3">
          <Reveal>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Registro de clases ({stats.totalClases})
              </h3>
            </div>
            <div className="max-h-[600px] space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-card p-2 sm:p-3">
              {stats.fechas.map((fecha) => (
                <ClaseRow
                  key={fecha}
                  fecha={fecha}
                  estado={materia.asistencias[fecha]}
                  onMarcar={(estado) => onMarcar(fecha, estado)}
                />
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

const LAB_100_LABEL = "100%";

function LabInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-muted-foreground">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-center text-sm font-bold text-foreground focus:outline-none focus:border-primary/60"
      />
    </div>
  );
}

function SimRow({
  pregunta,
  respuesta,
  negativo,
}: {
  pregunta: string;
  respuesta: string;
  negativo?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3.5 py-2.5">
      <p className="text-muted-foreground">{pregunta}</p>
      <p className={`mt-0.5 font-medium ${negativo ? "text-red-500" : "text-foreground"}`}>
        → {respuesta}
      </p>
    </div>
  );
}

function BarraProgreso({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
        />
      </div>
    </div>
  );
}

function ClaseRow({
  fecha,
  estado,
  onMarcar,
}: {
  fecha: string;
  estado: EstadoClase | undefined;
  onMarcar: (estado: EstadoClase | null) => void;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const esPasada = fecha <= hoy;
  const esHoy = fecha === hoy;

  return (
    <div
      className={`flex flex-wrap items-start gap-2 rounded-xl border px-2.5 py-2 text-xs sm:items-center sm:px-3 ${
        esHoy
          ? "border-primary/40 bg-primary/5"
          : !estado && esPasada
            ? "border-amber-400/30 bg-amber-400/5"
            : "border-border bg-background"
      }`}
    >
      <span className="shrink-0 capitalize text-foreground sm:w-24">{fmtFecha(fecha)}</span>
      {esHoy && (
        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          Hoy
        </span>
      )}
      {!estado && esPasada && !esHoy && (
        <span className="text-[10px] font-medium text-amber-500">Sin marcar</span>
      )}
      <div className="grid w-full grid-cols-5 gap-1 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap">
        {(Object.keys(ESTADO_META) as EstadoClase[]).map((key) => {
          const m = ESTADO_META[key];
          const activo = estado === key;
          return (
            <button
              key={key}
              onClick={() => onMarcar(activo ? null : key)}
              title={m.label}
              className="rounded-full px-2 py-1 text-[10px] font-semibold transition-all"
              style={
                activo
                  ? { background: m.color, color: "#fff" }
                  : { background: "var(--muted)", color: "var(--muted-foreground)" }
              }
            >
              {m.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}
