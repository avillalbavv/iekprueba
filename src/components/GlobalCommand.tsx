import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { DATA } from "@/lib/poliplanner";
import { AVISOS } from "@/data/avisos";
import { TRAMITES } from "@/data/calendario-academico";
import { normalizeAcademicName } from "@/lib/search";
const routes = [
  ["/radar-academico", "Mi Semestre"],
  ["/plan-de-estudio", "Planificador de estudio"],
  ["/poliplanner", "Planificador IEK y asistente de horario"],
  ["/asistencia", "Calculadora de asistencia"],
  ["/calculadora", "Calculadora de notas"],
  ["/promedio", "Promedio general"],
  ["/aulas", "Dónde rindo"],
  ["/calendario-academico", "Calendario académico"],
  ["/avisos", "Avisos"],
  ["/recursos", "Recursos"],
  ["/manual-de-bichos", "Manual de ingresantes"],
] as const;
export function GlobalCommand({
  menu = false,
  onOpen,
  onClose,
}: {
  menu?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
} = {}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const closeCommand = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") closeCommand();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [closeCommand]);
  const items = useMemo(() => {
    const base = [
      ...routes.map(([to, label]) => ({ to, label, kind: "Herramienta" })),
      ...DATA.map((s) => ({
        to: "/poliplanner",
        label: `${s.materia} · sección ${s.seccion}`,
        kind: "Materia",
      })),
      ...AVISOS.map((a) => ({ to: "/avisos", label: a.titulo, kind: "Aviso" })),
      ...TRAMITES.map((t) => ({ to: "/calendario-academico", label: t.titulo, kind: "Trámite" })),
    ];
    const q = normalizeAcademicName(query);
    return base.filter((i) => !q || normalizeAcademicName(i.label).includes(q)).slice(0, 18);
  }, [query]);
  return (
    <>
      {
        <button
          onClick={() => {
            onOpen?.();
            setOpen(true);
          }}
          aria-label="Buscar en el sitio"
          className={
            menu
              ? "flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-foreground/6 hover:text-foreground"
              : "rounded-md p-2 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          }
        >
          <Search className="h-4 w-4" />
          {menu && <span>Buscar en el sitio</span>}
        </button>
      }
      {open && (
        <div
          className="fixed inset-0 z-[200] bg-background/70 p-4 pt-[10vh] backdrop-blur-sm"
          onMouseDown={closeCommand}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buscador global"
            onMouseDown={(e) => e.stopPropagation()}
            className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border p-4">
              <Search className="h-5 w-5 text-primary" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar materias, herramientas, avisos o trámites…"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
              <button onClick={closeCommand}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-2">
              {items.map((i, index) => (
                <a
                  key={`${i.to}-${i.label}-${index}`}
                  href={i.to}
                  onClick={closeCommand}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm hover:bg-foreground/5"
                >
                  <span>{i.label}</span>
                  <span className="text-xs text-muted-foreground">{i.kind}</span>
                </a>
              ))}
              {!items.length && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No se encontraron resultados.
                </p>
              )}
            </div>
            <p className="border-t border-border p-3 text-center text-xs text-muted-foreground">
              Atajo: Ctrl + K · Navegación compatible con teclado
            </p>
          </div>
        </div>
      )}
    </>
  );
}
