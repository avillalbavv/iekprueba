export interface WeightedActivity {
  nota: number;
  porcentaje: number;
}

export const FINAL_EXAM_MINIMUM = 50;
export const FINAL_EXAM_INPUT_STEP = 0.1;

/** Acepta punto o coma decimal, pero rechaza texto parcial y formatos ambiguos. */
export function parseAcademicNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampAcademic(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/** Redondeo final de mitad hacia arriba. No se usa en cálculos intermedios. */
export function roundFinalAcademicResult(value: number): number {
  const corrected = Math.round(value * 1e8) / 1e8;
  const floor = Math.floor(corrected);
  return corrected - floor >= 0.5 ? Math.ceil(corrected) : floor;
}

export function calculateStageScore(
  partial: number,
  activities: WeightedActivity[],
): number | null {
  if (activities.length === 0) return clampAcademic(partial);
  const weight = activities.reduce((sum, activity) => sum + activity.porcentaje, 0);
  if (Math.abs(weight - 100) > 1e-8) return null;
  const otherActivities = activities.reduce(
    (sum, activity) => sum + activity.nota * (activity.porcentaje / 100),
    0,
  );
  return clampAcademic(0.5 * partial + 0.5 * otherActivities);
}

export function calculatePep(stage1: number, stage2: number): number {
  return (stage1 + stage2) / 2;
}

export function calculateRp(finalExam: number, pep: number): number {
  return clampAcademic(0.4 * finalExam + 0.6 * pep);
}

export function gradeFromRp(rp: number): number {
  const rounded = roundFinalAcademicResult(rp);
  if (rounded >= 91) return 5;
  if (rounded >= 81) return 4;
  if (rounded >= 71) return 3;
  if (rounded >= 60) return 2;
  return 1;
}

/** Aplica también el mínimo obligatorio del examen final. */
export function getFinalGrade(finalExam: number, pep: number): number {
  if (finalExam < FINAL_EXAM_MINIMUM) return 1;
  return gradeFromRp(calculateRp(finalExam, pep));
}

/**
 * Menor nota de examen final válida para alcanzar una calificación objetivo.
 * Recorre la misma granularidad que muestra la interfaz y valida cada candidato
 * con el motor directo completo: fórmula, redondeo, escala y mínimo de EF.
 */
export function getRequiredFinalExamScore(
  pep: number,
  targetGrade: number,
  step = FINAL_EXAM_INPUT_STEP,
): number | null {
  if (
    !Number.isFinite(pep) ||
    !Number.isFinite(step) ||
    step <= 0 ||
    targetGrade < 2 ||
    targetGrade > 5
  )
    return null;
  const firstUnit = Math.ceil(FINAL_EXAM_MINIMUM / step - 1e-10);
  const lastUnit = Math.floor(100 / step + 1e-10);
  for (let unit = firstUnit; unit <= lastUnit; unit++) {
    const candidate = Math.round(unit * step * 1e8) / 1e8;
    if (getFinalGrade(candidate, pep) >= targetGrade) return candidate;
  }
  return null;
}
