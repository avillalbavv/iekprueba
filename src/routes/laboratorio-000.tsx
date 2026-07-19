import { createFileRoute, Link } from "@tanstack/react-router";
import {
  computeRomHash,
  deleteState,
  listByRom,
  loadState,
  saveState,
  type SaveStateMeta,
} from "@gba-kit/gba-browser";
import { useEmulator, useEmulatorCanvas, useEmulatorKeyboard } from "@gba-kit/gba-react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronLeft,
  Gamepad2,
  LoaderCircle,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export const Route = createFileRoute("/laboratorio-000")({ component: SecretGbaLab });

const MAX_ROM_BYTES = 32 * 1024 * 1024;
const MIN_ROM_BYTES = 192;

type Notice = { kind: "error" | "success" | "info"; text: string };

function getRomTitle(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer, 0xa0, Math.min(12, Math.max(0, buffer.byteLength - 0xa0)));
  return new TextDecoder("ascii").decode(bytes).replace(/\0/g, "").trim() || "Cartucho GBA";
}

function SecretGbaLab() {
  const { emulator, state } = useEmulator();
  const canvasRef = useEmulatorCanvas(emulator);
  useEmulatorKeyboard(emulator);

  const playerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const romBufferRef = useRef<ArrayBuffer | null>(null);
  const [hasRom, setHasRom] = useState(false);
  const [romTitle, setRomTitle] = useState("Esperando cartucho");
  const [romHash, setRomHash] = useState<string | null>(null);
  const [saves, setSaves] = useState<SaveStateMeta[]>([]);
  const [audioOn, setAudioOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>({
    kind: "info",
    text: "Elegí una copia legal en formato .gba. El archivo permanece únicamente en tu dispositivo.",
  });

  async function refreshSaves(hash: string) {
    setSaves(await listByRom(hash));
  }

  async function handleRom(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gba")) {
      setNotice({ kind: "error", text: "El archivo debe tener extensión .gba." });
      return;
    }
    if (file.size < MIN_ROM_BYTES || file.size > MAX_ROM_BYTES) {
      setNotice({ kind: "error", text: "La ROM no parece válida o supera el máximo de 32 MB." });
      return;
    }

    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const hash = await computeRomHash(buffer);
      romBufferRef.current = buffer;
      emulator.loadRom(buffer);
      emulator.run();
      setAudioOn(false);
      setHasRom(true);
      setRomHash(hash);
      setRomTitle(getRomTitle(buffer));
      await refreshSaves(hash);
      setNotice({ kind: "success", text: "Cartucho cargado. Que empiece la aventura." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo iniciar esta ROM. Probá con otra copia." });
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function togglePlayback() {
    if (!hasRom) return;
    if (state === "running") emulator.pause();
    else emulator.run();
  }

  function restart() {
    const buffer = romBufferRef.current;
    if (!buffer) return;
    emulator.loadRom(buffer);
    emulator.run();
    setAudioOn(false);
    setNotice({ kind: "info", text: "Cartucho reiniciado desde el comienzo." });
  }

  function toggleAudio() {
    const enabled = emulator.toggleAudio();
    setAudioOn(enabled);
  }

  async function persistState() {
    if (!romHash || state === "idle") return;
    const wasRunning = state === "running";
    setBusy(true);
    try {
      const { snapshot, thumbnail } = await emulator.saveState();
      await saveState(romHash, snapshot, thumbnail, `Partida ${saves.length + 1}`);
      await refreshSaves(romHash);
      if (wasRunning) emulator.run();
      setNotice({ kind: "success", text: "Partida guardada en este navegador." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo guardar la partida." });
    } finally {
      setBusy(false);
    }
  }

  async function restoreState(id: number) {
    setBusy(true);
    try {
      const record = await loadState(id);
      if (!record) throw new Error("Save not found");
      emulator.loadState(record.snapshot);
      emulator.run();
      setNotice({ kind: "success", text: "Partida restaurada." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo restaurar esa partida." });
    } finally {
      setBusy(false);
    }
  }

  async function removeState(id: number) {
    if (!romHash) return;
    setBusy(true);
    try {
      await deleteState(id);
      await refreshSaves(romHash);
      setNotice({ kind: "info", text: "Partida guardada eliminada." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo eliminar esa partida." });
    } finally {
      setBusy(false);
    }
  }

  async function enterFullscreen() {
    try {
      await playerRef.current?.requestFullscreen();
    } catch {
      setNotice({ kind: "error", text: "El navegador no permitió abrir la pantalla completa." });
    }
  }

  function sendKey(key: string, pressed: boolean) {
    const event = new KeyboardEvent(pressed ? "keydown" : "keyup", { key });
    if (pressed) emulator.handleKeyDown(event);
    else emulator.handleKeyUp(event);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#090b12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_15%,rgba(239,68,68,0.16),transparent_30%),radial-gradient(circle_at_85%_75%,rgba(59,130,246,0.12),transparent_32%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:auto,auto,32px_32px,32px_32px]" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="Volver a la plataforma"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:border-red-400/35 hover:bg-red-400/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Salir
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-red-300/75">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]" />
            Laboratorio 000
          </div>
        </header>

        <section className="mt-6 grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/70">
                Señal recuperada
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                Módulo portátil <span className="text-red-400">GBA</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                Un rincón secreto para descansar entre parciales. Compatible con copias legales de
                juegos de Game Boy Advance, incluido Pokémon Rojo Fuego.
              </p>
            </div>

            <div
              ref={playerRef}
              className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111521] p-3 shadow-[0_30px_100px_-30px_rgba(239,68,68,0.35)] sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                    {romTitle}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">
                    {state === "running" ? "En ejecución" : hasRom ? "En pausa" : "Sin cartucho"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <PlayerIconButton
                    label={state === "running" ? "Pausar" : "Continuar"}
                    onClick={togglePlayback}
                    disabled={!hasRom}
                  >
                    {state === "running" ? <Pause /> : <Play />}
                  </PlayerIconButton>
                  <PlayerIconButton
                    label={audioOn ? "Silenciar" : "Activar sonido"}
                    onClick={toggleAudio}
                    disabled={!hasRom}
                  >
                    {audioOn ? <Volume2 /> : <VolumeX />}
                  </PlayerIconButton>
                  <PlayerIconButton label="Pantalla completa" onClick={enterFullscreen}>
                    <Maximize2 />
                  </PlayerIconButton>
                </div>
              </div>

              <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-inner">
                <canvas
                  ref={canvasRef}
                  aria-label="Pantalla del emulador GBA"
                  className={`h-full w-full [image-rendering:pixelated] ${hasRom ? "opacity-100" : "opacity-20"}`}
                />
                {!hasRom && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300 transition hover:bg-white/[0.03] hover:text-white"
                  >
                    {busy ? (
                      <LoaderCircle className="h-10 w-10 animate-spin text-red-400" />
                    ) : (
                      <Upload className="h-10 w-10 text-red-400" />
                    )}
                    <span className="text-sm font-semibold">Insertar cartucho .gba</span>
                    <span className="max-w-xs px-4 text-center text-xs text-slate-500">
                      Se procesa localmente y no se sube a la plataforma
                    </span>
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="flex items-center justify-center md:justify-start">
                  <DPad sendKey={sendKey} disabled={!hasRom} />
                </div>
                <div className="flex items-center justify-center gap-2 self-end pb-1">
                  <VirtualKey label="Select" keyName="Backspace" sendKey={sendKey} disabled={!hasRom} compact />
                  <VirtualKey label="Start" keyName="Enter" sendKey={sendKey} disabled={!hasRom} compact />
                </div>
                <div className="flex items-center justify-center gap-3 md:justify-end">
                  <VirtualKey label="B" keyName="x" sendKey={sendKey} disabled={!hasRom} round />
                  <VirtualKey label="A" keyName="z" sendKey={sendKey} disabled={!hasRom} round primary />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                <div className="flex gap-2">
                  <VirtualKey label="L" keyName="s" sendKey={sendKey} disabled={!hasRom} shoulder />
                  <VirtualKey label="R" keyName="a" sendKey={sendKey} disabled={!hasRom} shoulder />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={restart}
                    disabled={!hasRom || busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
                  </button>
                  <button
                    type="button"
                    onClick={persistState}
                    disabled={!hasRom || busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Save className="h-3.5 w-3.5" /> Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Gamepad2 className="h-4 w-4 text-red-400" /> Cartucho
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".gba,application/octet-stream"
                className="sr-only"
                onChange={(event) => handleRom(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm font-bold text-red-200 transition hover:border-red-300/45 hover:bg-red-400/15 disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {hasRom ? "Cambiar cartucho" : "Cargar archivo .gba"}
              </button>
              <p
                role="status"
                className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
                  notice.kind === "error"
                    ? "border-red-400/20 bg-red-400/8 text-red-200"
                    : notice.kind === "success"
                      ? "border-emerald-400/20 bg-emerald-400/8 text-emerald-200"
                      : "border-white/8 bg-black/10 text-slate-400"
                }`}
              >
                {notice.text}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h2 className="text-sm font-bold text-slate-200">Partidas locales</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Los guardados quedan solo en este navegador y se vinculan al cartucho cargado.
              </p>
              <div className="mt-3 space-y-2">
                {saves.length > 0 ? (
                  saves.map((save) => (
                    <div
                      key={save.id}
                      className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/10 p-2"
                    >
                      <button
                        type="button"
                        onClick={() => restoreState(save.id)}
                        disabled={busy}
                        className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition hover:bg-white/5 disabled:opacity-50"
                      >
                        <span className="block truncate text-xs font-semibold text-slate-200">
                          {save.label}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-slate-500">
                          {new Date(save.timestamp).toLocaleString("es-PY", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeState(save.id)}
                        disabled={busy}
                        aria-label={`Eliminar ${save.label}`}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-slate-600">
                    {hasRom ? "Todavía no hay partidas guardadas." : "Cargá un cartucho para ver sus partidas."}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs leading-relaxed text-slate-500">
              <p className="font-bold text-slate-300">Controles de teclado</p>
              <p className="mt-2">Flechas · movimiento</p>
              <p>Z / X · A / B</p>
              <p>A / S · R / L</p>
              <p>Enter / Retroceso · Start / Select</p>
            </div>
          </aside>
        </section>

        <p className="mt-8 text-center text-[10px] leading-relaxed text-slate-600">
          Emulador sin juegos ni firmware propietario. Pokémon y Game Boy Advance son marcas de sus
          respectivos titulares. Usá únicamente copias obtenidas legalmente.
        </p>
      </main>
    </div>
  );
}

function PlayerIconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 [&_svg]:h-4 [&_svg]:w-4"
    >
      {children}
    </button>
  );
}

function VirtualKey({
  label,
  keyName,
  sendKey,
  disabled,
  round,
  primary,
  compact,
  shoulder,
}: {
  label: string;
  keyName: string;
  sendKey: (key: string, pressed: boolean) => void;
  disabled?: boolean;
  round?: boolean;
  primary?: boolean;
  compact?: boolean;
  shoulder?: boolean;
}) {
  function handlePointer(event: ReactPointerEvent<HTMLButtonElement>, pressed: boolean) {
    event.preventDefault();
    if (disabled) return;
    if (pressed) event.currentTarget.setPointerCapture(event.pointerId);
    sendKey(keyName, pressed);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(event) => handlePointer(event, true)}
      onPointerUp={(event) => handlePointer(event, false)}
      onPointerCancel={(event) => handlePointer(event, false)}
      onContextMenu={(event) => event.preventDefault()}
      className={`touch-none select-none border font-bold uppercase tracking-wider shadow-lg transition active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-30 ${
        round
          ? "h-14 w-14 rounded-full text-base"
          : compact
            ? "rounded-full px-3 py-1.5 text-[9px]"
            : shoulder
              ? "min-w-14 rounded-lg px-4 py-2 text-xs"
              : "h-11 w-11 rounded-xl text-xs"
      } ${
        primary
          ? "border-red-300/35 bg-red-500 text-white shadow-red-950/60"
          : "border-white/10 bg-[#242a39] text-slate-300 shadow-black/30"
      }`}
    >
      {label}
    </button>
  );
}

function DPad({
  sendKey,
  disabled,
}: {
  sendKey: (key: string, pressed: boolean) => void;
  disabled?: boolean;
}) {
  const buttons = [
    { key: "ArrowUp", label: "Arriba", icon: ArrowUp, position: "col-start-2 row-start-1" },
    { key: "ArrowLeft", label: "Izquierda", icon: ArrowLeft, position: "col-start-1 row-start-2" },
    { key: "ArrowRight", label: "Derecha", icon: ArrowRight, position: "col-start-3 row-start-2" },
    { key: "ArrowDown", label: "Abajo", icon: ArrowDown, position: "col-start-2 row-start-3" },
  ];

  return (
    <div className="grid h-[7.75rem] w-[7.75rem] grid-cols-3 grid-rows-3 rounded-full bg-black/15 p-1">
      {buttons.map(({ key, label, icon: Icon, position }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          aria-label={label}
          onPointerDown={(event) => {
            event.preventDefault();
            if (disabled) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            sendKey(key, true);
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            if (!disabled) sendKey(key, false);
          }}
          onPointerCancel={(event) => {
            event.preventDefault();
            if (!disabled) sendKey(key, false);
          }}
          onContextMenu={(event) => event.preventDefault()}
          className={`${position} grid touch-none select-none place-items-center rounded-lg border border-white/10 bg-[#242a39] text-slate-300 shadow-lg shadow-black/30 transition active:translate-y-0.5 active:bg-[#30384b] disabled:cursor-not-allowed disabled:opacity-30`}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
      <span className="col-start-2 row-start-2 m-2 rounded-full bg-[#1b202c] shadow-inner" />
    </div>
  );
}
