import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { MateriaMalla } from "@/lib/malla-curricular";
import { seccionesPorMateriaMalla } from "@/lib/poliplanner";
import { generateSemesterSchedules, type ScheduleProposal } from "@/lib/schedule-generator";

interface Props {
  materias: MateriaMalla[];
  selectedIds: string[];
  onApply: (materiaIds: string[], sections: Record<string, string>) => void;
}

export function SemesterGeneratorPanel({ materias, selectedIds, onApply }: Props) {
  const offered = useMemo(
    () =>
      materias
        .map((materia) => {
          const sections = seccionesPorMateriaMalla(materia.nombre);
          return {
            materia,
            sections,
            schedulableSections: sections.filter((section) => section.clases.length > 0),
          };
        })
        .filter((entry) => entry.sections.length > 0),
    [materias],
  );
  const [selected, setSelected] = useState<string[]>(() =>
    selectedIds.filter((id) => offered.some((entry) => entry.materia.id === id)),
  );
  const [shift, setShift] = useState<"" | "M" | "T" | "N">("");
  const [freeDay, setFreeDay] = useState("");
  const [proposals, setProposals] = useState<ScheduleProposal[]>([]);

  useEffect(() => {
    setSelected((current) =>
      current.filter((id) => offered.some((entry) => entry.materia.id === id)),
    );
    setProposals([]);
  }, [offered]);

  const sectionToMalla = useMemo(
    () =>
      new Map(
        offered.flatMap(({ materia, sections }) =>
          sections.map((section) => [section.materiaId, materia.id] as const),
        ),
      ),
    [offered],
  );

  function generate() {
    const materiaIdGroups = selected
      .map((mallaId) => {
        const entry = offered.find((candidate) => candidate.materia.id === mallaId);
        return [...new Set(entry?.schedulableSections.map((section) => section.materiaId) || [])];
      })
      .filter((group) => group.length > 0);
    setProposals(
      generateSemesterSchedules({
        materiaIds: materiaIdGroups.flat(),
        materiaIdGroups,
        maxSubjects: 7,
        preferredShift: shift || undefined,
        freeDay: freeDay || undefined,
        maxDays: 6,
        allowOverlap: false,
      }),
    );
  }

  function apply(proposal: ScheduleProposal) {
    if (
      !confirm(
        "¿Aplicar esta propuesta al horario actual? Tus notas y registros de asistencia no se eliminarán.",
      )
    )
      return;
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
          Seleccioná las materias y tus preferencias. Se usarán únicamente las secciones reales del
          periodo.
        </p>
        <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-2">
          {offered.map(({ materia, sections, schedulableSections }) => (
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
                    ? `${schedulableSections.length} sección${schedulableSections.length === 1 ? "" : "es"} con horario`
                    : `${sections.length} sección${sections.length === 1 ? "" : "es"} · horario pendiente de confirmación`}
                </small>
              </span>
            </label>
          ))}
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
          disabled={!selected.length}
          onClick={generate}
          className="mt-4 w-full rounded-xl bg-primary p-3 font-medium text-primary-foreground disabled:opacity-40"
        >
          Generar alternativas
        </button>
      </section>

      <section className="space-y-4">
        {!proposals.length && (
          <div className="pp-panel rounded-2xl p-8 text-center text-muted-foreground">
            Elegí materias y generá alternativas para compararlas acá.
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
                Puntuación {proposal.score}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <b className="block text-lg">{proposal.sections.length}</b>materias
              </div>
              <div>
                <b className="block text-lg">{proposal.days}</b>días
              </div>
              <div>
                <b className="block text-lg">{Math.round(proposal.weeklyMinutes / 60)} h</b>
                semanales
              </div>
              <div>
                <b className="block text-lg">{proposal.conflicts}</b>conflictos
              </div>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {proposal.sections.map((section) => (
                <li key={section.id} className="rounded-xl border border-border p-3 text-sm">
                  <b>{section.materia}</b>
                  <span className="block text-xs text-muted-foreground">
                    Sección {section.seccion} · {section.turno}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => apply(proposal)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Check className="h-4 w-4" /> Aplicar al horario
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
