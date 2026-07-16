import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { analyzeScheduleFile, parseScheduleRows } from "./schedule-import-parser.ts";

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

function officialRows(): unknown[][] {
  const group = Array(47).fill("");
  const header = Array(47).fill("");
  const regular = Array(47).fill("");
  const examOnly = Array(47).fill("");
  group.splice(15, 3, "1er. Parcial", "1er. Parcial", "1er. Parcial");
  group.splice(21, 3, "1er. Final", "1er. Final", "1er. Final");
  group.splice(24, 2, "Revisión", "Revisión");
  group.splice(26, 3, "2do. Final", "2do. Final", "2do. Final");
  group.splice(29, 2, "Revisión", "Revisión");
  group.splice(31, 3, "Mesa Examinadora", "Mesa Examinadora", "Mesa Examinadora");
  [
    "Item",
    "DPTO.",
    "Asignatura",
    "Nivel",
    "Sem/Grupo",
    "Sigla carrera",
    "Enfasis",
    "Plan",
    "Turno",
    "Sección",
    "Plataforma",
    "Tít",
    "Apellido",
    "Nombre",
    "Correo Institucional",
    "Día",
    "Hora",
    "AULA",
    "",
    "",
    "",
    "Día",
    "Hora",
    "AULA",
    "Día",
    "Hora",
    "Día",
    "Hora",
    "AULA",
    "Día",
    "Hora",
    "Presidente",
    "Miembro",
    "Miembro",
    "AULA",
    "Lunes",
    "AULA",
    "Martes",
    "AULA",
    "Miércoles",
    "AULA",
    "Jueves",
    "AULA",
    "Viernes",
    "AULA",
    "Sábado",
    "Fechas de clases de sábados",
  ].forEach((value, index) => (header[index] = value));
  regular.splice(
    0,
    15,
    1,
    "DEE",
    "Electrónica I (*)",
    4,
    4,
    "IEK",
    "",
    2008,
    "T",
    "TQ",
    "",
    "Ing.",
    "Pérez",
    "Ana",
    "ana@pol.una.py",
  );
  regular.splice(15, 3, "Lun 01/09/25", "18:00", "A55");
  regular.splice(21, 3, "Lun 24/11/25", "18:00", "A55");
  regular.splice(24, 2, "Lun 01/12/25", "19:00");
  regular.splice(26, 3, "Lun 15/12/25", "18:00", "A55");
  regular.splice(29, 2, "Lun 22/12/25", "19:00");
  regular.splice(31, 3, "Ing. Ana Pérez", "Ing. Uno", "Ing. Dos");
  regular[34] = "F16";
  regular[35] = "17:30 - 19:45";
  regular[44] = "I01";
  regular[45] = "08:00 - 10:00";
  regular[46] = "23/08, 04/10";
  examOnly.splice(
    0,
    15,
    2,
    "DEE",
    "Electrónica II",
    5,
    5,
    "IEK",
    "",
    2008,
    "N",
    "NA",
    "",
    "Ing.",
    "Gómez",
    "Luis",
    "luis@pol.una.py",
  );
  examOnly.splice(21, 3, "Mar 25/11/25", "20:00", "F18");
  return [group, header, regular, examOnly];
}

test("interpreta el formato oficial IEK y distingue oferta por horarios, no por asteriscos", () => {
  const sections = parseScheduleRows(officialRows() as Parameters<typeof parseScheduleRows>[0]);
  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0].clases, [
    { dia: "Lunes", hora: "17:30 - 19:45", aula: "F16" },
    {
      dia: "Sábado",
      hora: "08:00 - 10:00",
      aula: "I01",
      fechas: ["2025-08-23", "2025-10-04"],
    },
  ]);
  assert.equal(sections[0].examenes.revision1?.dia, "Lun 01/12/25");
  assert.equal(sections[0].examenes.revision2?.dia, "Lun 22/12/25");
  assert.equal(sections[0].docente.apellido, "Pérez");
  assert.equal(sections[0].departamento, "DEE");
  assert.equal(sections[0].clases.length > 0, true);
  assert.equal(sections[1].clases.length === 0, true);
});

test("selecciona exclusivamente la hoja IEK del libro oficial", async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("IAE").addRows(officialRows());
  workbook.addWorksheet("IEK").addRows(officialRows());
  const bytes = await workbook.xlsx.writeBuffer();
  const result = await analyzeScheduleFile(
    new File([bytes], "horario-oficial.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  assert.equal(result.sheetName, "IEK");
  assert.equal(result.totalSections, 2);
  assert.equal(result.offeredSections, 1);
  assert.equal(result.examOnlySections, 1);
});
