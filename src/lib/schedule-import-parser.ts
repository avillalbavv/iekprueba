import type { ClaseInfo, Docente, ExamenInfo, Seccion } from "./poliplanner.ts";
import { normalizeAcademicName } from "./search.ts";
import type { CellValue } from "exceljs";

type Cell = string | number | boolean | Date | null | undefined;
type Row = Cell[];

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
const EXAMS = ["parcial1", "parcial2", "final1", "revision1", "final2", "revision2"] as const;

const headerKey = (value: Cell) => normalizeAcademicName(String(value ?? ""));
const text = (value: Cell) => String(value ?? "").trim();

function column(headers: string[], aliases: string[]): number {
  const normalized = aliases.map(headerKey);
  for (const alias of normalized) {
    const exact = headers.findIndex((header) => header === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of normalized) {
    const partial = headers.findIndex((header) => header.includes(alias));
    if (partial >= 0) return partial;
  }
  return -1;
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

function parseClasses(row: Row, headers: string[]): ClaseInfo[] {
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
      const match = entry.match(/(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})(?:\s*[|·,-]\s*(.+))?/);
      if (match)
        result.push({
          dia: day,
          hora: match[1],
          aula: match[2]?.trim() || rooms[entryIndex]?.trim() || rooms[0]?.trim() || null,
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
    titulo: valueAt(row, headers, ["titulo docente", "titulo profesor"]),
    apellido: valueAt(row, headers, ["apellido docente", "apellido profesor"]) || fullName,
    nombre: valueAt(row, headers, ["nombre docente", "nombre profesor"]),
    correo: valueAt(row, headers, ["correo docente", "email docente", "correo profesor"]),
  };
}

function findHeaderRow(rows: Row[]): number {
  return rows.slice(0, 30).findIndex((row) => {
    const headers = row.map(headerKey);
    return column(headers, ["materia", "asignatura"]) >= 0 && column(headers, ["seccion"]) >= 0;
  });
}

export function parseScheduleRows(rows: Row[]): Seccion[] {
  const headerRow = findHeaderRow(rows);
  if (headerRow < 0) throw new Error("No se encontró una fila con las columnas Materia y Sección.");
  let dataStart = headerRow + 1;
  const subheaders = rows[headerRow + 1]?.map(headerKey) || [];
  const hasSubheaders =
    subheaders.filter((item) => ["fecha", "dia", "hora", "aula"].includes(item)).length >= 2;
  let parent = "";
  const headers = rows[headerRow].map((value, index) => {
    const current = headerKey(value);
    if (current) parent = current;
    return hasSubheaders && subheaders[index] ? `${parent} ${subheaders[index]}`.trim() : current;
  });
  if (hasSubheaders) dataStart += 1;
  const result: Seccion[] = [];
  for (let index = dataStart; index < rows.length; index += 1) {
    const row = rows[index];
    const materia = valueAt(row, headers, ["materia", "asignatura"]);
    const seccion = valueAt(row, headers, ["seccion"]);
    if (!materia || !seccion) continue;
    const turno = valueAt(row, headers, ["turno"]);
    const plan = valueAt(row, headers, ["plan", "plan academico"]);
    const semGrupo = valueAt(row, headers, ["semestre", "sem grupo", "semgrupo"]);
    const carrera = valueAt(row, headers, ["carrera"]);
    result.push({
      id: stableId([plan, carrera, materia, seccion, turno]),
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
      clases: parseClasses(row, headers),
      examenes: parseExams(row, headers),
      mesaExaminadora: {
        presidente: valueAt(row, headers, ["presidente mesa", "presidente"]),
        miembro1: valueAt(row, headers, ["miembro 1", "miembro1"]),
        miembro2: valueAt(row, headers, ["miembro 2", "miembro2"]),
      },
    });
  }
  if (!result.length) throw new Error("El archivo no contiene secciones utilizables.");
  if (result.length > 1500) throw new Error("El archivo supera el máximo de 1500 secciones.");
  return result;
}

export async function parseScheduleFile(file: File): Promise<Seccion[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["xlsx", "csv"].includes(extension)) {
    throw new Error("Formato no permitido. Seleccioná un archivo XLSX o CSV.");
  }
  const sections: Seccion[] = [];

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
    sections.push(...parseScheduleRows(rows));
  } else {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    workbook.eachSheet((sheet) => {
      const rows: Row[] = [];
      sheet.eachRow({ includeEmpty: true }, (row) => {
        rows.push(
          (row.values as CellValue[]).slice(1).map((value) => {
            if (value === null || value === undefined) return "";
            if (value instanceof Date) return value.toLocaleDateString("es-PY");
            if (typeof value !== "object") return value;
            if ("result" in value && value.result !== undefined) return String(value.result);
            if ("text" in value) return String(value.text);
            if ("richText" in value)
              return value.richText.map((item: { text: string }) => item.text).join("");
            return String(value);
          }),
        );
      });
      try {
        sections.push(...parseScheduleRows(rows));
      } catch {
        // Algunas hojas son carátulas o referencias; se procesan solo las que contienen secciones.
      }
    });
  }
  if (!sections.length) {
    throw new Error(
      "No se detectaron secciones. El archivo debe incluir al menos Materia y Sección.",
    );
  }
  const unique = new Map(sections.map((section) => [section.id, section]));
  return [...unique.values()];
}
