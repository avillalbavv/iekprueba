export interface ShiftedSection {
  turno: string;
}

export type AcademicShift = "M" | "T" | "N";

const SHIFT_POSITION: Record<AcademicShift, number> = { M: 0, T: 1, N: 2 };

export function shiftDistance(turno: string, preferredShift?: AcademicShift): number {
  if (!preferredShift || !(turno in SHIFT_POSITION)) return 0;
  return Math.abs(SHIFT_POSITION[turno as AcademicShift] - SHIFT_POSITION[preferredShift]);
}

/**
 * Devuelve las secciones del turno más cercano al solicitado: noche cae a
 * tarde antes que mañana, y mañana cae a tarde antes que noche.
 */
export function preferSectionsByShift<T extends ShiftedSection>(
  sections: T[],
  preferredShift?: AcademicShift,
): T[] {
  if (!preferredShift) return sections;
  const closestDistance = Math.min(
    ...sections.map((section) => shiftDistance(section.turno, preferredShift)),
  );
  return sections.filter(
    (section) => shiftDistance(section.turno, preferredShift) === closestDistance,
  );
}
