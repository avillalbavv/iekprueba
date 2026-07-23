import assert from "node:assert/strict";
import test from "node:test";
import { compareScheduleDatasets, mergeSchedulePlans } from "./schedule-dataset-diff.ts";
import type { Seccion } from "./poliplanner.ts";

function section(patch: Partial<Seccion> = {}): Seccion {
  return {
    id: "old-section-id",
    departamento: "DEE",
    materiaId: "",
    nombreNormalizado: "",
    carrera: "IEK",
    plan: "2008",
    materia: "Electrónica I",
    seccion: "TQ",
    turno: "T",
    nivel: "4",
    semGrupo: "4",
    enfasis: "",
    docente: { titulo: "Ing.", apellido: "Pérez", nombre: "Ana", correo: "" },
    clases: [{ dia: "Lunes", hora: "17:30 - 19:45", aula: "F16" }],
    examenes: {},
    mesaExaminadora: { presidente: "", miembro1: "", miembro2: "" },
    ...patch,
  };
}

test("conserva ids y detecta solamente las secciones académicas modificadas", () => {
  const previous = [section()];
  const next = [
    section({
      id: "generated-id",
      materia: "Electrónica I (*)",
      clases: [{ dia: "Lunes", hora: "17:30 - 19:45", aula: "F18" }],
    }),
  ];
  const delta = compareScheduleDatasets(previous, next);
  assert.equal(delta.sections[0].id, "old-section-id");
  assert.equal(delta.changed, 1);
  assert.equal(delta.added, 0);
  assert.equal(delta.removed, 0);
  assert.deepEqual(delta.affectedSectionIds, ["old-section-id"]);
});

test("un archivo idéntico no genera cambios ni notificaciones afectadas", () => {
  const delta = compareScheduleDatasets([section()], [section({ id: "generated-id" })]);
  assert.equal(delta.unchanged, 1);
  assert.equal(delta.changed + delta.added + delta.removed, 0);
  assert.deepEqual(delta.affectedSectionIds, []);
});

test("una actualización reemplaza su plan y conserva las demás mallas", () => {
  const old2008 = section();
  const plan2026 = section({
    id: "plan-2026",
    plan: "2026",
    materia: "Fundamentos de Mecánica",
  });
  const updated2008 = section({ id: "new-2008", clases: [] });
  const merged = mergeSchedulePlans([old2008, plan2026], [updated2008]);

  assert.equal(merged.length, 2);
  assert.equal(
    merged.some((entry) => entry.id === "plan-2026"),
    true,
  );
  assert.equal(
    merged.some((entry) => entry.id === "old-section-id"),
    false,
  );
  assert.equal(
    merged.some((entry) => entry.id === "new-2008"),
    true,
  );
});
