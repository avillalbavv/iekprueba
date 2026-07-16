export interface ShiftedSection {
  turno: string;
}

/**
 * La preferencia de turno es obligatoria cuando la materia tiene al menos una
 * sección válida en ese turno. Solo habilita otro turno como alternativa si
 * la oferta real no contiene la preferencia elegida.
 */
export function preferSectionsByShift<T extends ShiftedSection>(
  sections: T[],
  preferredShift?: "M" | "T" | "N",
): T[] {
  if (!preferredShift) return sections;
  const preferred = sections.filter((section) => section.turno === preferredShift);
  return preferred.length ? preferred : sections;
}
