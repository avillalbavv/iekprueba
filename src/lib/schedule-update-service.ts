import { supabase } from "./supabase.ts";
import { upsertNotification } from "./notification-service.ts";
import { writeLocalState } from "./user-state.ts";
import { replaceScheduleData, type Seccion } from "./poliplanner.ts";

const ACK_KEY = "iek-schedule-revision:v1";
const DATA_CACHE_KEY = "iek-schedule-dataset:v1";
export interface ScheduleRevision {
  id: string;
  revision: number;
  file_name: string;
  change_summary: string;
  affects_all: boolean;
  affected_subject_ids: string[];
  affected_section_ids: string[];
  published_at: string;
}

interface CachedScheduleDataset {
  revision: number;
  sections: Seccion[];
}

function activateDataset(dataset: CachedScheduleDataset): void {
  if (!Array.isArray(dataset.sections) || !dataset.sections.length) return;
  replaceScheduleData(dataset.sections);
  if (typeof window !== "undefined") {
    writeLocalState(DATA_CACHE_KEY, JSON.stringify(dataset));
    window.dispatchEvent(
      new CustomEvent("iek:schedule-data-updated", { detail: dataset.revision }),
    );
  }
}

/** Carga primero la última copia local y luego la versión publicada en Supabase. */
export async function hydratePublishedScheduleData(): Promise<void> {
  if (typeof window === "undefined") return;
  let cachedRevision = 0;
  try {
    const cached = JSON.parse(
      localStorage.getItem(DATA_CACHE_KEY) || "null",
    ) as CachedScheduleDataset | null;
    if (cached?.sections?.length) {
      cachedRevision = Number(cached.revision) || 0;
      replaceScheduleData(cached.sections);
    }
  } catch {
    // Un caché inválido no impide usar la oferta incluida en la aplicación.
  }
  if (!supabase) return;
  const { data, error } = await supabase
    .from("schedule_revisions")
    .select("revision,sections")
    .eq("is_active", true)
    .not("sections", "is", null)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data || !Array.isArray(data.sections) || !data.sections.length) return;
  const revision = Number(data.revision) || 0;
  if (revision >= cachedRevision)
    activateDataset({ revision, sections: data.sections as Seccion[] });
}

export async function checkScheduleUpdates(): Promise<ScheduleRevision | null> {
  if (!supabase || typeof window === "undefined") return null;
  const { data, error } = await supabase
    .from("schedule_revisions")
    .select(
      "id,revision,file_name,change_summary,affects_all,affected_subject_ids,affected_section_ids,published_at",
    )
    .eq("is_active", true)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const revision = data as ScheduleRevision;
  await hydratePublishedScheduleData();
  const acknowledged = Number(localStorage.getItem(ACK_KEY) || 0);
  if (revision.revision <= acknowledged) return null;
  let selection: { materiaIds: string[]; secciones: Record<string, string> } = {
    materiaIds: [],
    secciones: {},
  };
  try {
    const parsed = JSON.parse(localStorage.getItem("poliplanner:seleccion:v2") || "{}");
    selection = {
      materiaIds: Array.isArray(parsed.materiaIds) ? parsed.materiaIds : [],
      secciones: parsed.secciones && typeof parsed.secciones === "object" ? parsed.secciones : {},
    };
  } catch {
    // Sin selección válida: el aviso general igualmente puede mostrarse.
  }
  const chosenSections = new Set(Object.values(selection.secciones));
  const affected =
    revision.affects_all ||
    revision.affected_subject_ids.some((id) => selection.materiaIds.includes(id)) ||
    revision.affected_section_ids.some((id) => chosenSections.has(id));
  if (affected)
    upsertNotification({
      id: `schedule-revision:${revision.id}`,
      type: "schedule-update",
      title: "Se actualizaron los horarios",
      message: `${revision.change_summary} Revisá tus materias, fechas, aulas y exámenes.`,
      priority: "high",
      createdAt: revision.published_at,
      actionUrl: "/poliplanner",
    });
  writeLocalState(ACK_KEY, String(revision.revision));
  return affected ? revision : null;
}

export async function publishScheduleRevision(
  file: File,
  summary: string,
  sections: Seccion[],
): Promise<number> {
  if (!supabase) throw new Error("Supabase no está configurado");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["xlsx", "csv"].includes(extension))
    throw new Error("Formato no permitido. Seleccioná un archivo XLSX o CSV.");
  if (file.size > 10 * 1024 * 1024) throw new Error("El archivo supera el límite de 10 MB.");
  if (!summary.trim()) throw new Error("Describí brevemente qué cambió en los horarios.");
  if (!Array.isArray(sections) || !sections.length)
    throw new Error("Procesá y verificá las secciones del archivo antes de publicarlo.");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sesión administrativa requerida");
  const checksum = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const path = `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeName}`;
  const contentType =
    file.type ||
    (extension === "csv"
      ? "text/csv"
      : extension === "xls"
        ? "application/vnd.ms-excel"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const { error: uploadError } = await supabase.storage
    .from("schedule-imports")
    .upload(path, file, { contentType, upsert: false });
  if (uploadError) throw uploadError;
  const { data: revision, error } = await supabase
    .from("schedule_revisions")
    .insert({
      file_name: file.name,
      file_path: path,
      checksum,
      change_summary: summary.trim(),
      affects_all: true,
      published_by: userData.user.id,
      sections,
      section_count: sections.length,
      source_format: extension,
    })
    .select("id,revision")
    .single();
  if (error) {
    // Evita archivos huérfanos cuando el registro de la revisión es rechazado.
    await supabase.storage.from("schedule-imports").remove([path]);
    throw error;
  }
  await supabase
    .from("schedule_revisions")
    .update({ is_active: false })
    .neq("id", revision.id)
    .eq("is_active", true)
    .not("sections", "is", null);
  activateDataset({ revision: Number(revision.revision), sections });
  return sections.length;
}
