import type { ClaseInfo, Docente, ExamenInfo, Seccion } from "./poliplanner.ts";
import { normalizeAcademicName } from "./search.ts";
import ExcelJS from "exceljs";
import type { Cell as ExcelCell, CellValue, Worksheet } from "exceljs";

type Cell = string | number | boolean | Date | null | undefined;
type Row = Cell[];

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const EXAMS = ["parcial1", "parcial2", "final1", "revision1", "final2", "revision2"] as const;
const IEK_SHEET_NAMES = new Set(["iek", "ieca", "ingenieria en electronica"]);
const GENERIC_SUBHEADERS = new Set(["fecha", "dia", "hora", "aula", "presidente", "miembro"]);

const headerKey = (value: Cell) => normalizeAcademicName(String(value ?? ""));
const text = (value: Cell) => String(value ?? "").trim();

function column(headers: string[], aliases: string[]): number {
  const normalized = aliases.map(headerKey);
  for (const alias of normalized) {
    const exact = headers.findIndex((header) => header === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of normalized) {
    const partial = headers.findIndex(
      (header) => typeof header === "string" && header.includes(alias),
    );
    if (partial >= 0) return partial;
  }
  return -1;
}

function columns(headers: string[], aliases: string[]): number[] {
  const normalized = aliases.map(headerKey);
  return headers.flatMap((header, index) =>
    normalized.some((alias) => header === alias || header.includes(alias)) ? [index] : [],
  );
}

function valueAt(row: Row, headers: string[], aliases: string[]): string {
  const index = column(headers, aliases);
  return index >= 0 ? text(row[index]) : "";
}

function jsonCell<T>(value: string): T | null {
  if (!value || (!value.startsWith("{") && !value.startsWith("["))) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function stableId(parts: string[]): string {
  const source = parts.map(normalizeAcademicName).join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `iek-admin-${(hash >>> 0).toString(36)}`;
}

function cleanSubjectName(value: string): string {
  return value
    .replace(/\s*\(\s*\*+\s*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatTime(totalMinutes: number): string {
  const minutes = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function inferAcademicYear(rows: Row[]): number | null {
  for (const row of rows) {
    for (const value of row) {
      const source = text(value);
      const full = source.match(/periodo\s+academico\D*(20\d{2})/i);
      if (full) return Number(full[1]);
    }
  }
  for (const row of rows) {
    for (const value of row) {
      const source = text(value);
      const dated = source.match(/\b\d{1,2}\/\d{1,2}\/(\d{2,4})\b/);
      if (!dated) continue;
      const year = Number(dated[1]);
      return year < 100 ? 2000 + year : year;
    }
  }
  return null;
}

function parseSpecificDates(value: string, academicYear: number | null): string[] {
  if (!value || !academicYear) return [];
  return value
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .flatMap((entry) => {
      const match = entry.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
      if (!match) return [];
      const year = match[3]
        ? Number(match[3]) < 100
          ? 2000 + Number(match[3])
          : Number(match[3])
        : academicYear;
      return [`${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`];
    });
}

function excelCellValue(cell: ExcelCell): Cell {
  let value: CellValue = cell.value;
  if (value && typeof value === "object" && !(value instanceof Date) && "result" in value) {
    value = value.result ?? "";
  }
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (/h|m|s/i.test(cell.numFmt))
      return formatTime(value.getUTCHours() * 60 + value.getUTCMinutes());
    return new Intl.DateTimeFormat("es-PY", { timeZone: "UTC" }).format(value);
  }
  if (typeof value === "number" && value >= 0 && value < 1 && /h|m|s/i.test(cell.numFmt)) {
    return formatTime(value * 24 * 60);
  }
  if (typeof value !== "object") return value;
  if ("text" in value) return String(value.text);
  if ("richText" in value) return value.richText.map((item) => item.text).join("");
  return cell.text || String(value);
}

function worksheetRows(sheet: Worksheet): Row[] {
  const columnCount = Math.max(sheet.columnCount, 1);
  return Array.from({ length: sheet.rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, columnIndex) =>
      excelCellValue(sheet.getRow(rowIndex + 1).getCell(columnIndex + 1)),
    ),
  );
}

function isIekSheet(sheet: Worksheet): boolean {
  return IEK_SHEET_NAMES.has(headerKey(sheet.name));
}

function mergeListValues(left: string, right: string): string {
  const values = `${left},${right}`
    .split(/[,;/]/)
    .map((value) => value.trim())
    .filter((value) => value && !/^[-\s]+$/.test(value));
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "es")).join(",");
}

function mergeSections(left: Seccion, right: Seccion): Seccion {
  const sourceRows = [left.sourceRow, right.sourceRow].filter(
    (value): value is number => typeof value === "number",
  );
  const classes = new Map(
    [...left.clases, ...right.clases].map((item) => [
      `${headerKey(item.dia)}|${item.hora}|${headerKey(item.aula || "")}`,
      item,
    ]),
  );
  return {
    ...left,
    sourceRow: sourceRows.length ? Math.min(...sourceRows) : undefined,
    enfasis: mergeListValues(left.enfasis, right.enfasis),
    clases: [...classes.values()],
    examenes: { ...left.examenes, ...right.examenes },
    docente: left.docente.apellido || left.docente.nombre ? left.docente : right.docente,
    mesaExaminadora: {
      presidente: left.mesaExaminadora.presidente || right.mesaExaminadora.presidente,
      miembro1: left.mesaExaminadora.miembro1 || right.mesaExaminadora.miembro1,
      miembro2: left.mesaExaminadora.miembro2 || right.mesaExaminadora.miembro2,
    },
  };
}

function parseClasses(row: Row, headers: string[], academicYear: number | null): ClaseInfo[] {
  const serialized = valueAt(row, headers, ["clases", "horario json", "clases json"]);
  const parsed = jsonCell<ClaseInfo[]>(serialized);
  if (Array.isArray(parsed)) return parsed.filter((item) => item?.dia && item?.hora);

  const result: ClaseInfo[] = [];
  for (const day of DAYS) {
    const index = column(headers, [`${day} hora`, `hora ${day}`, `${day} horario`, day]);
    if (index < 0) continue;
    const roomIndex = column(headers, [`${day} aula`, `aula ${day}`]);
    const rooms = roomIndex >= 0 ? text(row[roomIndex]).split(/\n|;/) : [];
    const entries = text(row[index])
      .split(/\n|;/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    for (const [entryIndex, entry] of entries.entries()) {
      const match = entry.match(
        /(\d{1,2}:\d{2})\s*(?:-|–|—|a)\s*(\d{1,2}:\d{2})(?:\s*[|·,]\s*(.+))?/i,
      );
      if (match)
        result.push({
          dia: day,
          hora: `${match[1]} - ${match[2]}`,
          aula: match[3]?.trim() || rooms[entryIndex]?.trim() || rooms[0]?.trim() || null,
        });
    }
  }
  for (let slot = 1; slot <= 8; slot += 1) {
    const dia = valueAt(row, headers, [`dia clase ${slot}`, `clase ${slot} dia`, `dia ${slot}`]);
    const hora = valueAt(row, headers, [
      `hora clase ${slot}`,
      `clase ${slot} hora`,
      `horario ${slot}`,
    ]);
    const aula = valueAt(row, headers, [
      `aula clase ${slot}`,
      `clase ${slot} aula`,
      `aula ${slot}`,
    ]);
    if (dia && hora && !result.some((item) => item.dia === dia && item.hora === hora)) {
      result.push({ dia, hora, aula: aula || null });
    }
  }
  const saturdayDates = parseSpecificDates(
    valueAt(row, headers, [
      "fechas de clases de sabados turno noche",
      "fechas de clases de sabados",
    ]),
    academicYear,
  );
  if (saturdayDates.length > 0) {
    for (const item of result) {
      if (headerKey(item.dia) === headerKey("Sábado")) item.fechas = saturdayDates;
    }
  }
  return result;
}

function examAliases(exam: (typeof EXAMS)[number]): string[] {
  const labels: Record<(typeof EXAMS)[number], string[]> = {
    parcial1: ["parcial 1", "primer parcial", "1er parcial"],
    parcial2: ["parcial 2", "segundo parcial", "2do parcial"],
    final1: ["final 1", "primer final", "1er final"],
    revision1: ["revision 1", "primera revision"],
    final2: ["final 2", "segundo final", "2do final", "extraordinario"],
    revision2: ["revision 2", "segunda revision"],
  };
  return labels[exam];
}

function examField(
  row: Row,
  headers: string[],
  exam: (typeof EXAMS)[number],
  field: string,
): string {
  const aliases = examAliases(exam).flatMap((label) => [`${label} ${field}`, `${field} ${label}`]);
  return valueAt(row, headers, aliases);
}

function parseExams(row: Row, headers: string[]): Seccion["examenes"] {
  const serialized = valueAt(row, headers, ["examenes", "examenes json"]);
  const parsed = jsonCell<Seccion["examenes"]>(serialized);
  if (parsed && typeof parsed === "object") return parsed;
  const result: Seccion["examenes"] = {};
  for (const exam of EXAMS) {
    const dia = examField(row, headers, exam, "fecha") || examField(row, headers, exam, "dia");
    const hora = examField(row, headers, exam, "hora");
    const aula = examField(row, headers, exam, "aula");
    if (dia || hora || aula) result[exam] = { dia, hora, aula } satisfies ExamenInfo;
  }
  return result;
}

function parseTeacher(row: Row, headers: string[]): Docente {
  const serialized = valueAt(row, headers, ["docente json"]);
  const parsed = jsonCell<Docente>(serialized);
  if (parsed) return parsed;
  const fullName = valueAt(row, headers, ["docente", "profesor"]);
  return {
    titulo: valueAt(row, headers, ["titulo docente", "titulo profesor", "titulo", "tit"]),
    apellido:
      valueAt(row, headers, ["apellido docente", "apellido profesor", "apellido"]) || fullName,
    nombre: valueAt(row, headers, ["nombre docente", "nombre profesor", "nombre"]),
    correo: valueAt(row, headers, [
      "correo docente",
      "email docente",
      "correo profesor",
      "correo institucional",
    ]),
  };
}

function findHeaderRow(rows: Row[]): number {
  return rows.slice(0, 50).findIndex((row) => {
    const headers = row.map(headerKey);
    return column(headers, ["materia", "asignatura"]) >= 0 && column(headers, ["seccion"]) >= 0;
  });
}

function buildHeaders(rows: Row[], headerRow: number): { headers: string[]; dataStart: number } {
  const candidate = rows[headerRow] || [];
  const next = rows[headerRow + 1] || [];
  const nextKeys = next.map(headerKey);
  const hasSubheaders = nextKeys.filter((item) => GENERIC_SUBHEADERS.has(item)).length >= 2;
  const leaf = (hasSubheaders ? next : candidate).map(headerKey);
  const rawParent = (hasSubheaders ? candidate : rows[headerRow - 1] || []).map(headerKey);
  const parentKeys: string[] = [];
  const parentOccurrences = new Map<string, number>();
  let previousParent = "";
  let activeParent = "";

  for (let index = 0; index < Math.max(leaf.length, rawParent.length); index += 1) {
    let parent = rawParent[index] || "";
    if (hasSubheaders && !parent && GENERIC_SUBHEADERS.has(leaf[index] || "")) {
      parent = previousParent;
    }
    if (!parent) {
      parentKeys[index] = "";
      if (!hasSubheaders) previousParent = "";
      continue;
    }
    if (parent !== previousParent) {
      const occurrence = (parentOccurrences.get(parent) || 0) + 1;
      parentOccurrences.set(parent, occurrence);
      activeParent = parent === "revision" ? `revision ${occurrence}` : parent;
    }
    parentKeys[index] = activeParent;
    previousParent = parent;
  }

  const headers = leaf.map((leafHeader, index) => {
    const parent = parentKeys[index] || "";
    const effectiveLeaf = leafHeader || (hasSubheaders ? headerKey(candidate[index]) : "");
    const grouped = /parcial|final|revision|mesa examinadora/.test(parent);
    return parent && (GENERIC_SUBHEADERS.has(effectiveLeaf) || grouped)
      ? `${parent} ${effectiveLeaf}`.trim()
      : effectiveLeaf;
  });

  const dayKeys = new Map(DAYS.map((day) => [headerKey(day), day]));
  for (let index = 0; index < leaf.length; index += 1) {
    const day = dayKeys.get(leaf[index]);
    if (!day || parentKeys[index]) continue;
    headers[index] = `${headerKey(day)} hora`;
    if (index > 0 && leaf[index - 1] === "aula" && !parentKeys[index - 1]) {
      headers[index - 1] = `${headerKey(day)} aula`;
    }
  }

  return { headers, dataStart: headerRow + (hasSubheaders ? 2 : 1) };
}

export function parseScheduleRows(rows: Row[]): Seccion[] {
  const headerRow = findHeaderRow(rows);
  if (headerRow < 0) throw new Error("No se encontró una fila con las columnas Materia y Sección.");
  const { headers, dataStart } = buildHeaders(rows, headerRow);
  const academicYear = inferAcademicYear(rows);
  const result: Seccion[] = [];
  for (let index = dataStart; index < rows.length; index += 1) {
    const row = rows[index];
    const materia = valueAt(row, headers, ["materia", "asignatura"]);
    const seccion = valueAt(row, headers, ["seccion"]);
    if (!materia || !seccion) continue;
    const turno = valueAt(row, headers, ["turno"]);
    const plan = valueAt(row, headers, ["plan", "plan academico"]);
    const semGrupo = valueAt(row, headers, ["semestre", "sem grupo", "semgrupo"]);
    const carrera = valueAt(row, headers, ["sigla carrera", "carrera"]);
    const memberIndexes = columns(headers, ["mesa examinadora miembro", "miembro"]);
    result.push({
      id: stableId([
        plan,
        carrera,
        cleanSubjectName(materia),
        seccion,
        turno,
        mergeListValues("", valueAt(row, headers, ["enfasis", "orientacion"])),
      ]),
      sourceRow: index + 1,
      departamento: valueAt(row, headers, ["departamento", "dpto", "area"]),
      materiaId: "",
      nombreNormalizado: normalizeAcademicName(materia),
      carrera: carrera || "IEK",
      plan,
      materia,
      seccion,
      turno,
      nivel: valueAt(row, headers, ["nivel"]),
      semGrupo,
      enfasis: valueAt(row, headers, ["enfasis", "orientacion"]),
      docente: parseTeacher(row, headers),
      clases: parseClasses(row, headers, academicYear),
      examenes: parseExams(row, headers),
      mesaExaminadora: {
        presidente: valueAt(row, headers, ["mesa examinadora presidente", "presidente mesa"]),
        miembro1: memberIndexes[0] === undefined ? "" : text(row[memberIndexes[0]]),
        miembro2: memberIndexes[1] === undefined ? "" : text(row[memberIndexes[1]]),
      },
    });
  }
  if (!result.length) throw new Error("El archivo no contiene secciones utilizables.");
  if (result.length > 1500) throw new Error("El archivo supera el máximo de 1500 secciones.");
  return result;
}

export async function parseScheduleFile(file: File): Promise<Seccion[]> {
  return (await analyzeScheduleFile(file)).sections;
}

export interface ScheduleParseResult {
  sections: Seccion[];
  sheetName: string;
  totalSections: number;
  offeredSections: number;
  examOnlySections: number;
  warnings: string[];
}

export async function analyzeScheduleFile(file: File): Promise<ScheduleParseResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["xlsx", "csv"].includes(extension)) {
    throw new Error("Formato no permitido. Seleccioná un archivo XLSX o CSV.");
  }
  let sections: Seccion[] = [];
  let sheetName = "CSV";

  if (extension === "csv") {
    const source = await file.text();
    const delimiter =
      (source.split("\n", 1)[0].match(/;/g)?.length || 0) >
      (source.split("\n", 1)[0].match(/,/g)?.length || 0)
        ? ";"
        : ",";
    const rows = source.split(/\r?\n/).map((line) => {
      const cells: string[] = [];
      let current = "";
      let quoted = false;
      for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"' && line[index + 1] === '"' && quoted) {
          current += '"';
          index += 1;
        } else if (character === '"') quoted = !quoted;
        else if (character === delimiter && !quoted) {
          cells.push(current);
          current = "";
        } else current += character;
      }
      cells.push(current);
      return cells;
    });
    sections = parseScheduleRows(rows);
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet =
      workbook.worksheets.find((candidate) => headerKey(candidate.name) === "iek") ||
      workbook.worksheets.find(isIekSheet);
    if (!sheet) {
      throw new Error(
        "No se encontró la hoja IEK de Ingeniería en Electrónica. Verificá que el archivo sea el horario oficial de la FP-UNA.",
      );
    }
    sheetName = sheet.name;
    try {
      sections = parseScheduleRows(worksheetRows(sheet));
    } catch (error) {
      throw new Error(
        `No se pudo interpretar la hoja ${sheet.name}: ${error instanceof Error ? error.message : "formato desconocido"}`,
      );
    }
  }
  const iekSections = sections.filter((section) => {
    const career = headerKey(section.carrera);
    return !career || career === "iek" || career === "ieca";
  });
  const usefulSections = iekSections.filter(
    (section) => section.clases.length > 0 || Object.keys(section.examenes).length > 0,
  );
  if (!usefulSections.length) {
    throw new Error(
      `No se detectaron secciones utilizables en la hoja ${sheetName}. Deben existir horarios de clase o fechas de examen.`,
    );
  }
  const unique = new Map<string, Seccion>();
  for (const section of usefulSections) {
    const existing = unique.get(section.id);
    unique.set(section.id, existing ? mergeSections(existing, section) : section);
  }
  const parsed = [...unique.values()];
  const warnings: string[] = [];
  const incomplete = iekSections.length - usefulSections.length;
  const merged = usefulSections.length - parsed.length;
  const withoutDepartment = parsed.filter((section) => !section.departamento).length;
  const withoutTeacher = parsed.filter(
    (section) => !section.docente.apellido && !section.docente.nombre,
  ).length;
  if (incomplete > 0)
    warnings.push(
      `${incomplete} filas sin clases ni exámenes fueron ignoradas para evitar secciones fantasma.`,
    );
  if (merged > 0)
    warnings.push(
      `${merged} filas con identidad académica repetida fueron consolidadas sin perder horarios ni docentes.`,
    );
  if (withoutDepartment > 0)
    warnings.push(`${withoutDepartment} secciones no informan departamento en el archivo.`);
  if (withoutTeacher > 0)
    warnings.push(`${withoutTeacher} secciones no informan docente en el archivo.`);
  return {
    sections: parsed,
    sheetName,
    totalSections: parsed.length,
    offeredSections: parsed.filter((section) => section.clases.length > 0).length,
    examOnlySections: parsed.filter((section) => section.clases.length === 0).length,
    warnings,
  };
}
