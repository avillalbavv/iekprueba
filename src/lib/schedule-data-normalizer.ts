import type { Seccion } from "./poliplanner.ts";
import { normalizeAcademicName } from "./search.ts";

const SEMESTRES_CORREGIDOS: Record<string, number> = {
  "dibujo tecnico": 2,
  quimica: 2,
  "diseno asistido por computadora": 3,
};

function materiaIdEstable(materia: string, semestre: string | number, plan: string): string {
  const limpio = normalizeAcademicName(materia).replace(/\s+/g, "-");
  const planLimpio = normalizeAcademicName(plan).replace(/\s+/g, "-") || "sin-plan";
  return `iek-plan-${planLimpio}-${String(semestre).trim() || "sin-semestre"}-${limpio}`;
}

export function normalizeScheduleData(
  source: Omit<Seccion, "materiaId" | "nombreNormalizado">[] | Seccion[],
): Seccion[] {
  return source
    .filter((section) => section.materia)
    .map((section) => {
      const nombreNormalizado = normalizeAcademicName(section.materia);
      const semGrupo = SEMESTRES_CORREGIDOS[nombreNormalizado] ?? section.semGrupo;
      return {
        ...section,
        semGrupo,
        materiaId: materiaIdEstable(section.materia, semGrupo, section.plan),
        nombreNormalizado,
      };
    });
}
