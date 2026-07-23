/**
 * /poliplanner — Armador de Horarios v2
 *
 * Nuevo flujo: 1) carrera (única, informativo) → 2) énfasis → 3) malla
 * curricular COMPLETA (Ciencias Básicas + comunes + propias del énfasis,
 * Semestre 1 al 10) agrupada en acordeones → 4) para cada materia
 * elegida y ofertada este período, turno/docente/horario/aula →
 * 5) horario semanal estilo Google Calendar + calendario de exámenes
 * (agenda por tipo + vista mensual).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarRange,
  Search,
  Check,
  AlertTriangle,
  Printer,
  Download,
  Sparkles,
  LayoutGrid,
  List,
  CalendarClock,
  Trash2,
  GraduationCap,
  Info,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Lock,
  X,
  CalendarCheck2,
  Clock3,
  MapPin,
  type LucideIcon,
} from "lucide-react";
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
import {
  ENFASIS_OPTIONS,
  MALLA_LABEL,
  PLAN_POR_MALLA,
  mallaAgrupadaPorSemestre,
  type EnfasisId,
  type MallaAcademicaId,
  type MateriaMalla,
} from "@/lib/malla-curricular";
import {
  DIAS,
  type Dia,
  type Seccion,
  seccionesCursablesPorMateriaMalla,
  departamentosPorMateriaMalla,
  colorForMateria,
  parseHora,
  findScheduleConflicts,
  type ScheduleConflict,
  layoutDaySchedule,
  listExamenes,
  findExamConflicts,
  examenLabel,
  parseFechaExamen,
  loadSelection,
  saveSelection,
  docenteNombre,
  etiquetaSeleccion,
  nombreMateriaVisible,
  resumenHorario,
  TURNO_LABEL,
  TURNO_COLOR,
} from "@/lib/poliplanner";
import { importarMateriasDesdePoliPlanner, type DiaSemana } from "@/lib/asistencia";
import { writeLocalState } from "@/lib/user-state";
import { SemesterGeneratorPanel } from "@/components/SemesterGeneratorPanel";

export const Route = createFileRoute("/poliplanner")({ component: PoliPlannerPage });

/** Misma clave que usa /mapa — si ya elegiste énfasis ahí, se respeta acá. */
const STORAGE_KEY_ENFASIS = "iek-mapa-enfasis-seleccionado";

function plannerSignature(
  malla: MallaAcademicaId,
  enfasis: string | null,
  materiaIds: string[],
  sections: Record<string, string>,
): string {
  return JSON.stringify({
    malla,
    enfasis,
    materiaIds: [...materiaIds].sort(),
    sections: Object.entries(sections).sort(([a], [b]) => a.localeCompare(b)),
  });
}

const EXAM_GROUPS: {
  key: "parcial1" | "parcial2" | "final1" | "final2";
  label: string;
  sub?: "revision1" | "revision2";
}[] = [
  { key: "parcial1", label: "Primer Parcial" },
  { key: "parcial2", label: "Segundo Parcial" },
  { key: "final1", label: "Final", sub: "revision1" },
  { key: "final2", label: "Extraordinario", sub: "revision2" },
];

/* ═══════════════════════════════ Página principal ═══════════════════════════════ */

function PoliPlannerPage() {
  const [hydrated, setHydrated] = useState(false);
  const [mallaVersion, setMallaVersion] = useState<MallaAcademicaId>("plan-2008");
  const [enfasis, setEnfasis] = useState<EnfasisId | null>(null);
  const [materiaIds, setMateriaIds] = useState<string[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({}); // materiaId malla -> seccion.id
  const [openSemestres, setOpenSemestres] = useState<string[]>(["1"]);
  const [tab, setTab] = useState<"horario" | "examenes">("horario");
  const [view, setView] = useState<"semanal" | "lista">("semanal");
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [plannerMode, setPlannerMode] = useState<"manual" | "smart">("manual");
  const [confirmedSignature, setConfirmedSignature] = useState("");
  const [focusConfirmation, setFocusConfirmation] = useState(false);
  const confirmationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sel = loadSelection();
    setMallaVersion(sel.malla);
    const enfasisGuardado = (sel.enfasis ||
      window.localStorage.getItem(STORAGE_KEY_ENFASIS)) as EnfasisId | null;
    if (enfasisGuardado) setEnfasis(enfasisGuardado);
    if (sel.materiaIds.length) {
      setMateriaIds(sel.materiaIds);
      setChoice(sel.secciones);
      setOpenSemestres([]);
      setConfirmedSignature(
        plannerSignature(sel.malla, enfasisGuardado, sel.materiaIds, sel.secciones),
      );
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (enfasis) {
      try {
        writeLocalState(STORAGE_KEY_ENFASIS, enfasis);
      } catch {
        /* ignore */
      }
    }
  }, [enfasis, hydrated]);

  const schedulePlan = PLAN_POR_MALLA[mallaVersion];
  const malla = useMemo(
    () => (enfasis ? mallaAgrupadaPorSemestre(enfasis, mallaVersion) : []),
    [enfasis, mallaVersion],
  );
  const materiasDisponibles = useMemo(() => malla.flatMap((group) => group.materias), [malla]);
  const mallaById = useMemo(
    () => new Map(malla.flatMap((g) => g.materias).map((m) => [m.id, m])),
    [malla],
  );

  // Sanea selecciones antiguas o incompletas de localStorage. Evita que una
  // materia inexistente para el énfasis actual deje la vista en un estado
  // incoherente al alternar entre materias, calendario y exámenes.
  useEffect(() => {
    if (!hydrated || !enfasis) return;
    const validIds = new Set(mallaById.keys());
    const cleanIds = materiaIds.filter(
      (id, index) => validIds.has(id) && materiaIds.indexOf(id) === index,
    );
    const cleanChoice: Record<string, string> = {};
    for (const id of cleanIds) {
      const materia = mallaById.get(id);
      const selectedSection = choice[id];
      if (
        materia &&
        selectedSection &&
        seccionesCursablesPorMateriaMalla(materia.nombre, schedulePlan, enfasis).some(
          (s) => s.id === selectedSection,
        )
      ) {
        cleanChoice[id] = selectedSection;
      }
    }
    if (
      cleanIds.length !== materiaIds.length ||
      cleanIds.some((id, index) => id !== materiaIds[index])
    ) {
      setMateriaIds(cleanIds);
    }
    const currentEntries = Object.entries(choice).sort(([a], [b]) => a.localeCompare(b));
    const cleanEntries = Object.entries(cleanChoice).sort(([a], [b]) => a.localeCompare(b));
    if (JSON.stringify(currentEntries) !== JSON.stringify(cleanEntries)) setChoice(cleanChoice);
  }, [hydrated, enfasis, mallaById, materiaIds, choice, schedulePlan]);

  function elegirMalla(id: MallaAcademicaId) {
    if (id === mallaVersion) return;
    setMallaVersion(id);
    setMateriaIds([]);
    setChoice({});
    setOpenSemestres(["1"]);
    setConfirmedSignature("");
  }

  function elegirEnfasis(id: EnfasisId) {
    setEnfasis(id);
    setMateriaIds([]);
    setChoice({});
    setOpenSemestres(["1"]);
  }

  function toggleMateria(id: string) {
    if (materiaIds.includes(id)) {
      removeMateria(id);
      return;
    }
    const materia = mallaById.get(id);
    const options = materia
      ? seccionesCursablesPorMateriaMalla(materia.nombre, schedulePlan, enfasis)
      : [];
    setMateriaIds((current) => [...current, id]);
    if (options.length === 1) {
      setChoice((current) => ({ ...current, [id]: options[0].id }));
    }
  }

  function removeMateria(id: string) {
    setMateriaIds((prev) => prev.filter((x) => x !== id));
    setChoice((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });
  }

  function chooseSection(materiaId: string, seccionId: string) {
    setChoice((prev) => ({ ...prev, [materiaId]: seccionId }));
  }

  function limpiarTodo() {
    if (!confirm("¿Vaciar el horario y empezar de nuevo? Esta acción no se puede deshacer."))
      return;
    setMateriaIds([]);
    setChoice({});
    saveSelection({ malla: mallaVersion, enfasis, materiaIds: [], secciones: {} });
    setConfirmedSignature("");
  }

  function importarHorarioEnAsistencia(): string {
    const porMateria = new Map<
      string,
      {
        nombre: string;
        dias: Set<string>;
        fechasPorDia: Map<string, Set<string>>;
        docente?: string;
      }
    >();
    for (const s of chosenSecciones) {
      const entry = porMateria.get(s.materiaId) ?? {
        nombre: s.materia,
        dias: new Set<string>(),
        fechasPorDia: new Map<string, Set<string>>(),
      };
      s.clases.forEach((c) => {
        entry.dias.add(c.dia);
        if (c.fechas?.length) {
          const dates = entry.fechasPorDia.get(c.dia) ?? new Set<string>();
          c.fechas.forEach((date) => dates.add(date));
          entry.fechasPorDia.set(c.dia, dates);
        }
      });
      if (!entry.docente) entry.docente = docenteNombre(s.docente);
      porMateria.set(s.materiaId, entry);
    }
    const payload = [...porMateria.entries()]
      .filter(([, v]) => v.dias.size > 0)
      .map(([materiaId, v]) => ({
        materiaId,
        nombre: v.nombre,
        dias: [...v.dias] as DiaSemana[],
        fechasPorDia: Object.fromEntries(
          [...v.fechasPorDia].map(([day, dates]) => [day, [...dates].sort()]),
        ),
        docente: v.docente,
      }));

    if (payload.length === 0) {
      return "Ninguna materia elegida tiene días de clase para importar a Asistencia.";
    }
    const { agregadas, actualizadas } = importarMateriasDesdePoliPlanner(payload);
    const partes = [];
    if (agregadas > 0) partes.push(`${agregadas} nueva${agregadas === 1 ? "" : "s"}`);
    if (actualizadas > 0)
      partes.push(`${actualizadas} actualizada${actualizadas === 1 ? "" : "s"}`);
    return partes.length
      ? `Asistencia actualizada: ${partes.join(" · ")}.`
      : "Tus materias ya estaban al día en la Calculadora de Asistencia.";
  }

  function confirmarHorario() {
    if (!enfasis || !materiaIds.length || pendientes > 0 || conflicts.length > 0) return;
    const selection = { malla: mallaVersion, enfasis, materiaIds, secciones: choice };
    saveSelection(selection);
    setConfirmedSignature(plannerSignature(mallaVersion, enfasis, materiaIds, choice));
    setSyncMsg(
      `Horario confirmado. ${importarHorarioEnAsistencia()} También está disponible para ¿Dónde rindo?, el calendario y la sincronización.`,
    );
  }

  function enviarAAsistencia() {
    setSyncMsg(importarHorarioEnAsistencia());
  }

  const chosenSecciones: Seccion[] = useMemo(() => {
    return materiaIds
      .map((id) => {
        const m = mallaById.get(id);
        if (!m) return null;
        const ofertadas = seccionesCursablesPorMateriaMalla(m.nombre, schedulePlan, enfasis);
        return ofertadas.find((s) => s.id === choice[id]) ?? null;
      })
      .filter((s): s is Seccion => Boolean(s));
  }, [materiaIds, choice, mallaById, schedulePlan, enfasis]);

  const conflicts = useMemo(() => findScheduleConflicts(chosenSecciones), [chosenSecciones]);
  const examenes = useMemo(() => listExamenes(chosenSecciones), [chosenSecciones]);
  const examConflicts = useMemo(() => findExamConflicts(examenes), [examenes]);
  const pendientes = materiaIds.filter((id) => !choice[id]).length;
  const currentSignature = plannerSignature(mallaVersion, enfasis, materiaIds, choice);
  const horarioConfirmado = Boolean(confirmedSignature && confirmedSignature === currentSignature);

  useEffect(() => {
    if (!focusConfirmation || plannerMode !== "manual" || chosenSecciones.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      confirmationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFocusConfirmation(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusConfirmation, plannerMode, chosenSecciones.length]);

  return (
    <div className="min-h-screen">
      <SiteNavbar />

      <main className="relative mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
        {/* ── HERO ── */}
        <Reveal className="pp-no-print">
          <div className="mb-8">
            <PageBreadcrumb current="Planificador IEK" />
            <PageEyebrow icon={CalendarRange}>Organización académica</PageEyebrow>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Planificador <span className="text-gradient">IEK</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Elegí tu malla y énfasis, marcá las materias que vas a cursar y armá tu horario
              semanal automáticamente — con detección de choques, laboratorios y exámenes.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/75">
              Segundo Periodo 2026 · clases y exámenes actualizados al 22/07/2026 · laboratorios al
              21/07/2026.
            </p>
          </div>
        </Reveal>

        <Reveal className="pp-no-print">
          <div
            className="pp-panel mb-6 inline-flex rounded-xl p-1"
            aria-label="Modo del planificador"
          >
            <button
              onClick={() => setPlannerMode("manual")}
              className={`rounded-lg px-4 py-2 text-sm transition ${plannerMode === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Armar manualmente
            </button>
            <button
              onClick={() => setPlannerMode("smart")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${plannerMode === "smart" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sparkles className="h-4 w-4" /> Generar con asistente
            </button>
          </div>
        </Reveal>

        {/* ── ENCABEZADO SOLO PARA IMPRESIÓN ── */}
        <div className="pp-print-only mb-4 hidden">
          <p className="text-xl font-bold">Planificador IEK — Horario de clases</p>
          <p className="text-sm text-muted-foreground">
            {ENFASIS_OPTIONS.find((e) => e.id === enfasis)?.label ?? ""} · Ingeniería Electrónica
            (IEK) — FP UNA
          </p>
        </div>

        {/* ── PASO 1: CARRERA (única) ── */}
        <Reveal className="pp-no-print">
          <div className="pp-panel mb-5 flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
              1
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Carrera</p>
              <p className="text-sm font-medium text-foreground">
                Ingeniería Electrónica (IEK) — FP UNA
              </p>
            </div>
          </div>
        </Reveal>

        {/* ── PASO 2: MALLA ── */}
        <Reveal className="pp-no-print">
          <MallaPicker selected={mallaVersion} onSelect={elegirMalla} />
        </Reveal>

        {/* ── PASO 3: ÉNFASIS ── */}
        <Reveal className="pp-no-print">
          <EnfasisPicker enfasis={enfasis} onElegir={elegirEnfasis} />
        </Reveal>

        {!enfasis ? (
          <Reveal className="pp-no-print">
            <div className="pp-panel mt-6 rounded-3xl px-6 py-16 text-center">
              <GraduationCap className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="text-base font-medium text-foreground">
                Elegí tu énfasis para ver la {MALLA_LABEL[mallaVersion].toLowerCase()}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Vas a ver todas las materias desde primer hasta último semestre — Ciencias Básicas,
                comunes y las propias de tu orientación.
              </p>
            </div>
          </Reveal>
        ) : plannerMode === "smart" ? (
          <SemesterGeneratorPanel
            materias={materiasDisponibles}
            selectedIds={materiaIds}
            plan={schedulePlan}
            mallaVersion={mallaVersion}
            enfasis={enfasis}
            onApply={(ids, sections) => {
              setMateriaIds(ids);
              setChoice(sections);
              setPlannerMode("manual");
              setOpenSemestres([]);
              setFocusConfirmation(true);
            }}
          />
        ) : (
          <>
            {/* ── TOOLBAR ── */}
            <Reveal className="pp-no-print">
              <div className="pp-panel my-6 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{materiaIds.length}</span>
                  <span className="text-muted-foreground">
                    materia{materiaIds.length === 1 ? "" : "s"}
                  </span>
                  {pendientes > 0 && (
                    <span className="ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                      {pendientes} sin {mallaVersion === "plan-2008" ? "turno" : "opción"}
                    </span>
                  )}
                  {conflicts.length > 0 && (
                    <span className="ml-1 flex items-center gap-1 rounded-full bg-red-400/15 px-2 py-0.5 text-xs font-medium text-red-500 conflict-pulse">
                      <AlertTriangle className="h-3 w-3" /> {conflicts.length} choque
                      {conflicts.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {horarioConfirmado && (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <Check className="h-3.5 w-3.5" /> Horario confirmado
                      </span>
                      <ExportButtons
                        secciones={chosenSecciones}
                        disabled={chosenSecciones.length === 0}
                      />
                      <button
                        onClick={enviarAAsistencia}
                        disabled={chosenSecciones.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <CalendarCheck2 className="h-3.5 w-3.5" /> Enviar a Asistencia
                      </button>
                    </>
                  )}
                  {materiaIds.length > 0 && (
                    <button
                      onClick={limpiarTodo}
                      aria-label="Vaciar horario"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-500"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Vaciar
                    </button>
                  )}
                </div>
              </div>
              {syncMsg && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs text-foreground">
                  <span>{syncMsg}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link to="/asistencia" className="font-medium text-primary hover:underline">
                      Ver Calculadora de Asistencia
                    </Link>
                    <button
                      onClick={() => setSyncMsg(null)}
                      aria-label="Cerrar"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </Reveal>

            {/* ── PASO 4: MALLA CURRICULAR COMPLETA ── */}
            <Reveal className="pp-no-print">
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
                    4
                  </span>
                  <h2 className="font-display text-sm font-semibold text-foreground">
                    Malla curricular completa
                  </h2>
                </div>
                <Accordion
                  type="multiple"
                  value={openSemestres}
                  onValueChange={setOpenSemestres}
                  className="pp-panel divide-y divide-border rounded-2xl px-2"
                >
                  {malla.map(({ semestre, materias }) => {
                    const seleccionadas = materias.filter((m) => materiaIds.includes(m.id)).length;
                    return (
                      <AccordionItem
                        key={semestre}
                        value={String(semestre)}
                        className="border-none"
                      >
                        <AccordionTrigger className="px-3 hover:no-underline">
                          <span className="flex items-center gap-2.5">
                            <span className="font-display text-sm font-semibold text-foreground">
                              {semestre}° Semestre
                            </span>
                            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                              {materias.length} materias
                            </span>
                            {seleccionadas > 0 && (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                                {seleccionadas} elegidas
                              </span>
                            )}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {materias.map((m) => (
                              <MateriaChip
                                key={m.id}
                                materia={m}
                                plan={schedulePlan}
                                enfasis={enfasis}
                                checked={materiaIds.includes(m.id)}
                                onToggle={() => toggleMateria(m.id)}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </Reveal>

            {/* ── PASO 5: SECCIÓN / DOCENTE / HORARIO / AULA ── */}
            {materiaIds.length > 0 && (
              <Reveal className="pp-no-print">
                <div className="mb-10">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
                      5
                    </span>
                    <h2 className="font-display text-sm font-semibold text-foreground">
                      {mallaVersion === "vigente-2026"
                        ? "Revisá la opción, el horario y el plantel docente"
                        : "Elegí el turno de cada materia"}
                    </h2>
                  </div>
                  {mallaVersion === "plan-2008" && (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Los docentes se toman de la nómina oficial según materia y turno. Si un turno
                      tiene más de un horario, vas a ver cada alternativa por separado.
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {materiaIds.map((id) => {
                      const m = mallaById.get(id);
                      if (!m) return null;
                      return (
                        <SectionCard
                          key={id}
                          materia={m}
                          plan={schedulePlan}
                          enfasis={enfasis}
                          chosenId={choice[id]}
                          onChoose={(secId) => chooseSection(id, secId)}
                          onRemove={() => removeMateria(id)}
                          allChosen={chosenSecciones}
                          conflicts={conflicts}
                        />
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            )}

            {/* ── PASO 6: HORARIO / EXÁMENES ── */}
            {chosenSecciones.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {conflicts.length > 0 && <ConflictBanner conflicts={conflicts} />}

                <Reveal className="pp-no-print">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="pp-panel inline-flex rounded-xl p-1">
                      <TabButton
                        active={tab === "horario"}
                        onClick={() => setTab("horario")}
                        icon={CalendarRange}
                        label="Horario semanal"
                      />
                      <TabButton
                        active={tab === "examenes"}
                        onClick={() => setTab("examenes")}
                        icon={CalendarClock}
                        label="Exámenes"
                      />
                    </div>
                    {tab === "horario" && (
                      <div className="pp-panel inline-flex rounded-xl p-1">
                        <TabButton
                          active={view === "semanal"}
                          onClick={() => setView("semanal")}
                          icon={LayoutGrid}
                          label="Semanal"
                          small
                        />
                        <TabButton
                          active={view === "lista"}
                          onClick={() => setView("lista")}
                          icon={List}
                          label="Lista"
                          small
                        />
                      </div>
                    )}
                  </div>
                </Reveal>

                <div key={`${tab}-${view}`} className="pp-view-transition">
                  {tab === "horario" ? (
                    view === "semanal" ? (
                      <WeeklyCalendar secciones={chosenSecciones} conflicts={conflicts} />
                    ) : (
                      <ScheduleList secciones={chosenSecciones} conflicts={conflicts} />
                    )
                  ) : (
                    <ExamSection entries={examenes} conflicts={examConflicts} />
                  )}
                </div>
              </>
            )}

            {materiaIds.length > 0 && (
              <Reveal className="pp-no-print">
                <div
                  ref={confirmationRef}
                  id="confirmar-horario"
                  className={`mt-8 rounded-2xl border p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 ${
                    horarioConfirmado
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-primary/30 bg-primary/5"
                  }`}
                  aria-live="polite"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {horarioConfirmado ? (
                        <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                      ) : (
                        <CalendarCheck2 className="h-5 w-5 text-primary" />
                      )}
                      <h2 className="font-display text-base font-semibold text-foreground">
                        {horarioConfirmado ? "Horario confirmado" : "¿Este horario te sirve?"}
                      </h2>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      {horarioConfirmado
                        ? "Quedó guardado, se envió a Asistencia y ya está disponible para ¿Dónde rindo?, el calendario y la sincronización."
                        : pendientes > 0
                          ? `Todavía falta elegir ${mallaVersion === "plan-2008" ? "un turno" : "una opción"} para ${pendientes} materia${pendientes === 1 ? "" : "s"}.`
                          : conflicts.length > 0
                            ? "Resolvé los choques señalados antes de confirmar."
                            : "Revisá la distribución semanal y confirmá para guardar este horario como el vigente."}
                    </p>
                  </div>
                  {!horarioConfirmado && (
                    <button
                      onClick={confirmarHorario}
                      disabled={pendientes > 0 || conflicts.length > 0}
                      className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-0 sm:w-auto"
                    >
                      <CalendarCheck2 className="h-4 w-4" /> Confirmar horario
                    </button>
                  )}
                </div>
              </Reveal>
            )}
          </>
        )}
      </main>

      <SiteFooter />

      <style>{`
        .pp-panel {
          background: var(--popover);
          border: 1px solid var(--border);
        }
        @media (prefers-reduced-motion: no-preference) {
          .conflict-pulse { animation: pp-pulse 1.8s ease-in-out infinite; }
        }
        @keyframes pp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.35); }
          50% { box-shadow: 0 0 0 5px rgba(248,113,113,0); }
        }
        .pp-block { animation: pp-block-in .3s cubic-bezier(.2,.7,.2,1) both; }
        .pp-view-transition { animation: pp-view-in .22s cubic-bezier(.2,.7,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .pp-block, .pp-view-transition { animation: none !important; } }
        @keyframes pp-block-in { from { opacity:0; transform: translateY(6px) scale(.98); } to { opacity:1; transform:none; } }
        @keyframes pp-view-in { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform:none; } }
        @media print {
          header, footer, .pp-no-print { display: none !important; }
          .pp-print-only { display: block !important; }
          :root, html.light, html.dark {
            --background: #ffffff; --foreground: #0f172a; --card: #ffffff;
            --border: #cbd5e1; --muted: #f1f5f9; --muted-foreground: #475569;
            --popover: #ffffff;
          }
          html, body, main { background: white !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          .pp-panel { box-shadow: none !important; }
          .pp-block { break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════ Paso 2: Malla ═══════════════════════════════ */

function MallaPicker({
  selected,
  onSelect,
}: {
  selected: MallaAcademicaId;
  onSelect: (id: MallaAcademicaId) => void;
}) {
  return (
    <div className="mb-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
          2
        </span>
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">
            Elegí tu malla curricular
          </h2>
          <p className="text-xs text-muted-foreground">
            Cada malla usa únicamente sus propias materias, turnos y horarios.
          </p>
        </div>
      </div>
      <div className="pp-panel grid gap-2 rounded-2xl p-2 sm:grid-cols-2">
        {(
          [
            ["plan-2008", "Malla 2008", "Elegís por turno · docentes de la nómina oficial"],
            [
              "vigente-2026",
              "Malla 2026",
              "Ingresantes 2026 · sección única y laboratorios por grupo",
            ],
          ] as const
        ).map(([id, label, detail]) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={selected === id}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              selected === id
                ? "border-primary/50 bg-primary/10"
                : "border-transparent hover:border-border hover:bg-foreground/5"
            }`}
          >
            <span className="block text-sm font-semibold text-foreground">{label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Paso 3: Énfasis ═══════════════════════════════ */

function EnfasisPicker({
  enfasis,
  onElegir,
}: {
  enfasis: EnfasisId | null;
  onElegir: (id: EnfasisId) => void;
}) {
  const actual = ENFASIS_OPTIONS.find((e) => e.id === enfasis);

  if (enfasis && actual) {
    return (
      <div className="pp-panel flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
          3
        </span>
        <div
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg"
          style={actual.gradientStyle}
        >
          <actual.Icon className="h-4 w-4" style={{ color: actual.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Énfasis</p>
          <p className="text-sm font-medium text-foreground">{actual.label}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {ENFASIS_OPTIONS.filter((e) => e.id !== enfasis).map((e) => (
            <button
              key={e.id}
              onClick={() => onElegir(e.id)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              Cambiar a {e.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
          3
        </span>
        <h2 className="font-display text-sm font-semibold text-foreground">Elegí tu énfasis</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ENFASIS_OPTIONS.map((e) => (
          <button
            key={e.id}
            onClick={() => onElegir(e.id)}
            className={`pp-panel card-hover group rounded-2xl p-4 text-left transition-colors ${e.borderHover}`}
          >
            <div
              className="mb-3 grid h-10 w-10 place-items-center rounded-xl"
              style={e.gradientStyle}
            >
              <e.Icon className="h-5 w-5" style={{ color: e.color }} />
            </div>
            <p className="text-sm font-semibold text-foreground">{e.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{e.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Paso 3: chip de materia ═══════════════════════════════ */

function MateriaChip({
  materia,
  plan,
  enfasis,
  checked,
  onToggle,
}: {
  materia: MateriaMalla;
  plan: string;
  enfasis: EnfasisId;
  checked: boolean;
  onToggle: () => void;
}) {
  const ofertada = useMemo(
    () => seccionesCursablesPorMateriaMalla(materia.nombre, plan, enfasis).length > 0,
    [materia.nombre, plan, enfasis],
  );
  const departamentos = useMemo(
    () => departamentosPorMateriaMalla(materia.nombre, plan, enfasis),
    [materia.nombre, plan, enfasis],
  );

  return (
    <button
      onClick={ofertada ? onToggle : undefined}
      disabled={!ofertada}
      title={ofertada ? undefined : "No se oferta este período"}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
        !ofertada
          ? "cursor-not-allowed border-border/60 bg-muted/20 opacity-60"
          : checked
            ? "border-primary/50 bg-primary/10 text-foreground"
            : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-foreground/5"
      }`}
    >
      <span
        className={`mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded border transition-colors ${
          !ofertada ? "border-border" : checked ? "border-primary bg-primary" : "border-border"
        }`}
      >
        {checked && ofertada && <Check className="h-3 w-3 text-primary-foreground" />}
        {!ofertada && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate leading-snug">{materia.nombre}</span>
        <span className="text-[11px] text-muted-foreground">
          {departamentos.length ? departamentos.join(" · ") : "Área pendiente"}
          {!ofertada ? " · no ofertada este período" : ""}
        </span>
      </span>
    </button>
  );
}

/* ═══════════════════════════════ Paso 4: turno/docente/horario/aula ═══════════════════════════════ */

function SectionCard({
  materia,
  plan,
  enfasis,
  chosenId,
  onChoose,
  onRemove,
  allChosen,
  conflicts,
}: {
  materia: MateriaMalla;
  plan: string;
  enfasis: EnfasisId;
  chosenId: string | undefined;
  onChoose: (id: string) => void;
  onRemove: () => void;
  allChosen: Seccion[];
  conflicts: ScheduleConflict[];
}) {
  const [search, setSearch] = useState("");
  const color = colorForMateria(materia.nombre);
  const secciones = useMemo(
    () => seccionesCursablesPorMateriaMalla(materia.nombre, plan, enfasis),
    [materia.nombre, plan, enfasis],
  );
  const eligePorTurno = secciones.some((section) => section.modoSeleccion === "turno");
  const turnosDisponibles = new Set(secciones.map((section) => section.turno).filter(Boolean)).size;
  const gruposLaboratorio = new Set(
    secciones
      .map((section) => section.laboratorio?.grupo)
      .filter((group): group is string => Boolean(group)),
  ).size;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return secciones;
    return secciones.filter(
      (s) =>
        s.seccion.toLowerCase().includes(q) ||
        (TURNO_LABEL[s.turno] || s.turno).toLowerCase().includes(q) ||
        docenteNombre(s.docente).toLowerCase().includes(q) ||
        resumenHorario(s).toLowerCase().includes(q),
    );
  }, [secciones, search]);

  function conflictFor(seccion: Seccion): ScheduleConflict | undefined {
    return conflicts.find(
      (c) =>
        (c.a.seccion.id === seccion.id && allChosen.some((s) => s.id === c.b.seccion.id)) ||
        (c.b.seccion.id === seccion.id && allChosen.some((s) => s.id === c.a.seccion.id)),
    );
  }

  return (
    <div className="pp-block pp-panel card-hover rounded-2xl p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: color }}
            />
            <h3 className="truncate text-sm font-semibold text-foreground" title={materia.nombre}>
              {materia.nombre}
            </h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Sem. {materia.semestre} ·{" "}
            {eligePorTurno
              ? `${turnosDisponibles} turno${turnosDisponibles === 1 ? "" : "s"}`
              : `${secciones.length} opción${secciones.length === 1 ? "" : "es"}`}
            {gruposLaboratorio > 0
              ? ` · ${gruposLaboratorio} grupo${gruposLaboratorio === 1 ? "" : "s"} de laboratorio`
              : ""}
          </p>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Quitar ${materia.nombre}`}
          className="flex-shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-red-400/10 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {secciones.length > 4 && (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              eligePorTurno ? "Buscar turno, horario o docente…" : "Buscar opción o docente…"
            }
            className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition"
          />
        </div>
      )}

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {filtered.map((s) => {
          const isChosen = s.id === chosenId;
          const conflict = conflictFor(s);
          return (
            <button
              key={s.id}
              onClick={() => onChoose(s.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${
                isChosen
                  ? conflict
                    ? "border-red-400/60 bg-red-400/10"
                    : "border-primary/50 bg-primary/10"
                  : "border-border bg-card hover:border-primary/30 hover:bg-foreground/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {etiquetaSeleccion(s, secciones)}
                </span>
                <span className="flex items-center gap-1.5">
                  {s.turno && !eligePorTurno && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        background: `${TURNO_COLOR[s.turno] ?? "#94a3b8"}22`,
                        color: TURNO_COLOR[s.turno] ?? "#94a3b8",
                      }}
                    >
                      {TURNO_LABEL[s.turno] ?? s.turno}
                    </span>
                  )}
                  {isChosen && !conflict && <Check className="h-3.5 w-3.5 text-primary" />}
                  {conflict && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                </span>
              </div>
              {/* Docente → Horario → Aula, en filas claras */}
              <div className="mt-1.5 grid gap-0.5 text-muted-foreground">
                {s.materia !== materia.nombre && (
                  <p className="font-medium text-foreground">{nombreMateriaVisible(s.materia)}</p>
                )}
                <p className="line-clamp-2" title={docenteNombre(s.docente)}>
                  <span className="text-muted-foreground/60">
                    {s.docenteEsPlantel
                      ? eligePorTurno
                        ? "Docentes informados para el turno: "
                        : "Plantel informado: "
                      : "Docente: "}
                  </span>
                  {docenteNombre(s.docente)}
                </p>
                {s.laboratorio && (
                  <p>
                    <span className="text-muted-foreground/60">Laboratorio: </span>
                    {s.laboratorio.docente || "Docente a confirmar"}
                  </p>
                )}
                <p className="truncate">
                  <span className="text-muted-foreground/60">Horario: </span>
                  {resumenHorario(s)}
                </p>
              </div>
              {conflict && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-red-500">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  Choca con{" "}
                  {conflict.a.seccion.id === s.id
                    ? conflict.b.seccion.materia
                    : conflict.a.seccion.materia}{" "}
                  el {conflict.dia}
                </p>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-3 text-center text-xs text-muted-foreground">Sin resultados.</p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Compartidos ═══════════════════════════════ */

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  small,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all ${small ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"} ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
      }`}
    >
      <Icon className={small ? "h-3.5 w-3.5" : "h-4 w-4"} /> {label}
    </button>
  );
}

function EmptyState() {
  return (
    <Reveal>
      <div className="pp-panel rounded-3xl px-6 py-16 text-center">
        <CalendarRange className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
        <h3 className="font-display text-lg font-semibold text-foreground">
          Todavía no armaste tu horario
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Elegí una opción para las materias marcadas más arriba. El horario y el calendario de
          exámenes se generan automáticamente.
        </p>
      </div>
    </Reveal>
  );
}

function ConflictBanner({ conflicts }: { conflicts: ScheduleConflict[] }) {
  return (
    <Reveal>
      <div className="pp-no-print mb-6 rounded-2xl border border-red-400/30 bg-red-400/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-500">
          <AlertTriangle className="h-4 w-4" /> {conflicts.length} choque
          {conflicts.length === 1 ? "" : "s"} de horario detectado
          {conflicts.length === 1 ? "" : "s"}
        </div>
        <ul className="space-y-1 text-xs text-red-500/90">
          {conflicts.map((c, i) => (
            <li key={i}>
              <span className="font-medium">{c.a.seccion.materia}</span> ({c.a.clase.hora}) se
              superpone con <span className="font-medium">{c.b.seccion.materia}</span> (
              {c.b.clase.hora}) el <span className="font-medium">{c.dia}</span> — {c.overlapMin} min
              de solapamiento. El reglamento no permite superposición de horarios.
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

/* ═══════════════════════════════ Calendario semanal (estilo Google Calendar) ═══════════════════════════════ */

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const PX_PER_MIN = 0.92;
const TIME_COLUMN_WIDTH = 72;
const DAY_COLUMN_WIDTH = 184;

function WeeklyCalendar({
  secciones,
  conflicts,
}: {
  secciones: Seccion[];
  conflicts: ScheduleConflict[];
}) {
  const diasConClase = useMemo(() => {
    const set = new Set<Dia>();
    secciones.forEach((s) => s.clases.forEach((c) => set.add(c.dia as Dia)));
    return DIAS.filter((d) => set.has(d));
  }, [secciones]);

  const dias = diasConClase.length ? diasConClase : DIAS.slice(0, 5);
  const conflictKeys = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach((c) => {
      set.add(c.a.seccion.id + c.a.clase.dia + c.a.clase.hora);
      set.add(c.b.seccion.id + c.b.clase.dia + c.b.clase.hora);
    });
    return set;
  }, [conflicts]);

  const hours: number[] = [];
  for (let h = 7; h <= 22; h++) hours.push(h);

  return (
    <Reveal>
      <div className="pp-panel overflow-x-auto overscroll-x-contain rounded-2xl [scrollbar-gutter:stable]">
        <div style={{ minWidth: `${TIME_COLUMN_WIDTH + dias.length * DAY_COLUMN_WIDTH}px` }}>
          {/* Header de días — sticky, estilo Google Calendar */}
          <div
            className="sticky top-0 z-10 grid border-b border-border bg-card"
            style={{
              gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${dias.length}, minmax(${DAY_COLUMN_WIDTH}px, 1fr))`,
            }}
          >
            <div className="border-r border-border/50" />
            {dias.map((d) => (
              <div
                key={d}
                className="border-r border-border/50 bg-muted/20 py-3 text-center text-xs font-bold uppercase tracking-wide text-foreground last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${dias.length}, minmax(${DAY_COLUMN_WIDTH}px, 1fr))`,
              height: (DAY_END - DAY_START) * PX_PER_MIN,
            }}
          >
            <div className="relative border-r border-border/50">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute -translate-y-1/2 w-full pr-2 text-right text-[10px] text-muted-foreground"
                  style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {dias.map((d, di) => {
              const eventos = layoutDaySchedule(
                secciones.flatMap((s) =>
                  s.clases
                    .filter((c) => c.dia === d)
                    .map((c, idx) => {
                      const range = parseHora(c.hora);
                      return range
                        ? { item: { s, c, idx }, start: range.start, end: range.end }
                        : null;
                    })
                    .filter((x): x is NonNullable<typeof x> => Boolean(x)),
                ),
              );
              return (
                <div
                  key={d}
                  className={`relative ${di < dias.length - 1 ? "border-r border-border/50" : ""}`}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full border-t border-border/30"
                      style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}
                    />
                  ))}
                  {hours.slice(0, -1).map((h) => (
                    <div
                      key={`${h}-half`}
                      className="absolute w-full border-t border-dashed border-border/20"
                      style={{ top: (h * 60 + 30 - DAY_START) * PX_PER_MIN }}
                    />
                  ))}
                  {eventos.map(({ item: { s, c, idx }, start, end, col, cols }) => {
                    const top = Math.max(0, (start - DAY_START) * PX_PER_MIN);
                    const height = Math.max(54, (end - start) * PX_PER_MIN);
                    const color = colorForMateria(s.materia);
                    const isConflict = conflictKeys.has(s.id + c.dia + c.hora);
                    const gap = 3;
                    const widthPct = 100 / cols;
                    return (
                      <div
                        key={s.id + idx}
                        title={`${s.materia} · ${etiquetaSeleccion(s, secciones)} · ${docenteNombre(s.docente)} · ${c.hora}${c.aula ? " · " + c.aula : ""}`}
                        className={`pp-block absolute overflow-hidden rounded-md p-2 text-[10px] leading-tight ${isConflict ? "conflict-pulse ring-2 ring-red-400" : ""}`}
                        style={{
                          top,
                          height,
                          left: `calc(${col * widthPct}% + ${gap / 2}px)`,
                          width: `calc(${widthPct}% - ${gap}px)`,
                          background: `${color}2e`,
                          border: `1px solid ${color}55`,
                          borderLeft: `4px solid ${color}`,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                          zIndex: cols > 1 ? 5 : 1,
                        }}
                      >
                        {cols > 1 && (
                          <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-red-500 px-1 py-0.5 text-[8px] font-bold text-white">
                            <AlertTriangle className="h-2 w-2" /> choque
                          </span>
                        )}
                        <p
                          className="line-clamp-2 pr-1 text-[11px] font-bold leading-tight"
                          style={{ color }}
                        >
                          {s.materia}
                          {c.tipo === "laboratorio" && (
                            <span className="ml-1 rounded bg-primary/15 px-1 py-0.5 text-[8px] uppercase tracking-wide text-primary">
                              Laboratorio
                            </span>
                          )}
                        </p>
                        <p className="mt-1 flex items-center gap-1 font-semibold tabular-nums text-foreground/80">
                          <Clock3 className="h-3 w-3 shrink-0" /> {c.hora}
                        </p>
                        {height > 66 && (
                          <p className="mt-1 flex items-center gap-1 truncate text-foreground/65">
                            <MapPin className="h-3 w-3 shrink-0" /> {etiquetaSeleccion(s)} ·{" "}
                            {c.aula || "Aula pendiente"}
                          </p>
                        )}
                        {height > 92 && (
                          <p className="mt-1 truncate text-foreground/55">
                            {docenteNombre(s.docente)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Legend secciones={secciones} />
    </Reveal>
  );
}

function Legend({ secciones }: { secciones: Seccion[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {secciones.map((s) => (
        <span
          key={s.id}
          className="pp-panel inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: colorForMateria(s.materia) }}
          />
          {s.materia} <span className="text-muted-foreground/70">· {etiquetaSeleccion(s)}</span>
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════ Vista lista ═══════════════════════════════ */

function ScheduleList({
  secciones,
  conflicts,
}: {
  secciones: Seccion[];
  conflicts: ScheduleConflict[];
}) {
  const rows = useMemo(() => {
    const out: {
      dia: Dia;
      hora: string;
      materia: string;
      seccion: Seccion;
      aula: string | null;
      tipo?: "teoria" | "laboratorio";
    }[] = [];
    secciones.forEach((s) =>
      s.clases.forEach((c) =>
        out.push({
          dia: c.dia as Dia,
          hora: c.hora,
          materia: s.materia,
          seccion: s,
          aula: c.aula,
          tipo: c.tipo,
        }),
      ),
    );
    return out.sort(
      (a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.hora.localeCompare(b.hora),
    );
  }, [secciones]);

  const conflictKeys = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach((c) => {
      set.add(c.a.seccion.id + c.a.clase.dia + c.a.clase.hora);
      set.add(c.b.seccion.id + c.b.clase.dia + c.b.clase.hora);
    });
    return set;
  }, [conflicts]);

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Ninguna de tus materias elegidas tiene clases presenciales registradas.
      </p>
    );
  }

  return (
    <Reveal>
      <div className="pp-panel overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Día</th>
              <th className="px-4 py-3 font-medium">Hora</th>
              <th className="px-4 py-3 font-medium">Materia</th>
              <th className="px-4 py-3 font-medium">Turno / grupo</th>
              <th className="px-4 py-3 font-medium">Docente</th>
              <th className="px-4 py-3 font-medium">Aula</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isConflict = conflictKeys.has(r.seccion.id + r.dia + r.hora);
              return (
                <tr
                  key={i}
                  className={`border-b border-border/50 last:border-0 transition-colors hover:bg-foreground/5 ${isConflict ? "bg-red-400/5" : ""}`}
                >
                  <td className="px-4 py-3 text-foreground">{r.dia}</td>
                  <td className="px-4 py-3 text-foreground">{r.hora}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: colorForMateria(r.materia) }}
                      />
                      {r.materia}
                      {r.tipo === "laboratorio" && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          Laboratorio
                        </span>
                      )}
                      {isConflict && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {etiquetaSeleccion(r.seccion)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {docenteNombre(r.seccion.docente)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.aula ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
}

/* ═══════════════════════════════ Exámenes: agenda por tipo + calendario mensual ═══════════════════════════════ */

function ExamSection({
  entries,
  conflicts,
}: {
  entries: ReturnType<typeof listExamenes>;
  conflicts: ReturnType<typeof findExamConflicts>;
}) {
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const first = entries[0]?.fecha;
    const base = first ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay fechas de examen registradas para tus materias elegidas.
      </p>
    );
  }

  const grupos = EXAM_GROUPS.map((g) => ({
    ...g,
    items: entries.filter((e) => e.tipo === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <Reveal>
      <div className="space-y-8">
        {conflicts.length > 0 && (
          <div className="pp-no-print rounded-2xl border border-red-400/30 bg-red-400/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-500">
              <AlertTriangle className="h-4 w-4" /> {conflicts.length} fecha
              {conflicts.length === 1 ? "" : "s"} con exámenes que coinciden
            </div>
            <ul className="space-y-1 text-xs text-red-500/90">
              {conflicts.map((c, i) => (
                <li key={i}>
                  {c.fecha.toLocaleDateString("es-PY", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                  :{" "}
                  {c.entries
                    .map((e) => `${e.seccion.materia} (${examenLabel(e.tipo)}, ${e.info.hora})`)
                    .join(" y ")}
                  .
                </li>
              ))}
            </ul>
          </div>
        )}

        <MonthlyExamCalendar
          entries={entries}
          monthCursor={monthCursor}
          onMonthChange={setMonthCursor}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        {grupos.map((g) => (
          <div key={g.key}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">{g.label}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((e, i) => {
                const color = colorForMateria(e.seccion.materia);
                const revisionKey = g.sub;
                const revision = revisionKey ? e.seccion.examenes[revisionKey] : undefined;
                return (
                  <div key={i} className="pp-block pp-panel card-hover rounded-2xl p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: `${color}22`, color }}
                      >
                        {g.label}
                      </span>
                    </div>
                    <p
                      className="truncate text-sm font-semibold text-foreground"
                      title={e.seccion.materia}
                    >
                      {e.seccion.materia}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.fecha.toLocaleDateString("es-PY", {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                      })}{" "}
                      · {e.info.hora || "hora a confirmar"}
                    </p>
                    {e.info.aula && <p className="text-xs text-muted-foreground">{e.info.aula}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {docenteNombre(e.seccion.docente)} · {etiquetaSeleccion(e.seccion)}
                    </p>
                    {revision?.dia && (
                      <p className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground/70">
                        Revisión: {revision.dia}
                        {revision.hora ? ` · ${revision.hora}` : ""}
                        {revision.aula ? ` · ${revision.aula}` : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function MonthlyExamCalendar({
  entries,
  monthCursor,
  onMonthChange,
  selectedDay,
  onSelectDay,
}: {
  entries: ReturnType<typeof listExamenes>;
  monthCursor: Date;
  onMonthChange: (d: Date) => void;
  selectedDay: string | null;
  onSelectDay: (d: string | null) => void;
}) {
  const year = monthCursor.getFullYear(),
    month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const examsByDate = useMemo(() => {
    const map = new Map<string, typeof entries>();
    entries.forEach((e) => {
      const key = e.fecha.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [entries]);

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedExams = selectedDay ? (examsByDate.get(selectedDay) ?? []) : [];

  return (
    <div className="pp-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm font-semibold capitalize text-foreground">
          {monthCursor.toLocaleDateString("es-PY", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <button
            aria-label="Mes anterior"
            onClick={() => onMonthChange(new Date(year, month - 1, 1))}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            aria-label="Mes siguiente"
            onClick={() => onMonthChange(new Date(year, month + 1, 1))}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map((d) => (
          <div key={d} className="pb-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = date.toDateString();
          const exams = examsByDate.get(key) ?? [];
          const isSelected = selectedDay === key;
          return (
            <button
              key={i}
              onClick={() => exams.length > 0 && onSelectDay(isSelected ? null : key)}
              disabled={exams.length === 0}
              className={`aspect-square rounded-lg text-xs transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : exams.length > 0
                    ? "bg-foreground/5 text-foreground hover:bg-foreground/10"
                    : "text-muted-foreground/50"
              }`}
            >
              <span className="block">{date.getDate()}</span>
              {exams.length > 0 && (
                <span className="mt-0.5 flex items-center justify-center gap-0.5">
                  {exams.slice(0, 3).map((e, idx) => (
                    <span
                      key={idx}
                      className="h-1 w-1 rounded-full"
                      style={{
                        background: isSelected
                          ? "currentColor"
                          : colorForMateria(e.seccion.materia),
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedExams.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {selectedExams.map((e, i) => {
            const color = colorForMateria(e.seccion.materia);
            return (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-xs"
              >
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {e.seccion.materia} — {examenLabel(e.tipo)}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {e.info.hora || "hora a confirmar"} {e.info.aula ? `· ${e.info.aula}` : ""} ·{" "}
                    {docenteNombre(e.seccion.docente)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ Exportar / imprimir ═══════════════════════════════ */

function ExportButtons({ secciones, disabled }: { secciones: Seccion[]; disabled: boolean }) {
  const [open, setOpen] = useState(false);

  function exportICS() {
    const ics = buildICS(secciones);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "horario-planificador-iek.ics";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(secciones, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "horario-planificador-iek.json";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <div className="pp-no-print relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download className="h-3.5 w-3.5" /> Exportar
      </button>
      <button
        disabled={disabled}
        onClick={() => window.print()}
        className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Printer className="h-3.5 w-3.5" /> Imprimir
      </button>
      {open && !disabled && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
          <button
            onClick={exportICS}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-foreground hover:bg-foreground/5"
          >
            <CalendarRange className="h-3.5 w-3.5" /> Calendario (.ics)
          </button>
          <button
            onClick={exportJSON}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-foreground hover:bg-foreground/5"
          >
            <Info className="h-3.5 w-3.5" /> Datos (.json)
          </button>
        </div>
      )}
    </div>
  );
}

const DIA_ICS: Record<string, string> = {
  Lunes: "MO",
  Martes: "TU",
  Miércoles: "WE",
  Jueves: "TH",
  Viernes: "FR",
  Sábado: "SA",
};

function nextWeekday(from: Date, target: string): Date {
  const map: Record<string, number> = {
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
  };
  const d = new Date(from);
  const targetDow = map[target] ?? 1;
  const diff = (targetDow - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function icsDate(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function icsDateTime(d: Date, h: number, m: number) {
  return `${icsDate(d)}T${pad(h)}${pad(m)}00`;
}

function buildICS(secciones: Seccion[]): string {
  const today = new Date();
  const allExamDates = secciones.flatMap((s) => Object.values(s.examenes)).filter(Boolean) as {
    dia: string;
  }[];
  const parsed = allExamDates
    .map((e) => parseFechaExamen(e.dia))
    .filter((d): d is Date => Boolean(d));
  const until = parsed.length
    ? new Date(Math.max(...parsed.map((d) => d.getTime())))
    : new Date(today.getFullYear(), today.getMonth() + 4, today.getDate());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Delegación Estudiantil IEK//Planificador IEK//ES",
    "CALSCALE:GREGORIAN",
  ];

  secciones.forEach((s) => {
    s.clases.forEach((c, idx) => {
      const range = parseHora(c.hora);
      if (!range) return;
      const startDate = nextWeekday(today, c.dia);
      const startH = Math.floor(range.start / 60),
        startM = range.start % 60;
      const endH = Math.floor(range.end / 60),
        endM = range.end % 60;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${s.id}-${idx}@poliplanner.iek`,
        `DTSTAMP:${icsDateTime(today, 0, 0)}Z`,
        `DTSTART:${icsDateTime(startDate, startH, startM)}`,
        `DTEND:${icsDateTime(startDate, endH, endM)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${DIA_ICS[c.dia] ?? "MO"};UNTIL=${icsDate(until)}T235959Z`,
        `SUMMARY:${s.materia} (${etiquetaSeleccion(s)})`,
        `LOCATION:${c.aula ?? "Aula a confirmar"}`,
        `DESCRIPTION:${docenteNombre(s.docente)}`,
        "END:VEVENT",
      );
    });

    Object.entries(s.examenes).forEach(([tipo, info]) => {
      if (!info || !info.dia) return;
      const date = parseFechaExamen(info.dia);
      if (!date) return;
      const [h, min] = (info.hora || "08:00").split(":").map(Number);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${s.id}-${tipo}@poliplanner.iek`,
        `DTSTAMP:${icsDateTime(today, 0, 0)}Z`,
        `DTSTART:${icsDateTime(date, h || 8, min || 0)}`,
        `DTEND:${icsDateTime(date, (h || 8) + 2, min || 0)}`,
        `SUMMARY:${examenLabel(tipo)} — ${s.materia}`,
        `LOCATION:${info.aula || "Aula a confirmar"}`,
        "END:VEVENT",
      );
    });
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
