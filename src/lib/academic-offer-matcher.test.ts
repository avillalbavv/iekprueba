import assert from "node:assert/strict";
import test from "node:test";
import { academicNamesMatch } from "./academic-offer-matcher.ts";

test("tolera marcadores y aclaraciones del Excel", () => {
  assert.equal(academicNamesMatch("Cálculo I", "Cálculo I (*)"), true);
  assert.equal(academicNamesMatch("Electrónica I", "Electrónica I (**)"), true);
  assert.equal(
    academicNamesMatch("Cálculo IV (Vectorial)", "Cálculo IV (Cálculo Vectorial)"),
    true,
  );
});

test("tolera variantes académicas controladas", () => {
  assert.equal(
    academicNamesMatch("Protocolos de la Comunicación I", "Protocolos de Comunicación I (*)"),
    true,
  );
  assert.equal(
    academicNamesMatch(
      "Proyectos de Sistemas Mecatrónicos II",
      "Proyecto de Sistemas Mecatrónicos II",
    ),
    true,
  );
});

test("no mezcla niveles ni materias con nombres parciales", () => {
  assert.equal(academicNamesMatch("Cálculo I", "Cálculo II"), false);
  assert.equal(academicNamesMatch("Dibujo Técnico", "Dibujo Técnico Mecánico"), false);
});

test("relaciona las optativas genéricas 2026 con sus alternativas concretas", () => {
  assert.equal(academicNamesMatch("Optativa I", "Optativa I - Inglés Básico"), true);
  assert.equal(
    academicNamesMatch("Optativa II", "Optativa II - Liderazgo y Emprendedorismo"),
    true,
  );
  assert.equal(academicNamesMatch("Optativa I", "Optativa II - Inglés Básico"), false);
});
