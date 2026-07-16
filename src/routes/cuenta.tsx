import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2, ChevronRight, Cloud, CloudOff, Download, KeyRound,
  Loader2, LogIn, LogOut, RefreshCw, ShieldCheck, Trash2, UserPlus,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNavbar } from "@/components/SiteNavbar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { deleteSyncedAcademicData, exportAcademicData } from "@/lib/user-state";

export const Route = createFileRoute("/cuenta")({ component: CuentaPage });

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo completar la operación";
}

function Field({ label, type = "text", value, onChange, autoComplete, placeholder }: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function CuentaPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function execute(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try { await action(); }
    catch (caught) { setError(messageOf(caught)); }
    finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await execute(async () => {
      if (!email.trim()) throw new Error("Ingresá tu correo");
      if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
      if (mode === "login") {
        await auth.signIn(email.trim(), password);
      } else {
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden");
        const result = await auth.signUp(email.trim(), password, displayName);
        setMessage(result.needsConfirmation
          ? "Revisá tu correo para confirmar la cuenta. Después podrás iniciar sesión."
          : "Cuenta creada. Tus datos locales se están sincronizando.");
      }
    });
  }

  function downloadExport() {
    const blob = new Blob([exportAcademicData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `iek-datos-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function deleteData() {
    if (!auth.user || !confirm("¿Eliminar tus horarios, asistencia, promedio y progreso guardados? Esta acción no se puede deshacer.")) return;
    await execute(async () => {
      await deleteSyncedAcademicData(auth.user!.id);
      setMessage("Tus datos académicos fueron eliminados de la cuenta y de este dispositivo.");
    });
  }

  async function deleteAccount() {
    if (!confirm("¿Eliminar definitivamente tu cuenta y todos sus datos? Esta acción no se puede deshacer.")) return;
    await execute(async () => {
      if (!supabase) throw new Error("Supabase no está configurado");
      await deleteSyncedAcademicData(auth.user!.id);
      const { error: rpcError } = await supabase.rpc("delete_my_account");
      if (rpcError) throw rpcError;
      await supabase.auth.signOut();
      window.location.assign("/");
    });
  }

  const syncMeta = {
    disabled: { label: "Sin configurar", Icon: CloudOff, color: "text-muted-foreground" },
    idle: { label: "Esperando sesión", Icon: CloudOff, color: "text-muted-foreground" },
    syncing: { label: "Sincronizando…", Icon: RefreshCw, color: "text-blue-400" },
    synced: { label: "Datos sincronizados", Icon: Cloud, color: "text-emerald-400" },
    error: { label: "Error de sincronización", Icon: CloudOff, color: "text-red-400" },
  }[auth.syncStatus];

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-12 sm:pt-20">
        <Reveal>
          <div className="mb-8 flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Inicio</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Mi cuenta</span>
          </div>
          <h1 className="text-4xl font-bold sm:text-5xl">Mi <span className="text-gradient">cuenta IEK</span></h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Guardá tu horario, asistencia, promedio y progreso para recuperarlos desde cualquier dispositivo.
          </p>
        </Reveal>

        {!auth.configured ? (
          <Reveal>
            <div className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
              <div className="flex items-start gap-3">
                <CloudOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                <div>
                  <h2 className="font-semibold text-foreground">Conexión pendiente</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    El sistema de cuentas ya está preparado, pero faltan <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>. Hasta configurarlas, tus herramientas siguen funcionando normalmente con almacenamiento local.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        ) : auth.loading ? (
          <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        ) : !auth.user ? (
          <Reveal>
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted/50 p-1">
                <button onClick={() => { setMode("login"); setConfirmPassword(""); setError(null); setMessage(null); }} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Iniciar sesión</button>
                <button onClick={() => { setMode("signup"); setConfirmPassword(""); setError(null); setMessage(null); }} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Crear cuenta</button>
              </div>
              <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                {mode === "login" ? (
                  <p><strong className="text-foreground">Para ingresar:</strong> usá el mismo correo y contraseña con los que creaste la cuenta. Si recién te registraste, confirmá primero el enlace recibido por correo.</p>
                ) : (
                  <ol className="space-y-1">
                    <li><strong className="text-foreground">1.</strong> Ingresá un correo al que tengas acceso.</li>
                    <li><strong className="text-foreground">2.</strong> Creá y repetí una contraseña de al menos 8 caracteres.</li>
                    <li><strong className="text-foreground">3.</strong> Abrí el correo de confirmación y después iniciá sesión.</li>
                  </ol>
                )}
              </div>
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && <Field label="Nombre (opcional)" value={displayName} onChange={setDisplayName} autoComplete="name" />}
                <Field label="Correo" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="tu-correo@ejemplo.com" />
                <Field label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                {mode === "signup" && (
                  <>
                    <Field label="Confirmar contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                    {confirmPassword && (
                      <p className={`text-xs ${password === confirmPassword ? "text-emerald-500" : "text-amber-500"}`}>
                        {password === confirmPassword ? "Las contraseñas coinciden." : "Las contraseñas todavía no coinciden."}
                      </p>
                    )}
                  </>
                )}
                {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
                {message && <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{message}</p>}
                <button disabled={busy} className="btn-premium flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {mode === "login" ? "Ingresar" : "Crear cuenta"}
                </button>
              </form>
              {mode === "login" && (
                <button onClick={() => execute(async () => { if (!email.trim()) throw new Error("Ingresá primero tu correo"); await auth.resetPassword(email.trim()); setMessage("Te enviamos un enlace para cambiar la contraseña."); })}
                  className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary">
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
          </Reveal>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <ShieldCheck className="h-7 w-7 text-primary" />
                <h2 className="mt-4 text-lg font-semibold text-foreground">Sesión activa</h2>
                <p className="mt-1 break-all text-sm text-muted-foreground">{auth.user.email}</p>
                <span className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Rol: {auth.role}</span>
                <div className={`mt-5 flex items-center gap-2 text-sm ${syncMeta.color}`}>
                  <syncMeta.Icon className={`h-4 w-4 ${auth.syncStatus === "syncing" ? "animate-spin" : ""}`} />
                  {syncMeta.label}
                </div>
                {auth.syncError && <p className="mt-2 text-xs text-red-400">{auth.syncError}</p>}
                <button onClick={() => execute(auth.syncNow)} disabled={busy || auth.syncStatus === "syncing"}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-foreground transition hover:bg-foreground/5 disabled:opacity-50">
                  <RefreshCw className="h-4 w-4" /> Sincronizar ahora
                </button>
              </div>
            </Reveal>

            <Reveal>
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                <h2 className="mt-4 text-lg font-semibold text-foreground">Tus datos</h2>
                <p className="mt-1 text-sm text-muted-foreground">Se sincronizan horario, asistencia, promedio, calculadora de notas, énfasis y progreso de mallas.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={downloadExport} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-foreground/5"><Download className="h-4 w-4" /> Exportar</button>
                  <button onClick={deleteData} className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /> Borrar datos</button>
                </div>
              </div>
            </Reveal>

            <Reveal className="md:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="flex items-center gap-2 font-semibold text-foreground"><KeyRound className="h-4 w-4 text-primary" /> Seguridad de la cuenta</h2>
                {error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
                {message && <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{message}</p>}
                <div className="mt-4 max-w-sm">
                  <Field label="Nueva contraseña" type="password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
                  <button onClick={() => execute(async () => { if (newPassword.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres"); await auth.updatePassword(newPassword); setNewPassword(""); setMessage("Contraseña actualizada."); })}
                    className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-foreground/5">
                    <KeyRound className="h-4 w-4" /> Cambiar contraseña
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => execute(auth.signOut)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-foreground/5"><LogOut className="h-4 w-4" /> Cerrar sesión</button>
                  <button onClick={deleteAccount} className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /> Eliminar cuenta</button>
                </div>
              </div>
            </Reveal>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
