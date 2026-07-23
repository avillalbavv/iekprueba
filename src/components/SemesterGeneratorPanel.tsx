import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Clock3, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import type { EnfasisId, MallaAcademicaId, MateriaMalla } from "@/lib/malla-curricular";
import {
  etiquetaSeleccion,
  esSeccionSoloExamen,
  seccionesCursablesPorMateriaMalla,
  seccionesPorMateriaMalla,
} from "@/lib/poliplanner";
import { generateSemesterSchedules, type ScheduleProposal } from "@/lib/schedule-generator";
import { shiftDistanceToPreferences, type AcademicShift } from "@/lib/schedule-preference";

interface Props {
  materias: MateriaMalla[];
  selectedIds: string[];
  plan: string;
  mallaVersion: MallaAcademicaId;
  enfasis: EnfasisId;
  onApply: (materiaIds: string[], sections: Record<string, string>) => void;
}

export function SemesterGeneratorPanel({
  materias,
  selectedIds,
  plan,
  mallaVersion,
  enfasis,
  onApply,
}: Props) {
  const isPlan2026 = mallaVersion === "vigente-2026";
  const offered = useMemo(
    () =>
      materias
        .map((materia) => {
          const sections = seccionesPorMateriaMalla(materia.nombre, plan, enfasis);
          return {
            materia,
            sections,
            schedulableSections: seccionesCursablesPorMateriaMalla(materia.nombre, plan, enfasis),
            examOnlySections: sections.filter(esSeccionSoloExamen),
          };
        })
        .filter((entry) => entry.sections.length > 0),
    [materias, plan, enfasis],
  );
  const [selected, setSelected] = useState<string[]>(() =>
    selectedIds.filter((id) =>
      offered.some((entry) => entry.materia.id === id && entry.schedulableSections.length > 0),
    ),
  );
  const [shift, setShift] = useState<"" | "M" | "T" | "N" | "MT" | "TN" | "NM">("");
  const [freeDay, setFreeDay] = useState("");
  const [proposals, setProposals] = useState<ScheduleProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const generationTimer = useRef<number | null>(null);
  const analysisTimer = useRef<number | null>(null);
  const preferredShifts = useMemo(() => (shift ? ([...shift] as AcademicShift[]) : []), [shift]);

  useEffect(() => {
    setSelected((current) =>
      current.filter((id) =>
        offered.some((entry) => entry.materia.id === id && entry.schedulableSections.length > 0),
      ),
    );
    setProposals([]);
  }, [offered]);

  useEffect(
    () => () => {
      if (generationTimer.current) window.clearTimeout(generationTimer.current);
      if (analysisTimer.current) window.clearInterval(analysisTimer.current);
    },
    [],
  );

  useEffect(() => {
    setProposals([]);
    setHasGenerated(false);
  }, [selected, shift, freeDay]);

  const offeredBySemester = useMemo(
    () =>
      [...new Set(offered.map((entry) => entry.materia.semestre))]
        .sort((a, b) => a - b)
        .map((semester) => ({
          semester,
          entries: offered.filter((entry) => entry.materia.semestre === semester),
        })),
    [offered],
  );

  const sectionToMalla = useMemo(
    () =>
      new Map(
        offered.flatMap(({ materia, sections }) =>
          sections.map((section) => [section.materiaId, materia.id] as const),
        ),
      ),
    [offered],
  );

  const mallaNameById = useMemo(
    () => new Map(offered.map(({ materia }) => [materia.id, materia.nombre])),
    [offered],
  );

  function toggleSemester(ids: string[]) {
    const allSelected = ids.every((id) => selected.includes(id));
    setSelected((current) =>
      allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])],
    );
  }

  function generate() {
    const materiaIdGroups = selected
      .map((mallaId) => {
        const entry = offered.find((candidate) => candidate.materia.id === mallaId);
        return [...new Set(entry?.schedulableSections.map((section) => section.materiaId) || [])];
      })
      .filter((group) => group.length > 0);
    setIsGenerating(true);
    setAnalysisStep(0);
    setHasGenerated(false);
    setProposals([]);
    if (generationTimer.current) window.clearTimeout(generationTimer.current);
    if (analysisTimer.current) window.clearInterval(analysisTimer.current);
    analysisTimer.current = window.setInterval(
      () => setAnalysisStep((step) => Math.min(step + 1, 3)),
      280,
    );
    generationTimer.current = window.setTimeout(() => {
      setProposals(
        generateSemesterSchedules({
          materiaIds: materiaIdGroups.flat(),
          materiaIdGroups,
          maxSubjects: selected.length,
          preferredShifts: preferredShifts.length ? preferredShifts : undefined,
          freeDay: freeDay || undefined,
          maxDays: 6,
          allowOverlap: false,
        }),
      );
      setIsGenerating(false);
      setHasGenerated(true);
      if (analysisTimer.current) window.clearInterval(analysisTimer.current);
      analysisTimer.current = null;
      generationTimer.current = null;
    }, 1150);
  }

  function apply(proposal: ScheduleProposal) {
    const materiaIds = proposal.sections
      .map((section) => sectionToMalla.get(section.materiaId))
      .filter((id): id is string => Boolean(id));
    const sections = Object.fromEntries(
      proposal.sections.flatMap((section) => {
        const mallaId = sectionToMalla.get(section.materiaId);
        return mallaId ? [[mallaId, section.id]] : [];
      }),
    );
    onApply(materiaIds, sections);
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
      <section className="pp-panel h-fit rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold">Asistente de horario</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Seleccioná las materias y tus preferencias. Se usarán únicamente las{" "}
          {isPlan2026 ? "opciones y grupos de laboratorio" : "alternativas por turno"} reales del
          periodo.
        </p>
        <div className="mt-4 max-h-[28rem] space-y-3 overflow-auto pr-2">
          {offeredBySemester.map(({ semester, entries }) => {
            const semesterIds = entries
              .filter((entry) => entry.schedulableSections.length > 0)
              .map((entry) => entry.materia.id);
            const selectedCount = semesterIds.filter((id) => selected.includes(id)).length;
            const allSelected = semesterIds.length > 0 && selectedCount === semesterIds.length;
            return (
              <div key={semester} className="rounded-xl border border-border/80 p-2">
                <div className="flex items-center justify-between gap-2 px-1 pb-1">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{semester}° semestre</p>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedCount} de {semesterIds.length} seleccionadas
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!semesterIds.length}
                    onClick={() => toggleSemester(semesterIds)}
                    className="rounded-lg border border-border px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 disabled:opacity-40"
                  >
                    {allSelected ? "Quitar semestre" : "Seleccionar semestre"}
                  </button>
                </div>
                <div className="mt-1 space-y-1">
                  {entries.map(({ materia, sections, schedulableSections, examOnlySections }) => (
                    <label
                      key={materia.id}
                      className={`flex gap-3 rounded-lg p-2 ${
                        schedulableSections.length
                          ? "cursor-pointer hover:bg-foreground/5"
                          : "cursor-not-allowed opacity-65"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!schedulableSections.length}
                        checked={selected.includes(materia.id)}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...selected, materia.id]
                              : selected.filter((id) => id !== materia.id),
                          )
                        }
                      />
                      <span className="text-sm">
                        {materia.nombre}
                        <small className="block text-muted-foreground">
                          {schedulableSections.length
                            ? `${schedulableSections.length} ${
                                isPlan2026
                                  ? schedulableSections.length === 1
                                    ? "opción"
                                    : "opciones"
                                  : schedulableSections.length === 1
                                    ? "alternativa"
                                    : "alternativas"
                              } con horario`
                            : examOnlySections.length === sections.length
                              ? `${examOnlySections.length} mesa${examOnlySections.length === 1 ? "" : "s"} · solo examen final`
                              : `${sections.length} alternativa${sections.length === 1 ? "" : "s"} · horario pendiente de confirmación`}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs">
            Turno preferido
            <select
              value={shift}
              onChange={(event) => setShift(event.target.value as typeof shift)}
              className="mt-1 w-full rounded-lg border border-input bg-background p-2"
            >
              <option value="">Cualquiera</option>
              <option value="M">Mañana</option>
              <option value="T">Tarde</option>
              <option value="N">Noche</option>
              <option value="MT">Mañana + tarde</option>
              <option value="TN">Tarde + noche</option>
              <option value="NM">Noche + mañana</option>
            </select>
          </label>
          <label className="text-xs">
            Día libre
            <select
              value={freeDay}
              onChange={(event) => setFreeDay(event.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background p-2"
            >
              <option value="">Ninguno</option>
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          disabled={!selected.length || isGenerating}
          onClick={generate}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary p-3 font-medium text-primary-foreground disabled:opacity-40"
        >
          {isGenerating ? (
            <>
              <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> Analizando alternativas…
            </>
          ) : (
            <>
              <Bot className="h-4 w-4" /> Generar mi mejor horario
            </>
          )}
        </button>
      </section>

      <section className="space-y-4">
        {isGenerating && (
          <div className="pp-panel rounded-2xl p-8 text-center" role="status" aria-live="polite">
            <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <span className="absolute inset-0 rounded-2xl border border-primary/40 motion-safe:animate-ping" />
              <Bot className="relative h-7 w-7 motion-safe:animate-pulse" />
            </div>
            <h3 className="mt-4 font-display font-semibold">Análisis inteligente del horario</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {
                [
                  "Leyendo las materias y alternativas reales del periodo…",
                  "Comparando turnos y el día libre solicitado…",
                  "Descartando choques y opciones solo para examen…",
                  "Minimizando las horas libres entre clases…",
                ][analysisStep]
              }
            </p>
            <div className="mx-auto mt-5 flex max-w-xs gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${step <= analysisStep ? "bg-primary" : "bg-foreground/10"}`}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground/80">
              Cálculo local y determinista; no comparte tus preferencias con servicios externos.
            </p>
          </div>
        )}
        {!isGenerating && !proposals.length && !hasGenerated && (
          <div className="pp-panel rounded-2xl p-8 text-center text-muted-foreground">
            Elegí materias por semestre y el asistente propondrá como máximo dos horarios.
          </div>
        )}
        {!isGenerating && hasGenerated && !proposals.length && (
          <div className="pp-panel rounded-2xl p-8 text-center">
            <TriangleAlert className="mx-auto h-7 w-7 text-amber-500" />
            <p className="mt-3 font-medium">No se encontró una combinación sin choques.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Probá con menos materias o revisá manualmente sus turnos.
            </p>
          </div>
        )}
        {proposals.map((proposal) => (
          <article key={proposal.id} className="pp-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{proposal.label}</h3>
                <p className="text-sm text-muted-foreground">{proposal.explanation.join(" ")}</p>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                Afinidad {proposal.score}%
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5">
              <div>
                <b className="block text-lg">
                  {proposal.sections.length}/{proposal.requestedSubjects}
                </b>
                materias
              </div>
              <div>
                <b className="block text-lg">{proposal.days}</b>días
              </div>
              <div>
                <b className="block text-lg">{Math.round(proposal.weeklyMinutes / 60)} h</b>
                semanales
              </div>
              <div>
                <b className="block text-lg">{Math.round(proposal.gapMinutes / 60)} h</b>
                horas libres
              </div>
              <div>
                <b className="block text-lg">{proposal.conflicts}</b>conflictos
              </div>
            </div>
            {(() => {
              const appliedMallaIds = new Set(
                proposal.sections
                  .map((section) => sectionToMalla.get(section.materiaId))
                  .filter((id): id is string => Boolean(id)),
              );
              const missing = selected
                .filter((id) => !appliedMallaIds.has(id))
                .map((id) => mallaNameById.get(id) || id);
              const freeDaySubjects = freeDay
                ? proposal.sections
                    .filter((section) => section.clases.some((clase) => clase.dia === freeDay))
                    .map(
                      (section) =>
                        mallaNameById.get(sectionToMalla.get(section.materiaId) || "") ||
                        section.materia,
                    )
                : [];
              const shiftFallbacks = preferredShifts.length
                ? proposal.sections.filter(
                    (section) => !preferredShifts.includes(section.turno as AcademicShift),
                  )
                : [];
              const shiftLabel: Record<string, string> = {
                M: "mañana",
                T: "tarde",
                N: "noche",
              };
              return (
                <div className="mt-4 space-y-2 text-xs">
                  {!missing.length && (
                    <div className="flex gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" /> Incluye todas las materias que
                      seleccionaste.
                    </div>
                  )}
                  {missing.length > 0 && (
                    <div className="flex gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-red-700 dark:text-red-300">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        No se pudieron incluir por choques: <b>{missing.join(", ")}</b>.
                      </span>
                    </div>
                  )}
                  {freeDaySubjects.length > 0 && (
                    <div className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {freeDay} no puede quedar libre porque <b>{freeDaySubjects.join(", ")}</b>{" "}
                        tiene clase ese día.
                      </span>
                    </div>
                  )}
                  {shiftFallbacks.map((section) => {
                    const mallaId = sectionToMalla.get(section.materiaId) || "";
                    const subject = mallaNameById.get(mallaId) || section.materia;
                    const entry = offered.find((candidate) => candidate.materia.id === mallaId);
                    const hasPreferred = entry?.schedulableSections.some((candidate) =>
                      preferredShifts.includes(candidate.turno as AcademicShift),
                    );
                    const hasCloserAlternative = entry?.schedulableSections.some(
                      (candidate) =>
                        shiftDistanceToPreferences(candidate.turno, preferredShifts) <
                        shiftDistanceToPreferences(section.turno, preferredShifts),
                    );
                    return (
                      <div
                        key={section.id}
                        className="flex gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 p-3 text-sky-800 dark:text-sky-300"
                      >
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <b>{subject}</b> quedó en turno{" "}
                          {shiftLabel[section.turno] || section.turno}
                          {hasPreferred || hasCloserAlternative
                            ? ` para conservar más materias y evitar choques.`
                            : ` porque no se ofrece en ${preferredShifts.map((item) => shiftLabel[item]).join(" o ")}; es el turno viable más cercano.`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {proposal.sections.map((section) => (
                <li key={section.id} className="rounded-xl border border-border p-3 text-sm">
                  <b>{section.materia}</b>
                  <span className="block text-xs text-muted-foreground">
                    {etiquetaSeleccion(
                      section,
                      offered.find((entry) =>
                        entry.schedulableSections.some(
                          (candidate) => candidate.materiaId === section.materiaId,
                        ),
                      )?.schedulableSections,
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => apply(proposal)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Check className="h-4 w-4" /> Revisar y confirmar horario
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
