import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronLeft,
  ExternalLink,
  Gamepad2,
  LoaderCircle,
  Play,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { parseRomCatalog, type RomCatalogEntry } from "../lib/rom-catalog";

export const Route = createFileRoute("/laboratorio-000")({ component: SecretGbaLab });

const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
const MAX_ROM_BYTES = 32 * 1024 * 1024;
const MIN_ROM_BYTES = 192;

type Notice = { kind: "error" | "success" | "info"; text: string };
type RomSession = { gameId: string; title: string; url: string; local: boolean };

declare global {
  interface Window {
    EJS_player?: string;
    EJS_gameName?: string;
    EJS_gameUrl?: string;
    EJS_core?: string;
    EJS_pathtodata?: string;
    EJS_startOnLoaded?: boolean;
    EJS_language?: string;
    EJS_gameID?: string;
    EJS_color?: string;
    EJS_askBeforeExit?: boolean;
    EJS_disableAutoUnload?: boolean;
    EJS_ready?: () => void;
    EJS_onGameStart?: () => void;
    EJS_emulator?: unknown;
  }
}

function readAscii(bytes: Uint8Array, start: number, end: number) {
  return new TextDecoder("ascii").decode(bytes.subarray(start, end)).replace(/\0/g, "").trim();
}

function SecretGbaLab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<RomSession | null>(null);
  const [catalog, setCatalog] = useState<RomCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>({
    kind: "info",
    text: "Seleccioná un archivo .gba.",
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch("/roms/catalog.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Catalog unavailable");
        return response.json();
      })
      .then((value: unknown) => setCatalog(parseRomCatalog(value)))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setNotice({
          kind: "error",
          text: "No se pudo cargar la biblioteca.",
        });
      })
      .finally(() => setCatalogLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!session) return;

    window.EJS_player = "#gba-emulator";
    window.EJS_gameName = session.title;
    window.EJS_gameUrl = session.url;
    window.EJS_core = "gba";
    window.EJS_pathtodata = EMULATOR_DATA_URL;
    window.EJS_startOnLoaded = true;
    window.EJS_language = "es";
    window.EJS_gameID = session.gameId;
    window.EJS_color = "#ef4444";
    window.EJS_askBeforeExit = false;
    window.EJS_disableAutoUnload = false;
    window.EJS_ready = () =>
      setNotice({ kind: "info", text: "Iniciando…" });
    window.EJS_onGameStart = () => {
      setBusy(false);
      setNotice({ kind: "success", text: "Cartucho iniciado correctamente." });
    };

    const script = document.createElement("script");
    script.src = `${EMULATOR_DATA_URL}loader.js`;
    script.async = true;
    script.dataset.gbaEasterEgg = "true";
    script.onerror = () => {
      setBusy(false);
      setNotice({
        kind: "error",
        text: "No se pudo iniciar el emulador.",
      });
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
      if (session.local) URL.revokeObjectURL(session.url);
      delete window.EJS_ready;
      delete window.EJS_onGameStart;
    };
  }, [session]);

  async function handleRom(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gba")) {
      setNotice({ kind: "error", text: "El archivo debe tener extensión .gba." });
      return;
    }
    if (file.size < MIN_ROM_BYTES || file.size > MAX_ROM_BYTES) {
      setNotice({ kind: "error", text: "Archivo inválido o mayor a 32 MB." });
      return;
    }

    setBusy(true);
    try {
      const header = new Uint8Array(await file.slice(0, MIN_ROM_BYTES).arrayBuffer());
      const title = readAscii(header, 0xa0, 0xac) || "Cartucho GBA";
      const code = readAscii(header, 0xac, 0xb0) || file.name;
      setSession({
        title,
        gameId: `iek-gba-${code.toLowerCase()}`,
        url: URL.createObjectURL(file),
        local: true,
      });
      setNotice({ kind: "info", text: "Cargando…" });
    } catch {
      setBusy(false);
      setNotice({ kind: "error", text: "No se pudo leer el archivo." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function playCatalogRom(game: RomCatalogEntry) {
    setBusy(true);
    setSession({
      title: game.title,
      gameId: `iek-gba-${game.id}`,
      url: game.rom,
      local: false,
    });
    setNotice({ kind: "info", text: `Cargando ${game.title}…` });
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#090b12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_15%,rgba(239,68,68,0.16),transparent_30%),radial-gradient(circle_at_85%_75%,rgba(59,130,246,0.12),transparent_32%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:auto,auto,32px_32px,32px_32px]" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <a
            href="/"
            aria-label="Volver a la plataforma"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:border-red-400/35 hover:bg-red-400/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Salir
          </a>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-red-300/75">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]" />
            Laboratorio 000
          </div>
        </header>

        <section className="mt-6 grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="mb-5">
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-5xl">
                Módulo portátil <span className="text-red-400">GBA</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                Elegí un juego o cargá un archivo .gba.
              </p>
            </div>

            {!session && (
              <section className="mb-5" aria-labelledby="catalog-title">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                      <BookOpen className="h-4 w-4 text-red-400" />
                      <h2 id="catalog-title">Biblioteca pública</h2>
                    </div>
                  </div>
                </div>

                {catalogLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs text-slate-400">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Cargando biblioteca…
                  </div>
                ) : catalog.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {catalog.map((game) => (
                      <article
                        key={game.id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3"
                      >
                        <div className="flex gap-3">
                          {game.cover ? (
                            <img
                              src={game.cover}
                              alt=""
                              className="h-20 w-20 rounded-xl object-cover [image-rendering:pixelated]"
                            />
                          ) : (
                            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-red-400/10 text-red-300">
                              <Gamepad2 className="h-7 w-7" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold text-slate-100">{game.title}</h3>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {game.description}
                            </p>
                            <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-slate-600">
                              {game.author}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <a
                            href={game.licenseUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold text-slate-500 hover:text-slate-300"
                          >
                            {game.license} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() => playCatalogRom(game)}
                            disabled={busy}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5" /> Jugar
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
                    <p className="text-sm font-semibold text-slate-400">Sin juegos disponibles.</p>
                  </div>
                )}
              </section>
            )}

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111521] p-3 shadow-[0_30px_100px_-30px_rgba(239,68,68,0.35)] sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                    {session?.title ?? "Esperando cartucho"}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">
                    {busy ? "Inicializando" : session ? "mGBA activo" : "Sin cartucho"}
                  </p>
                </div>
                {session && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Cambiar cartucho
                  </button>
                )}
              </div>

              <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-black sm:min-h-[440px]">
                {session ? (
                  <div id="gba-emulator" className="h-full min-h-[280px] w-full sm:min-h-[440px]" />
                ) : (
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
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Gamepad2 className="h-4 w-4 text-red-400" /> Mi ROM
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
                onClick={() => (session ? window.location.reload() : fileInputRef.current?.click())}
                disabled={busy}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm font-bold text-red-200 transition hover:border-red-300/45 hover:bg-red-400/15 disabled:opacity-50"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {session ? "Cambiar cartucho" : "Cargar mi ROM .gba"}
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

          </aside>
        </section>

        <p className="mt-8 text-center text-[10px] leading-relaxed text-slate-600">
          Usá archivos que tengas derecho a utilizar.
        </p>
      </main>
    </div>
  );
}
