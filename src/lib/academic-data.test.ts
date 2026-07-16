import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeAcademicName, searchRank } from "./search.ts";

type AcademicRow = {
  id: string;
  materia: string;
  semGrupo: string | number;
  plan: string;
  seccion: string;
  turno: string;
  enfasis: string;
};

const rows = JSON.parse(
  readFileSync(new URL("../data/poliplanner-horario-2026.json", import.meta.url), "utf8"),
) as AcademicRow[];

test("la importación conserva 206 filas con identificadores únicos", () => {
  assert.equal(rows.length, 206);
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
});

test("Dibujo Técnico y Dibujo Técnico Mecánico permanecen separados", () => {
  const tecnico = rows.filter((row) => normalizeAcademicName(row.materia) === "dibujo tecnico");
  const mecanico = rows.filter(
    (row) => normalizeAcademicName(row.materia) === "dibujo tecnico mecanico",
  );
  assert.ok(tecnico.length > 0);
  assert.ok(mecanico.length > 0);
  assert.equal(
    new Set([...tecnico, ...mecanico].map((row) => row.id)).size,
    tecnico.length + mecanico.length,
  );
  assert.equal(searchRank("Dibujo Técnico", "Dibujo Técnico"), 0);
  assert.equal(searchRank("Dibujo Técnico Mecánico", "Dibujo Técnico"), 1);
});

test("los semestres académicos corregidos están en la fuente central", () => {
  const semesters = (name: string) =>
    new Set(
      rows
        .filter((row) => normalizeAcademicName(row.materia) === normalizeAcademicName(name))
        .map((row) => String(row.semGrupo)),
    );
  assert.deepEqual([...semesters("Dibujo Técnico")], ["2"]);
  assert.deepEqual([...semesters("Química")], ["2"]);
  assert.deepEqual([...semesters("Diseño Asistido por Computadora")], ["3"]);
});

test("los planes del Excel no se reemplazan por un valor fijo", () => {
  assert.deepEqual([...new Set(rows.map((row) => row.plan))].sort(), ["2008", "2013"]);
  const calculoTres = rows.filter((row) => row.materia === "Cálculo III");
  assert.deepEqual([...new Set(calculoTres.map((row) => row.plan))].sort(), ["2008", "2013"]);
});

test("la identidad académica compuesta no contiene duplicados", () => {
  const identities = rows.map((row) =>
    [
      normalizeAcademicName(row.materia),
      row.plan,
      row.seccion,
      row.turno,
      String(row.semGrupo),
      row.enfasis,
    ].join("::"),
  );
  assert.equal(new Set(identities).size, identities.length);
});

test("la delegación mantiene cargos y orden por apellido", () => {
  const source = readFileSync(new URL("../routes/delegacion.tsx", import.meta.url), "utf8");
  assert.match(source, /Univ\. Matías Benítez/);
  assert.match(source, /rol: "Delegado"/);
  const ordered = [
    "Ávalos",
    "Cáceres",
    "Echeverría",
    "Ferreira",
    "Florentín",
    "Lemir",
    "Martín",
    "Martínez",
    "Martínez",
    "Matiauda",
    "Mendoza",
    "Saldívar",
    "Villalba",
  ];
  let cursor = 0;
  for (const surname of ordered) {
    cursor = source.indexOf(surname, cursor);
    assert.notEqual(cursor, -1, `No se encontró ${surname} en el orden esperado`);
    cursor += surname.length;
  }
  assert.equal((source.match(/rol: "Miembro de Delegación"/g) ?? []).length, 14);
});
