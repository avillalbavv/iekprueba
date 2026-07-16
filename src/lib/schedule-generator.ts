import {
  DATA,
  findScheduleConflicts,
  overlapMinutes,
  parseHora,
  type Seccion,
} from "./poliplanner.ts";
import { preferSectionsByShift } from "./schedule-preference.ts";
export interface GeneratorPreferences {
  materiaIds: string[];
  materiaIdGroups?: string[][];
  maxSubjects?: number;
  blocked?: { day: string; start: number; end: number }[];
  preferredShift?: "M" | "T" | "N";
  freeDay?: string;
  maxDays?: number;
  allowOverlap?: boolean;
  maxOverlapMinutes?: number;
}
export interface ScheduleProposal {
  id: string;
  label: string;
  sections: Seccion[];
  score: number;
  days: number;
  weeklyMinutes: number;
  gapMinutes: number;
  conflicts: number;
  explanation: string[];
}
type ScheduleCandidate = ReturnType<typeof metrics> & { sections: Seccion[] };
function metrics(sections: Seccion[]) {
  const byDay = new Map<string, { start: number; end: number }[]>();
  let weeklyMinutes = 0;
  for (const s of sections)
    for (const c of s.clases) {
      const r = parseHora(c.hora);
      if (!r) continue;
      weeklyMinutes += r.end - r.start;
      byDay.set(c.dia, [...(byDay.get(c.dia) || []), r]);
    }
  let gapMinutes = 0;
  for (const ranges of byDay.values()) {
    ranges.sort((a, b) => a.start - b.start);
    for (let i = 1; i < ranges.length; i++)
      gapMinutes += Math.max(0, ranges[i].start - ranges[i - 1].end);
  }
  return {
    days: byDay.size,
    weeklyMinutes,
    gapMinutes,
    conflicts: findScheduleConflicts(sections).length,
  };
}
function valid(section: Seccion, p: GeneratorPreferences) {
  if (!section.clases.length) return false;
  if (p.freeDay && section.clases.some((c) => c.dia === p.freeDay)) return false;
  return !(p.blocked || []).some((b) =>
    section.clases.some((c) => {
      if (c.dia !== b.day) return false;
      const r = parseHora(c.hora);
      return r ? overlapMinutes(r, b) > 0 : false;
    }),
  );
}
function optionsForGroup(ids: string[], p: GeneratorPreferences): Seccion[] {
  const uniqueIds = new Set(ids);
  const available = DATA.filter((section) => uniqueIds.has(section.materiaId) && valid(section, p));
  return preferSectionsByShift(available, p.preferredShift);
}

function candidateRank(sections: Seccion[], p: GeneratorPreferences): number {
  const value = metrics(sections);
  const shiftMatches = p.preferredShift
    ? sections.filter((section) => section.turno === p.preferredShift).length
    : 0;
  return (
    sections.length * 100_000 +
    shiftMatches * 5_000 -
    value.conflicts * 50_000 -
    value.days * 500 -
    value.gapMinutes
  );
}

function enumerate(groups: string[][], p: GeneratorPreferences): Seccion[][] {
  const limit = 2_500;
  let candidates: Seccion[][] = [[]];
  for (const group of groups) {
    const options = optionsForGroup(group, p);
    const expanded: Seccion[][] = [];
    for (const current of candidates) {
      expanded.push(current);
      for (const option of options) {
        const next = [...current, option];
        const value = metrics(next);
        if (!p.allowOverlap && value.conflicts > 0) continue;
        if (p.maxDays && value.days > p.maxDays) continue;
        expanded.push(next);
      }
    }
    const deduplicated = new Map<string, Seccion[]>();
    for (const candidate of expanded) {
      const key = candidate
        .map((section) => section.id)
        .sort()
        .join("|");
      if (!deduplicated.has(key)) deduplicated.set(key, candidate);
    }
    candidates = [...deduplicated.values()]
      .sort((a, b) => candidateRank(b, p) - candidateRank(a, p))
      .slice(0, limit);
  }
  return candidates;
}
export function generateSemesterSchedules(p: GeneratorPreferences): ScheduleProposal[] {
  const groups = (
    p.materiaIdGroups?.length
      ? p.materiaIdGroups.map((group) => [...new Set(group)])
      : [...new Set(p.materiaIds)].map((id) => [id])
  ).slice(0, p.maxSubjects || 8);
  const fallbackGroups = p.preferredShift
    ? groups.filter((group) => {
        const ids = new Set(group);
        const validSections = DATA.filter(
          (section) => ids.has(section.materiaId) && valid(section, p),
        );
        return (
          validSections.length > 0 &&
          !validSections.some((section) => section.turno === p.preferredShift)
        );
      }).length
    : 0;
  const candidates = enumerate(groups, p)
    .filter((s) => s.length > 0)
    .map((sections) => ({ sections, ...metrics(sections) }))
    .filter(
      (x) =>
        (p.allowOverlap ? x.conflicts <= 1 : x.conflicts === 0) &&
        (!p.maxDays || x.days <= p.maxDays),
    );
  const profiles = [
    {
      label: "Opción equilibrada",
      fn: (x: ScheduleCandidate) =>
        x.sections.length * 1000 -
        x.days * 80 -
        x.gapMinutes -
        x.conflicts * 500 +
        (p.preferredShift
          ? x.sections.filter((s) => s.turno === p.preferredShift).length * 2_000
          : 0),
      explanation: "Equilibra materias, días y ventanas.",
    },
    {
      label: "Horario más compacto",
      fn: (x: ScheduleCandidate) => x.sections.length * 500 - x.gapMinutes * 3 - x.days * 30,
      explanation: "Minimiza horas libres entre clases.",
    },
    {
      label: "Menor cantidad de días",
      fn: (x: ScheduleCandidate) => x.sections.length * 500 - x.days * 400 - x.gapMinutes,
      explanation: "Concentra la cursada en menos días.",
    },
    {
      label: "Máxima cantidad de materias",
      fn: (x: ScheduleCandidate) => x.sections.length * 2000 - x.conflicts * 1000 - x.gapMinutes,
      explanation: "Incluye la mayor cantidad posible sin conflictos bloqueantes.",
    },
    ...(p.preferredShift
      ? [
          {
            label: `Preferencia ${p.preferredShift === "M" ? "mañana" : p.preferredShift === "T" ? "tarde" : "noche"}`,
            fn: (x: ScheduleCandidate) =>
              x.sections.length * 2_000 +
              x.sections.filter((section) => section.turno === p.preferredShift).length * 5_000 -
              x.gapMinutes -
              x.days * 50,
            explanation: "Maximiza las secciones disponibles en el turno elegido.",
          },
        ]
      : []),
  ];
  const proposals = profiles
    .map((profile) => {
      const best = [...candidates].sort((a, b) => profile.fn(b) - profile.fn(a))[0];
      if (!best) return null;
      return {
        id: profile.label.toLowerCase().replace(/\s/g, "-"),
        label: profile.label,
        score: Math.max(0, Math.round(profile.fn(best))),
        sections: best.sections,
        days: best.days,
        weeklyMinutes: best.weeklyMinutes,
        gapMinutes: best.gapMinutes,
        conflicts: best.conflicts,
        explanation: [
          profile.explanation,
          p.preferredShift
            ? `Prioriza el turno ${p.preferredShift}.${fallbackGroups ? ` ${fallbackGroups} materia(s) no tienen sección disponible en ese turno.` : ""}`
            : "Sin preferencia de turno obligatoria.",
        ],
      };
    })
    .filter((x): x is ScheduleProposal => Boolean(x));
  const unique = new Map<string, ScheduleProposal>();
  for (const proposal of proposals) {
    const signature = proposal.sections
      .map((section) => section.id)
      .sort()
      .join("|");
    if (!unique.has(signature)) unique.set(signature, proposal);
  }
  return [...unique.values()];
}
