import assert from "node:assert/strict";
import test from "node:test";
import { parseScheduleRows } from "./schedule-import-parser.ts";

test("procesa una planilla académica y conserva departamento, clases y examen", () => {
  const sections = parseScheduleRows([
    [
      "Materia",
      "Sección",
      "Turno",
      "Plan",
      "Semestre",
      "Departamento",
      "Lunes",
      "1er parcial fecha",
      "1er parcial hora",
      "1er parcial aula",
    ],
    ["Álgebra", "A", "M", "2008", "1", "DCB", "07:30 - 09:45 | A55", "01/09/26", "18:00", "A55"],
  ]);

  assert.equal(sections.length, 1);
  assert.equal(sections[0].departamento, "DCB");
  assert.deepEqual(sections[0].clases, [{ dia: "Lunes", hora: "07:30 - 09:45", aula: "A55" }]);
  assert.equal(sections[0].examenes.parcial1?.aula, "A55");
});

test("rechaza planillas sin las columnas académicas mínimas", () => {
  assert.throws(() =>
    parseScheduleRows([
      ["Nombre", "Correo"],
      ["Ana", "a@b.com"],
    ]),
  );
});

test("combina encabezados agrupados de exámenes", () => {
  const sections = parseScheduleRows([
    ["Materia", "Sección", "Turno", "1er parcial", "", ""],
    ["", "", "", "Fecha", "Hora", "Aula"],
    ["Física I", "B", "T", "05/09/26", "14:00", "A12"],
  ]);
  assert.equal(sections[0].examenes.parcial1?.dia, "05/09/26");
  assert.equal(sections[0].examenes.parcial1?.hora, "14:00");
  assert.equal(sections[0].examenes.parcial1?.aula, "A12");
});
