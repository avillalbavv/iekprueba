/**
 * search.ts — Normalización de texto para búsqueda tolerante a tildes,
 * mayúsculas, espacios, números romanos y errores de tipeo menores.
 * Usado por /aulas (búsqueda por materia/profesor) y por el enlace entre
 * la malla curricular y las secciones ofertadas (src/lib/poliplanner.ts).
 */

const ROMAN_TO_ARABIC: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
  x: "10",
};
const ARABIC_TO_ROMAN: Record<string, string> = Object.fromEntries(
  Object.entries(ROMAN_TO_ARABIC).map(([roman, num]) => [num, roman]),
);

/** Quita tildes/diacríticos, pasa a minúsculas y colapsa espacios/puntuación. */
export function normalizeBasic(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normaliza un texto para comparación difusa: además de normalizeBasic,
 * convierte el último token si es un número romano I–X a su equivalente
 * arábigo (para que "Física I" y "Física 1" se traten igual).
 */
export function normalizeSearch(s: string): string {
  const base = normalizeBasic(s);
  const tokens = base.split(" ");
  const last = tokens[tokens.length - 1];
  if (last in ROMAN_TO_ARABIC) tokens[tokens.length - 1] = ROMAN_TO_ARABIC[last];
  return tokens.join(" ");
}

/** Genera variantes (con número romano y arábigo) para mejorar el recall de Fuse.js. */
export function searchVariants(s: string): string[] {
  const base = normalizeBasic(s);
  const tokens = base.split(" ");
  const last = tokens[tokens.length - 1];
  const variants = new Set([base]);
  if (last in ROMAN_TO_ARABIC)
    variants.add([...tokens.slice(0, -1), ROMAN_TO_ARABIC[last]].join(" "));
  if (last in ARABIC_TO_ROMAN)
    variants.add([...tokens.slice(0, -1), ARABIC_TO_ROMAN[last]].join(" "));
  return [...variants];
}

/** Prioridad solicitada: exacta, comienzo, parcial y luego relacionada. */
export function searchRank(nombre: string, query: string): number {
  const n = normalizeSearch(nombre);
  const q = normalizeSearch(query);
  if (!q || n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q)) return 2;
  return 3;
}

/** Normaliza sin borrar partes significativas del nombre oficial. */
export function normalizeAcademicName(nombre: string): string {
  return normalizeSearch(nombre.replace(/\s*\(\s*\*+\s*\)\s*$/u, ""));
}
