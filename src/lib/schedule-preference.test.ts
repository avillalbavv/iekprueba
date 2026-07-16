import assert from "node:assert/strict";
import test from "node:test";
import { preferSectionsByShift } from "./schedule-preference.ts";

test("una sección de mañana excluye alternativas de tarde y noche", () => {
  const sections = [{ turno: "T" }, { turno: "M" }, { turno: "N" }];
  assert.deepEqual(preferSectionsByShift(sections, "M"), [{ turno: "M" }]);
});

test("usa otros turnos solamente si la preferencia no está ofertada", () => {
  const sections = [{ turno: "T" }, { turno: "N" }];
  assert.deepEqual(preferSectionsByShift(sections, "M"), [{ turno: "T" }]);
});

test("desde la noche el turno alternativo más cercano es la tarde", () => {
  const sections = [{ turno: "M" }, { turno: "T" }];
  assert.deepEqual(preferSectionsByShift(sections, "N"), [{ turno: "T" }]);
});

test("desde la tarde conserva mañana y noche si ambas están a igual distancia", () => {
  const sections = [{ turno: "M" }, { turno: "N" }];
  assert.deepEqual(preferSectionsByShift(sections, "T"), sections);
});
