import {
  DATA,
  esSeccionSoloExamen,
  findScheduleConflicts,
  overlapMinutes,
  parseHora,
  type Seccion,
} from "./poliplanner.ts";
import { shiftDistanceToPreferences, type AcademicShift } from "./schedule-preference.ts";
export interface GeneratorPreferences {
  materiaIds: string[];
  materiaIdGroups?: string[][];
  maxSubjects?: number;
  blocked?: { day: string; start: number; end: number }[];
  preferredShift?: "M" | "T" | "N";
  preferredShifts?: AcademicShift[];
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
  requestedSubjects: number;
  freeDayConflicts: string[];
  shiftFallbacks: { subject: string; assignedShift: string; distance: number }[];
  explanation: string[];
}
type ScheduleCandidate = ReturnType<typeof metrics> & { sections: Seccion[] };
function preferredShifts(p: GeneratorPreferences): AcademicShift[] {
  if (p.preferredShifts?.length) return [...new Set(p.preferredShifts)];
  return p.preferredShift ? [p.preferredShift] : [];
}

function metrics(sections: Seccion[], p: GeneratorPreferences) {
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
    freeDayViolations: p.freeDay
      ? sections.filter((section) => section.clases.some((clase) => clase.dia === p.freeDay)).length
      : 0,
    shiftDistance: preferredShifts(p).length
      ? sections.reduce(
          (total, section) => total + shiftDistanceToPreferences(section.turno, preferredShifts(p)),
          0,
        )
      : 0,
  };
}
function valid(section: Seccion, p: GeneratorPreferences) {
  if (!section.clases.length || esSeccionSoloExamen(section)) return false;
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
  return available.sort((a, b) => {
    const aFreeDay = p.freeDay && a.clases.some((clase) => clase.dia === p.freeDay) ? 1 : 0;
    const bFreeDay = p.freeDay && b.clases.some((clase) => clase.dia === p.freeDay) ? 1 : 0;
    return (
      aFreeDay - bFreeDay ||
      shiftDistanceToPreferences(a.turno, preferredShifts(p)) -
        shiftDistanceToPreferences(b.turno, preferredShifts(p)) ||
      a.seccion.localeCompare(b.seccion, "es")
    );
  });
}

function candidateRank(sections: Seccion[], p: GeneratorPreferences): number {
  const value = metrics(sections, p);
  return (
    sections.length * 1_000_000 -
    value.conflicts * 500_000 -
    value.freeDayViolations * 100_000 -
    value.shiftDistance * 30_000 -
    value.gapMinutes * 5 -
    value.days * 300
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
        const value = metrics(next, p);
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
  const allGroups = p.materiaIdGroups?.length
    ? p.materiaIdGroups.map((group) => [...new Set(group)])
    : [...new Set(p.materiaIds)].map((id) => [id]);
  const groups = p.maxSubjects ? allGroups.slice(0, p.maxSubjects) : allGroups;
  const candidates = enumerate(groups, p)
    .filter((s) => s.length > 0)
    .map((sections) => ({ sections, ...metrics(sections, p) }))
    .filter(
      (x) =>
        (p.allowOverlap ? x.conflicts <= 1 : x.conflicts === 0) &&
        (!p.maxDays || x.days <= p.maxDays),
    );
  const profiles = [
    {
      label: "Horario recomendado",
      fn: (x: ScheduleCandidate) =>
        x.sections.length * 1_000_000 -
        x.conflicts * 500_000 -
        x.freeDayViolations * 100_000 -
        x.shiftDistance * 30_000 -
        x.gapMinutes * 8 -
        x.days * 300,
      explanation: "Prioriza todas tus materias y luego reduce las horas libres.",
    },
    {
      label: "Alternativa compacta",
      fn: (x: ScheduleCandidate) =>
        x.sections.length * 1_000_000 -
        x.conflicts * 500_000 -
        x.freeDayViolations * 100_000 -
        x.shiftDistance * 30_000 -
        x.gapMinutes * 15 -
        x.days * 100,
      explanation: "Mantiene tus prioridades y comprime todavía más las ventanas.",
    },
  ];
  const proposals = profiles
    .map((profile) => {
      const best = [...candidates].sort((a, b) => profile.fn(b) - profile.fn(a))[0];
      if (!best) return null;
      const missingSubjects = Math.max(0, groups.length - best.sections.length);
      const freeDayConflicts = p.freeDay
        ? best.sections
            .filter((section) => section.clases.some((clase) => clase.dia === p.freeDay))
            .map((section) => section.materia)
        : [];
      const acceptedShifts = preferredShifts(p);
      const shiftFallbacks = acceptedShifts.length
        ? best.sections
            .filter((section) => !acceptedShifts.includes(section.turno as AcademicShift))
            .map((section) => ({
              subject: section.materia,
              assignedShift: section.turno,
              distance: shiftDistanceToPreferences(section.turno, acceptedShifts),
            }))
        : [];
      return {
        id: profile.label.toLowerCase().replace(/\s/g, "-"),
        label: profile.label,
        score: Math.max(
          0,
          Math.min(
            100,
            100 -
              missingSubjects * 20 -
              best.freeDayViolations * 12 -
              best.shiftDistance * 6 -
              best.conflicts * 20,
          ),
        ),
        sections: best.sections,
        days: best.days,
        weeklyMinutes: best.weeklyMinutes,
        gapMinutes: best.gapMinutes,
        conflicts: best.conflicts,
        requestedSubjects: groups.length,
        freeDayConflicts: [...new Set(freeDayConflicts)],
        shiftFallbacks,
        explanation: [
          profile.explanation,
          `${best.sections.length} de ${groups.length} materias seleccionadas · ${Math.round(best.gapMinutes / 60)} h libres entre clases.`,
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
  return [...unique.values()].slice(0, 2);
}
