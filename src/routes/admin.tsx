import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/components/AuthProvider";
import {
  assignRole,
  adminErrorMessage,
  deleteAdminRow,
  listAdminRows,
  listAudit,
  revokeRole,
  saveAdminRow,
  searchUsers,
  updateContactMessageStatus,
  type AppRole,
  type RegisteredUser,
} from "@/lib/admin-service";
import { publishScheduleRevision } from "@/lib/schedule-update-service";
import { analyzeScheduleFile, type ScheduleParseResult } from "@/lib/schedule-import-parser";
export const Route = createFileRoute("/admin")({ component: AdminPage });
type Tab =
  | "dashboard"
  | "notices"
  | "calendar"
  | "exams"
  | "resources"
  | "schedules"
  | "messages"
  | "users"
  | "audit";
type AdminOperation = (action: () => Promise<unknown>, success: string) => Promise<void>;
function AdminPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );
  const allowed = auth.user && auth.role !== "student";
  async function load(next = tab) {
    setBusy(true);
    setFeedback(null);
    try {
      if (next === "notices") setRows(await listAdminRows("admin_notices"));
      if (next === "calendar") setRows(await listAdminRows("academic_events"));
      if (next === "exams") setRows(await listAdminRows("exam_schedules"));
      if (next === "resources") setRows(await listAdminRows("academic_resources"));
      if (next === "schedules") setRows(await listAdminRows("schedule_revisions"));
      if (next === "messages") setRows(await listAdminRows("contact_messages"));
      if (next === "users") setUsers(await searchUsers());
      if (next === "audit") setRows(await listAudit());
    } catch (e) {
      setFeedback({ kind: "error", text: adminErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }
  const perform: AdminOperation = async (action, success) => {
    setFeedback(null);
    try {
      await action();
      setFeedback({ kind: "success", text: success });
    } catch (error) {
      setFeedback({ kind: "error", text: adminErrorMessage(error) });
    }
  };
  useEffect(() => {
    if (allowed) void load(tab);
    // `load` depende del tab actual y solo se ejecuta al cambiar permiso/pestaña.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, allowed]);
  if (auth.loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!auth.user)
    return (
      <div className="min-h-screen">
        <SiteNavbar />
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Acceso administrativo</h1>
          <p className="mt-2 text-muted-foreground">Iniciá sesión para verificar tus permisos.</p>
          <Link
            to="/cuenta"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-3 text-primary-foreground"
          >
            Ir a Mi cuenta
          </Link>
        </main>
      </div>
    );
  if (!allowed)
    return (
      <div className="min-h-screen">
        <SiteNavbar />
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-2xl font-bold">Sin permisos administrativos</h1>
          <p className="mt-2 text-muted-foreground">
            La ruta está protegida. Tu cuenta conserva el rol de estudiante.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-9 w-9 text-primary" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Rol: {auth.role}
            </p>
            <h1 className="text-3xl font-bold">Panel administrativo</h1>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {(
            [
              { id: "dashboard", label: "Resumen", Icon: Activity },
              { id: "notices", label: "Avisos", Icon: Bell },
              { id: "calendar", label: "Calendario", Icon: CalendarDays },
              { id: "exams", label: "Exámenes", Icon: GraduationCap },
              { id: "resources", label: "Recursos", Icon: BookOpen },
              { id: "schedules", label: "Horarios", Icon: Upload },
              { id: "messages", label: "Mensajes", Icon: MessageSquare },
              { id: "users", label: "Usuarios y permisos", Icon: Users },
              { id: "audit", label: "Auditoría", Icon: FileText },
            ] as const
          )
            .filter(
              (x) =>
                (x.id !== "users" || auth.role === "superadmin") &&
                (x.id !== "audit" || ["admin", "superadmin"].includes(auth.role)) &&
                (!["exams", "schedules"].includes(x.id) ||
                  ["admin", "superadmin"].includes(auth.role)),
            )
            .map((x) => (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${tab === x.id ? "bg-primary text-primary-foreground" : "glass"}`}
              >
                <x.Icon className="h-4 w-4" />
                {x.label}
              </button>
            ))}
        </div>
        {feedback && (
          <p
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`mt-4 rounded-xl p-3 text-sm ${
              feedback.kind === "error"
                ? "bg-red-400/10 text-red-300"
                : "bg-emerald-400/10 text-emerald-300"
            }`}
          >
            {feedback.text}
          </p>
        )}
        {busy ? (
          <Loader2 className="mx-auto mt-16 animate-spin" />
        ) : (
          <div className="mt-6">
            {tab === "dashboard" && <Dashboard />}
            {tab === "notices" && (
              <Notices
                rows={rows}
                role={auth.role}
                reload={() => load("notices")}
                perform={perform}
              />
            )}
            {tab === "calendar" && (
              <CalendarManager
                rows={rows}
                canWrite={auth.role !== "viewer"}
                canDelete={["admin", "superadmin"].includes(auth.role)}
                reload={() => load("calendar")}
                perform={perform}
              />
            )}
            {tab === "exams" && (
              <ExamManager rows={rows} reload={() => load("exams")} perform={perform} />
            )}
            {tab === "resources" && (
              <ResourceManager
                rows={rows}
                canWrite={auth.role !== "viewer"}
                canDelete={["admin", "superadmin"].includes(auth.role)}
                reload={() => load("resources")}
                perform={perform}
              />
            )}
            {tab === "schedules" && (
              <ScheduleUpdates rows={rows} reload={() => load("schedules")} perform={perform} />
            )}
            {tab === "messages" && (
              <ContactMessages
                rows={rows}
                canWrite={auth.role !== "viewer"}
                reload={() => load("messages")}
                perform={perform}
              />
            )}
            {tab === "users" && auth.role === "superadmin" && (
              <UsersPanel users={users} reload={() => load("users")} perform={perform} />
            )}{" "}
            {tab === "audit" && <Audit rows={rows} />}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
function Dashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { title: "Avisos", text: "Gestioná borradores, programación y publicación.", Icon: Bell },
        {
          title: "Calendario",
          text: "La migración habilita eventos y rangos oficiales.",
          Icon: CalendarDays,
        },
        { title: "Permisos", text: "Validados en Supabase mediante RLS y RPC.", Icon: Users },
        { title: "Auditoría", text: "Las operaciones críticas quedan trazadas.", Icon: Activity },
      ].map((x) => (
        <article key={x.title} className="glass rounded-2xl p-5">
          <x.Icon className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-semibold">{x.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{x.text}</p>
        </article>
      ))}
    </div>
  );
}

function ContactMessages({
  rows,
  canWrite,
  reload,
  perform,
}: {
  rows: Record<string, unknown>[];
  canWrite: boolean;
  reload: () => void;
  perform: AdminOperation;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article key={String(row.id)} className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-foreground">{String(row.subject)}</h2>
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  {String(row.status) === "new" ? "Nuevo" : String(row.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {String(row.name)} · {new Date(String(row.created_at)).toLocaleString("es-PY")}
              </p>
            </div>
            <a
              href={`mailto:${String(row.email)}?subject=${encodeURIComponent(`Re: ${String(row.subject)}`)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
            >
              <Mail className="h-3.5 w-3.5" /> Responder
            </a>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {String(row.message)}
          </p>
          <p className="mt-3 break-all text-xs text-muted-foreground/70">{String(row.email)}</p>
          {canWrite && String(row.status) !== "archived" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {String(row.status) === "new" && (
                <button
                  onClick={() =>
                    void perform(async () => {
                      await updateContactMessageStatus(String(row.id), "read");
                      await reload();
                    }, "Mensaje marcado como leído.")
                  }
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  Marcar leído
                </button>
              )}
              <button
                onClick={() =>
                  void perform(async () => {
                    await updateContactMessageStatus(String(row.id), "archived");
                    await reload();
                  }, "Mensaje archivado.")
                }
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Archivar
              </button>
            </div>
          )}
        </article>
      ))}
      {!rows.length && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No hay mensajes recibidos.
        </div>
      )}
    </div>
  );
}
function Notices({
  rows,
  role,
  reload,
  perform,
}: {
  rows: Record<string, unknown>[];
  role: string;
  reload: () => void;
  perform: AdminOperation;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState("informativo");
  async function create(e: React.FormEvent) {
    e.preventDefault();
    await perform(async () => {
      await saveAdminRow("admin_notices", {
        title,
        summary,
        category: "comunicado",
        priority,
        status: "draft",
        audience: { type: "all" },
      });
      setTitle("");
      setSummary("");
      await reload();
    }, "Aviso guardado correctamente como borrador.");
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="glass h-fit rounded-2xl p-5">
        <h2 className="font-semibold">Nuevo aviso</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Título"
          className="mt-4 w-full rounded-xl border border-input bg-background p-3"
        />
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          placeholder="Resumen"
          rows={5}
          className="mt-3 w-full rounded-xl border border-input bg-background p-3"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="mt-3 w-full rounded-xl border border-input bg-background p-3"
        >
          <option value="informativo">Informativo</option>
          <option value="importante">Importante</option>
          <option value="urgente">Urgente</option>
        </select>
        <button className="mt-3 w-full rounded-xl bg-primary p-3 text-primary-foreground">
          Guardar borrador
        </button>
      </form>
      <div className="space-y-3">
        {rows.map((r) => (
          <article key={String(r.id)} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{String(r.title)}</h3>
              <span className="rounded-full bg-foreground/10 px-2 py-1 text-xs">
                {String(r.status)}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{String(r.summary)}</p>
            {role !== "viewer" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    void perform(
                      async () => {
                        await saveAdminRow("admin_notices", {
                          ...r,
                          status: role === "editor" ? "review" : "published",
                          publish_at: role === "editor" ? r.publish_at : new Date().toISOString(),
                        });
                        await reload();
                      },
                      role === "editor"
                        ? "Aviso enviado a revisión."
                        : "Aviso publicado correctamente.",
                    )
                  }
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  {role === "editor" ? "Enviar a revisión" : "Publicar"}
                </button>
                {["admin", "superadmin"].includes(role) && (
                  <button
                    onClick={() =>
                      void perform(async () => {
                        await deleteAdminRow("admin_notices", String(r.id));
                        await reload();
                      }, "Aviso eliminado.")
                    }
                    className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-400"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
        {!rows.length && (
          <p className="text-muted-foreground">No hay avisos administrativos cargados.</p>
        )}
      </div>
    </div>
  );
}

function CalendarManager({
  rows,
  canWrite,
  canDelete,
  reload,
  perform,
}: {
  rows: Record<string, unknown>[];
  canWrite: boolean;
  canDelete: boolean;
  reload: () => void;
  perform: AdminOperation;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  async function create(event: React.FormEvent) {
    event.preventDefault();
    await perform(async () => {
      await saveAdminRow("academic_events", {
        title,
        category: "evento-institucional",
        starts_at: new Date(date).toISOString(),
        status: "draft",
        audience: { type: "all" },
      });
      setTitle("");
      setDate("");
      await reload();
    }, "Evento guardado correctamente.");
  }
  return (
    <ManagerLayout
      form={
        canWrite && (
          <form onSubmit={create} className="glass rounded-2xl p-5">
            <h2 className="font-semibold">Nuevo evento</h2>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              className="mt-4 w-full rounded-xl border border-input bg-background p-3"
            />
            <input
              required
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-3 w-full rounded-xl border border-input bg-background p-3"
            />
            <button className="mt-3 w-full rounded-xl bg-primary p-3 text-primary-foreground">
              Guardar borrador
            </button>
          </form>
        )
      }
      rows={rows}
      titleKey="title"
      detailKey="starts_at"
      table="academic_events"
      reload={reload}
      canDelete={canDelete}
      canPublish={canDelete}
      perform={perform}
    />
  );
}

function ExamManager({
  rows,
  reload,
  perform,
}: {
  rows: Record<string, unknown>[];
  reload: () => void;
  perform: AdminOperation;
}) {
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [room, setRoom] = useState("");
  async function create(event: React.FormEvent) {
    event.preventDefault();
    await perform(async () => {
      await saveAdminRow("exam_schedules", {
        subject_name: subject,
        exam_at: new Date(date).toISOString(),
        room: room || null,
        status: "confirmed",
      });
      setSubject("");
      setDate("");
      setRoom("");
      await reload();
    }, "Examen publicado correctamente.");
  }
  return (
    <ManagerLayout
      form={
        <form onSubmit={create} className="glass rounded-2xl p-5">
          <h2 className="font-semibold">Nuevo examen</h2>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Materia"
            className="mt-4 w-full rounded-xl border border-input bg-background p-3"
          />
          <input
            required
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-3 w-full rounded-xl border border-input bg-background p-3"
          />
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Aula (opcional)"
            className="mt-3 w-full rounded-xl border border-input bg-background p-3"
          />
          <button className="mt-3 w-full rounded-xl bg-primary p-3 text-primary-foreground">
            Publicar examen
          </button>
        </form>
      }
      rows={rows}
      titleKey="subject_name"
      detailKey="exam_at"
      table="exam_schedules"
      reload={reload}
      canDelete
      perform={perform}
    />
  );
}

function ResourceManager({
  rows,
  canWrite,
  canDelete,
  reload,
  perform,
}: {
  rows: Record<string, unknown>[];
  canWrite: boolean;
  canDelete: boolean;
  reload: () => void;
  perform: AdminOperation;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  async function create(event: React.FormEvent) {
    event.preventDefault();
    await perform(async () => {
      await saveAdminRow("academic_resources", {
        title,
        url,
        category: "enlace",
        status: "draft",
      });
      setTitle("");
      setUrl("");
      await reload();
    }, "Recurso guardado correctamente.");
  }
  return (
    <ManagerLayout
      form={
        canWrite && (
          <form onSubmit={create} className="glass rounded-2xl p-5">
            <h2 className="font-semibold">Nuevo recurso</h2>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              className="mt-4 w-full rounded-xl border border-input bg-background p-3"
            />
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="mt-3 w-full rounded-xl border border-input bg-background p-3"
            />
            <button className="mt-3 w-full rounded-xl bg-primary p-3 text-primary-foreground">
              Guardar recurso
            </button>
          </form>
        )
      }
      rows={rows}
      titleKey="title"
      detailKey="url"
      table="academic_resources"
      reload={reload}
      canDelete={canDelete}
      canPublish={canDelete}
      perform={perform}
    />
  );
}

function ScheduleUpdates({
  rows,
  reload,
  perform,
}: {
  rows: Record<string, unknown>[];
  reload: () => void;
  perform: AdminOperation;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState("");
  const [sending, setSending] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ScheduleParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function chooseFile(next: File | null) {
    setFile(next);
    setParseResult(null);
    setParseError(null);
    if (!next) return;
    setParsing(true);
    try {
      setParseResult(await analyzeScheduleFile(next));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "No se pudo procesar el archivo.");
    } finally {
      setParsing(false);
    }
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !parseResult) return;
    setSending(true);
    await perform(async () => {
      try {
        await publishScheduleRevision(file, summary, parseResult.sections);
        setFile(null);
        setParseResult(null);
        setSummary("");
        await reload();
      } finally {
        setSending(false);
      }
    }, `${parseResult.totalSections} secciones publicadas. Planificador, ¿Dónde rindo?, asistencia, promedio y exámenes usarán esta versión.`);
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={publish} className="glass h-fit rounded-2xl p-5">
        <h2 className="font-semibold">Publicar nueva versión</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Subí el Excel o CSV y verificá la cantidad de secciones detectadas. La publicación
          sustituye la fuente central que utilizan las herramientas académicas.
        </p>
        <input
          required
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => void chooseFile(e.target.files?.[0] || null)}
          className="mt-4 block w-full text-sm"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          En libros oficiales se procesa únicamente la hoja <b>IEK</b>. El sistema reconstruye los
          encabezados agrupados y detecta materias, secciones, departamentos, docentes, clases,
          aulas y exámenes.
        </p>
        {parsing && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando columnas y secciones…
          </p>
        )}
        {parseResult && (
          <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
            <p>
              Hoja <b>{parseResult.sheetName}</b>: <b>{parseResult.totalSections} secciones</b>
              detectadas.
            </p>
            <p className="mt-1">
              {parseResult.offeredSections} con clases · {parseResult.examOnlySections} solo con
              exámenes
            </p>
            {parseResult.warnings.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-700 dark:text-amber-300">
                {parseResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {parseError && (
          <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
            {parseError}
          </p>
        )}
        <textarea
          required
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Ej.: cambiaron fechas de parciales y aulas de varias secciones"
          rows={4}
          className="mt-3 w-full rounded-xl border border-input bg-background p-3"
        />
        <button
          disabled={sending || parsing || !parseResult}
          className="mt-3 w-full rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-50"
        >
          {sending ? "Publicando…" : "Publicar y actualizar herramientas"}
        </button>
      </form>
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={String(row.id)} className="glass rounded-2xl p-5">
            <div className="flex justify-between gap-3">
              <h3 className="font-semibold">Versión {String(row.revision)}</h3>
              <span className="text-xs text-muted-foreground">
                {new Date(String(row.published_at)).toLocaleString("es-PY")}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{String(row.change_summary)}</p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              Archivo: {String(row.file_name)}
              {Number(row.section_count) > 0 ? ` · ${Number(row.section_count)} secciones` : ""}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ManagerLayout({
  form,
  rows,
  titleKey,
  detailKey,
  table,
  reload,
  canDelete,
  canPublish = false,
  perform,
}: {
  form: React.ReactNode;
  rows: Record<string, unknown>[];
  titleKey: string;
  detailKey: string;
  table: string;
  reload: () => void;
  canDelete: boolean;
  canPublish?: boolean;
  perform: AdminOperation;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div>{form}</div>
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={String(row.id)} className="glass rounded-2xl p-5">
            <h3 className="font-semibold">{String(row[titleKey])}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{String(row[detailKey] ?? "")}</p>
            {canPublish && row.status !== "published" && (
              <button
                onClick={() =>
                  void perform(async () => {
                    await saveAdminRow(table, { ...row, status: "published" });
                    await reload();
                  }, "Registro publicado correctamente.")
                }
                className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
              >
                Publicar
              </button>
            )}
            {canDelete && (
              <button
                onClick={() =>
                  void perform(async () => {
                    await deleteAdminRow(table, String(row.id));
                    await reload();
                  }, "Registro eliminado.")
                }
                className="mt-3 ml-3 text-xs text-red-400"
              >
                Eliminar
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
function UsersPanel({
  users,
  reload,
  perform,
}: {
  users: RegisteredUser[];
  reload: () => void;
  perform: AdminOperation;
}) {
  const [term, setTerm] = useState("");
  const filtered = users.filter((u) =>
    (u.email + " " + (u.display_name || "")).toLowerCase().includes(term.toLowerCase()),
  );
  async function change(u: RegisteredUser, role: AppRole) {
    await perform(async () => {
      await assignRole(u.user_id, role, "Asignado desde el panel IEK");
      await reload();
    }, `Rol ${role} asignado correctamente.`);
  }
  return (
    <div>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar por nombre o correo"
        className="mb-4 w-full max-w-md rounded-xl border border-input bg-background p-3"
      />
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-foreground/5">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.user_id} className="border-t border-border">
                <td className="p-3">
                  <b>{u.display_name || "Sin nombre"}</b>
                  <span className="block text-xs text-muted-foreground">{u.email}</span>
                </td>
                <td className="p-3">
                  {u.role}
                  {!u.is_active && " · revocado"}
                </td>
                <td className="p-3">
                  <select
                    defaultValue={u.role}
                    onChange={(e) => void change(u, e.target.value as AppRole)}
                    className="rounded-lg border border-input bg-background p-2"
                  >
                    <option value="student">Estudiante</option>
                    <option value="viewer">Lector</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Administrador</option>
                    <option value="superadmin">Superadministrador</option>
                  </select>
                  {u.role !== "student" && (
                    <button
                      onClick={() =>
                        void perform(async () => {
                          await revokeRole(u.user_id, "Revocado desde el panel");
                          await reload();
                        }, "Permisos administrativos revocados.")
                      }
                      className="ml-2 text-xs text-red-400"
                    >
                      Revocar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Audit({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <article key={String(r.id)} className="glass rounded-xl p-4 text-sm">
          <b>{String(r.action)}</b>
          <span className="ml-2 text-muted-foreground">
            {String(r.entity_type)} · {new Date(String(r.created_at)).toLocaleString("es-PY")}
          </span>
        </article>
      ))}
      {!rows.length && (
        <p className="text-muted-foreground">Todavía no hay actividad administrativa registrada.</p>
      )}
    </div>
  );
}
