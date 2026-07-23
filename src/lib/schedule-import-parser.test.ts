import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  analyzeScheduleFile,
  mergeLaboratoryGroups,
  parseLaboratoryRows,
  parseScheduleRows,
} from "./schedule-import-parser.ts";

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

test("interpreta el formato 2026 y enlaza el plantel de la hoja Docentes", async () => {
  const workbook = new ExcelJS.Workbook();
  const schedule = workbook.addWorksheet("IEK");
  schedule.addRows([
    [
      "",
      "ASIGNATURA",
      "ASIGNATURA",
      "ASIGNATURA",
      "ASIGNATURA",
      "CARRERA",
      "CARRERA",
      "",
      "",
      "Evaluación primera etapa",
      "Evaluación segunda etapa",
      "1er. Final",
      "1er. Final",
      "1er. Final",
      "",
      "",
    ],
    [
      "Item",
      "DPTO.",
      "Asignatura",
      "Nivel",
      "Sem/Grupo",
      "Sigla carrera",
      "Plan",
      "Turno",
      "Sección",
      "Día",
      "Día",
      "Día",
      "Hora",
      "AULA",
      "AULA",
      "Lunes",
    ],
    [
      1,
      "DCB",
      "Fundamentos de Mecánica (**)",
      1,
      1,
      "IEK",
      2026,
      "M",
      "X",
      "Mie 09/09/26",
      "Mie 04/11/26",
      "Lun 30/11/26",
      "08:00",
      "",
      "",
      "09:45 - 11:45",
    ],
  ]);
  const teachers = workbook.addWorksheet("Docentes");
  teachers.addRows([
    ["Sede", "Dpto", "Asignatura", "Carrera", "Plan", "Turno", "Docente"],
    [
      "San Lorenzo",
      "DCB",
      "Fundamentos de Mecánica",
      "IEK",
      2026,
      "M",
      "A CONFIRMAR A CONFIRMAR - Crispín Vargas - Juan Fatecha",
    ],
  ]);
  const bytes = await workbook.xlsx.writeBuffer();
  const result = await analyzeScheduleFile(
    new File([bytes], "horario-2026.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );

  assert.equal(result.totalSections, 1);
  assert.equal(result.sections[0].plan, "2026");
  assert.equal(result.sections[0].docenteEsPlantel, true);
  assert.equal(result.sections[0].modoSeleccion, "opcion");
  assert.equal(result.sections[0].docente.nombre, "Crispín Vargas · Juan Fatecha");
  assert.equal(result.sections[0].examenes.parcial1?.dia, "Mie 09/09/26");
  assert.equal(result.sections[0].examenes.parcial2?.dia, "Mie 04/11/26");
});

test("el formato 2008 permite elegir por turno sin depender de una sección", async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("IEK").addRows([
    ["Asignatura", "Sigla carrera", "Plan", "Turno", "Lunes"],
    ["Cálculo I", "IEK", 2008, "N", "20:00 - 22:15"],
  ]);
  workbook.addWorksheet("Docentes").addRows([
    ["Asignatura", "Carrera", "Plan", "Turno", "Docente"],
    ["Cálculo I", "IEK", 2008, "N", "Prof. Ada Lovelace"],
  ]);
  const bytes = await workbook.xlsx.writeBuffer();
  const result = await analyzeScheduleFile(
    new File([bytes], "horario-2008.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );

  assert.equal(result.totalSections, 1);
  assert.equal(result.sections[0].seccion, "N");
  assert.equal(result.sections[0].turno, "N");
  assert.equal(result.sections[0].modoSeleccion, "turno");
  assert.equal(result.sections[0].docenteEsPlantel, true);
  assert.equal(result.sections[0].docente.nombre, "Prof. Ada Lovelace");
});

test("integra los grupos T1 y T2 sin duplicar filas del laboratorio", () => {
  const header = Array(66).fill("");
  const first = Array(66).fill("");
  const duplicate = Array(66).fill("");
  header[1] = "Asignatura";
  header[14] = "Carrera";
  header[16] = "Plan";
  header[20] = "Turno";
  header[38] = "PROF. DE LABORATORIO";
  header[55] = "Lunes";
  header[59] = "Miércoles";
  header[63] = "Viernes";
  for (const row of [first, duplicate]) {
    row[1] = "Fundamentos de Mecánica";
    row[14] = "IEK";
    row[16] = "2026";
    row[20] = "M";
    row[38] = "A CONFIRMAR";
    row[59] = "13:30 - 17:45 (T1)";
    row[63] = "13:30 - 17:45 (T2)";
  }
  const groups = parseLaboratoryRows([header, first, duplicate]);
  assert.equal(groups.length, 2);

  const base = parseScheduleRows([
    ["Materia", "Sección", "Turno", "Plan", "Sigla carrera", "Lunes"],
    ["Fundamentos de Mecánica (**)", "X", "M", "2026", "IEK", "09:45 - 11:45"],
  ]);
  const merged = mergeLaboratoryGroups(base, groups);
  assert.deepEqual(merged.map((section) => section.laboratorio?.grupo).sort(), ["T1", "T2"]);
  assert.equal(
    merged.every(
      (section) => section.clases.filter((clase) => clase.tipo === "laboratorio").length === 1,
    ),
    true,
  );
});
