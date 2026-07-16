import assert from "node:assert/strict";
import test from "node:test";
import {
  calcularStats,
  generarFechasClase,
  LAB_RECUPERACION_MAXIMA_PCT,
  UMBRAL_PRIMERA_CONVOCATORIA,
  UMBRAL_SEGUNDA_CONVOCATORIA,
  type Materia,
} from "./asistencia.ts";

const materia = (asistencias: Materia["asistencias"] = {}): Materia => ({
  id: "test-materia",
  nombre: "Electrónica I",
  carrera: "IEK",
  docente: "Docente",
  dias: ["Lunes"],
  asistencias,
  practicasLab: null,
});

test("la asistencia comienza en cero sin clases marcadas", () => {
  const stats = calcularStats(materia());
  assert.equal(stats.porcentajeActual, 0);
  assert.equal(stats.presentes, 0);
  assert.equal(stats.faltasConsumidas, 0);
});

test("la asistencia aumenta solamente según las marcas del alumno", () => {
  const [first, second] = generarFechasClase(["Lunes"]);
  assert.equal(calcularStats(materia({ [first]: "presente" })).porcentajeActual, 100);
  assert.equal(
    calcularStats(materia({ [first]: "presente", [second]: "ausente" })).porcentajeActual,
    50,
  );
});

test("una clase justificada es neutral para el porcentaje", () => {
  const [first, second] = generarFechasClase(["Lunes"]);
  assert.equal(
    calcularStats(materia({ [first]: "presente", [second]: "justificada" })).porcentajeActual,
    100,
  );
});

test("respeta las fechas sabatinas específicas informadas por el Excel", () => {
  assert.deepEqual(generarFechasClase(["Sábado"], { Sábado: ["2026-08-22", "2026-10-03"] }), [
    "2026-08-22",
    "2026-10-03",
  ]);
});

test("no existe un umbral inferior exclusivo para la segunda convocatoria", () => {
  assert.equal(UMBRAL_PRIMERA_CONVOCATORIA, 70);
  assert.equal(UMBRAL_SEGUNDA_CONVOCATORIA, 70);
});

test("laboratorio admite como máximo 30 por ciento de recuperación por etapa", () => {
  assert.equal(LAB_RECUPERACION_MAXIMA_PCT, 30);
  const conLaboratorio: Materia = {
    ...materia(),
    practicasLab: { total: 10, asistidas: 7, recuperadas: 3 },
  };
  const stats = calcularStats(conLaboratorio);
  assert.equal(stats.labStats?.recuperacionMaxima, 3);
  assert.equal(stats.labStats?.habilitado, true);
});
