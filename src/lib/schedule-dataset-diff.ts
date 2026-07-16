import type { Seccion } from "./poliplanner.ts";
import { normalizeScheduleData } from "./schedule-data-normalizer.ts";

function canonicalList(value: string): string {
  return value
    .split(/[,;/]/)
    .map((item) => item.trim())
    .filter((item) => item && !/^[-\s]+$/.test(item))
    .sort((a, b) => a.localeCompare(b, "es"))
    .join(",");
}

export interface ScheduleDatasetDelta {
  sections: Seccion[];
  added: number;
  changed: number;
  removed: number;
  unchanged: number;
  affectsAll: boolean;
  affectedSubjectIds: string[];
  affectedSectionIds: string[];
}

function sectionIdentity(section: Seccion): string {
  return [
    section.plan,
    section.carrera,
    section.nombreNormalizado,
    section.seccion,
    section.turno,
    canonicalList(section.enfasis),
  ].join("|");
}

function sectionSignature(section: Seccion): string {
  return JSON.stringify({
    departamento: section.departamento || "",
    materia: section.nombreNormalizado,
    carrera: section.carrera,
    plan: section.plan,
    seccion: section.seccion,
    turno: section.turno,
    nivel: section.nivel,
    semGrupo: section.semGrupo,
    enfasis: section.enfasis,
    docente: section.docente,
    clases: section.clases,
    examenes: section.examenes,
    mesaExaminadora: section.mesaExaminadora,
  });
}

export function compareScheduleDatasets(
  previousSource: Seccion[],
  nextSource: Seccion[],
): ScheduleDatasetDelta {
  const previous = normalizeScheduleData(previousSource);
  const previousByIdentity = new Map(
    previous.map((section) => [sectionIdentity(section), section]),
  );
  const sections = normalizeScheduleData(nextSource).map((section) => {
    const existing = previousByIdentity.get(sectionIdentity(section));
    return existing ? { ...section, id: existing.id } : section;
  });
  const previousById = new Map(previous.map((section) => [section.id, section]));
  const nextById = new Map(sections.map((section) => [section.id, section]));
  const affectedSectionIds = new Set<string>();
  const affectedSubjectIds = new Set<string>();
  let added = 0;
  let changed = 0;
  let removed = 0;
  let unchanged = 0;

  for (const section of sections) {
    const old = previousById.get(section.id);
    if (!old) {
      added += 1;
      affectedSectionIds.add(section.id);
      affectedSubjectIds.add(section.materiaId);
    } else if (sectionSignature(old) !== sectionSignature(section)) {
      changed += 1;
      affectedSectionIds.add(section.id);
      affectedSubjectIds.add(section.materiaId);
    } else unchanged += 1;
  }
  for (const section of previous) {
    if (nextById.has(section.id)) continue;
    removed += 1;
    affectedSectionIds.add(section.id);
    affectedSubjectIds.add(section.materiaId);
  }

  return {
    sections,
    added,
    changed,
    removed,
    unchanged,
    affectsAll: previous.length === 0,
    affectedSubjectIds: [...affectedSubjectIds].filter(Boolean),
    affectedSectionIds: [...affectedSectionIds],
  };
}
