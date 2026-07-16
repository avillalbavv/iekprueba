import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePep,
  calculateRp,
  calculateStageScore,
  gradeFromRp,
  getFinalGrade,
  getRequiredFinalExamScore,
  parseAcademicNumber,
  roundFinalAcademicResult,
} from "./calculadora-notas.ts";

test("normaliza punto y coma decimal sin aceptar texto parcial", () => {
  assert.equal(parseAcademicNumber("50,5"), 50.5);
  assert.equal(parseAcademicNumber("50.5"), 50.5);
  assert.equal(parseAcademicNumber("-1"), -1);
  assert.equal(parseAcademicNumber("50abc"), null);
  assert.equal(parseAcademicNumber("1,2.3"), null);
  assert.equal(parseAcademicNumber(""), null);
});

test("aplica el redondeo únicamente al resultado final", () => {
  assert.equal(roundFinalAcademicResult(59.499), 59);
  assert.equal(roundFinalAcademicResult(59.5), 60);
  assert.equal(roundFinalAcademicResult(60.004), 60);
  assert.equal(roundFinalAcademicResult(60.005), 60);
  assert.equal(roundFinalAcademicResult(60.499), 60);
  assert.equal(roundFinalAcademicResult(60.5), 61);
});

test("respeta los límites de la escala luego del redondeo final", () => {
  assert.equal(gradeFromRp(59.499), 1);
  assert.equal(gradeFromRp(59.5), 2);
  assert.equal(gradeFromRp(70.499), 2);
  assert.equal(gradeFromRp(70.5), 3);
  assert.equal(gradeFromRp(90.5), 5);
});

test("conserva precisión en PPEP, PEP y RP intermedios", () => {
  const stage1 = calculateStageScore(60.005, [{ nota: 70.005, porcentaje: 100 }]);
  const stage2 = calculateStageScore(80.005, [{ nota: 90.005, porcentaje: 100 }]);
  assert.equal(stage1, 65.005);
  assert.equal(stage2, 85.005);
  const pep = calculatePep(stage1!, stage2!);
  assert.equal(pep, 75.005);
  assert.ok(Math.abs(calculateRp(50.005, pep) - 65.005) < 1e-10);
});

test("rechaza actividades incompletas y acepta cero", () => {
  assert.equal(calculateStageScore(0, []), 0);
  assert.equal(calculateStageScore(50, [{ nota: 100, porcentaje: 99.9 }]), null);
  assert.equal(
    calculateStageScore(50, [
      { nota: 60, porcentaje: 50 },
      { nota: 80, porcentaje: 50 },
    ]),
    60,
  );
});

test("resuelve la regresión PEP 85,63 y examen final 73", () => {
  const pep = 85.63;
  assert.ok(Math.abs(calculateRp(73, pep) - 80.578) < 1e-10);
  assert.equal(roundFinalAcademicResult(calculateRp(73, pep)), 81);
  assert.equal(getFinalGrade(73, pep), 4);
  assert.equal(getRequiredFinalExamScore(pep, 4), 72.9);
  assert.equal(getFinalGrade(72.8, pep), 3);
  assert.equal(getFinalGrade(72.9, pep), 4);
});

test("el cálculo inverso usa el mismo motor que el cálculo directo", () => {
  for (const pep of [0, 49.9, 50, 59.49, 59.5, 60, 70.51, 85.63, 99.9, 100]) {
    for (const target of [2, 3, 4, 5]) {
      const required = getRequiredFinalExamScore(pep, target);
      if (required === null) {
        assert.ok(getFinalGrade(100, pep) < target);
        continue;
      }
      assert.ok(getFinalGrade(required, pep) >= target);
      if (required > 50)
        assert.ok(getFinalGrade(Number((required - 0.1).toFixed(1)), pep) < target);
    }
  }
});

test("aplica de forma independiente el mínimo obligatorio del examen final", () => {
  assert.equal(getFinalGrade(49.9, 100), 1);
  assert.ok(getFinalGrade(50, 100) >= 2);
  assert.ok(getFinalGrade(50.1, 100) >= 2);
  assert.ok(getFinalGrade(99.9, 100) >= 2);
  assert.equal(getFinalGrade(100, 100), 5);
});
