import { supabase } from "./supabase.ts";
export type AppRole = "superadmin" | "admin" | "editor" | "viewer" | "student";
export interface RegisteredUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AppRole;
  is_active: boolean;
  assigned_at: string | null;
}
function client() {
  if (!supabase) throw new Error("Supabase no está configurado");
  return supabase;
}

export function adminErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const suffix = code ? ` (código ${code})` : "";
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "No se pudo completar la operación";
  const normalized = raw.toLowerCase();
  if (normalized.includes("row-level security") || normalized.includes("permission denied"))
    return `Supabase rechazó la operación por permisos. Verificá que tu rol esté activo y ejecutá la migración administrativa 005.${suffix}`;
  if (normalized.includes("does not exist") || normalized.includes("could not find the table"))
    return "Falta una tabla, columna o función en Supabase. Ejecutá todas las migraciones pendientes, incluidas las actualizaciones de horarios y mensajes de contacto.";
  if (normalized.includes("jwt") || normalized.includes("session"))
    return "La sesión venció. Cerrá sesión, volvé a ingresar y repetí la operación.";
  return raw;
}
export async function searchUsers(term = ""): Promise<RegisteredUser[]> {
  const { data, error } = await client().rpc("search_registered_users", {
    search_term: term,
    result_limit: 50,
  });
  if (error) throw error;
  return (data || []) as RegisteredUser[];
}
export async function assignRole(userId: string, role: AppRole, note = "") {
  const { error } = await client().rpc("assign_user_role", {
    target_user: userId,
    new_role: role,
    internal_note: note || null,
  });
  if (error) throw error;
}
export async function revokeRole(userId: string, note = "") {
  const { error } = await client().rpc("revoke_user_role", {
    target_user: userId,
    internal_note: note || null,
  });
  if (error) throw error;
}
export async function listAdminRows(table: string) {
  if (table === "schedule_revisions") {
    const { data, error } = await client()
      .from(table)
      .select(
        "id,revision,file_name,change_summary,published_at,is_active,section_count,source_format",
      )
      .order("revision", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []) as Record<string, unknown>[];
  }
  if (table === "contact_messages") {
    const { data, error } = await client()
      .from(table)
      .select("id,name,email,subject,message,status,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []) as Record<string, unknown>[];
  }
  const { data, error } = await client().from(table).select("*").limit(100);
  if (error) throw error;
  return data || [];
}
export async function updateContactMessageStatus(id: string, status: "read" | "archived") {
  const { error } = await client().rpc("update_contact_message_status", {
    p_message_id: id,
    p_status: status,
  });
  if (error) throw error;
}
export async function saveAdminRow(table: string, row: Record<string, unknown>) {
  const {
    data: { user },
  } = await client().auth.getUser();
  if (!user) throw new Error("Sesión requerida");
  const isUpdate = Boolean(row.id);
  const payload = {
    ...row,
    updated_by: user.id,
    ...(!isUpdate ? { created_by: user.id } : {}),
  };
  const query = isUpdate
    ? client().from(table).update(payload).eq("id", String(row.id))
    : client().from(table).insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}
export async function deleteAdminRow(table: string, id: string) {
  const { error } = await client().from(table).delete().eq("id", id);
  if (error) throw error;
}
export async function listAudit() {
  const { data, error } = await client()
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}
