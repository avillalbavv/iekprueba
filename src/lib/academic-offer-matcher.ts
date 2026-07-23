import { normalizeAcademicName } from "./search.ts";

const IGNORED_TOKENS = new Set(["de", "del", "la", "las", "los", "y"]);
const TOKEN_ALIASES: Record<string, string> = {
  proyectos: "proyecto",
  i: "1",
  ii: "2",
  iii: "3",
};

function canonicalTokens(value: string): string[] {
  return normalizeAcademicName(value)
    .split(" ")
    .filter((token) => token && !IGNORED_TOKENS.has(token))
    .map((token) => TOKEN_ALIASES[token] || token);
}

function canonical(value: string): string {
  return canonicalTokens(value).join(" ");
}

function withoutParenthetical(value: string): string {
  return value.replace(/\s*\([^)]*\)\s*/gu, " ");
}

/**
 * Compara el nombre oficial de la malla con el nombre proveniente del Excel.
 * Tolera marcadores (*), aclaraciones entre paréntesis, artículos y una lista
 * controlada de variantes, sin mezclar números de materia ni nombres parciales.
 */
export function academicNamesMatch(curriculumName: string, offeredName: string): boolean {
  const curriculum = canonical(curriculumName);
  const offered = canonical(offeredName);
  if (!curriculum || !offered) return false;
  if (curriculum === offered) return true;

  const curriculumBase = canonical(withoutParenthetical(curriculumName));
  const offeredBase = canonical(withoutParenthetical(offeredName));
  if (curriculumBase && curriculumBase === offeredBase) return true;

  // En el plan 2026, Optativa I y II aparecen en la malla como materias
  // genéricas, mientras que la oferta enumera cada alternativa concreta.
  if (/^optativa (1|2|3)$/u.test(curriculumBase)) {
    return offeredBase.startsWith(`${curriculumBase} `);
  }
  return false;
}
