import assert from "node:assert/strict";
import test from "node:test";
import { compareScheduleDatasets } from "./schedule-dataset-diff.ts";
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
