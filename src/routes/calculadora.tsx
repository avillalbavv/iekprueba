/**
 * /calculadora — Calculadora de Notas IEK
 *
 * Reescrita según el Reglamento Académico de Carreras de Grado de la
 * FP-UNA, Resolución 25/15/68-00, Art. 12° y 15°.
 * Reemplaza la fórmula del Reglamento de Cátedra 2016 (PF=0,6EF+0,4PP),
 * que este reglamento deroga.
 *
 * Fórmulas vigentes:
 *   PPEP1 = 0,5 × Primer Parcial + 0,5 × (demás actividades de Etapa 1)
 *   PPEP2 = 0,5 × Segundo Parcial + 0,5 × (demás actividades de Etapa 2)
 *   PEP   = (PPEP1 + PPEP2) / 2
 *   RP    = 0,4 × EF + 0,6 × PEP                              (Art. 15.a)
 *
 * Reglas obligatorias:
 *   - EF < 50% → reprobado siempre, sin excepción (Art. 15.a).
 *   - Derecho a Evaluación Final requiere PEP ≥ 60% (Art. 13.b.1),
 *     ADEMÁS de las condiciones de asistencia (ver /asistencia) y las
 *     administrativas (sin sanciones, requisitos de cátedra).
 *   - Si hay prácticas de laboratorio obligatorias entre las "demás
 *     actividades" de una etapa, deben ponderar ≥15% en esa etapa
 *     (Art. 12.f).
 *
 * Escala: 0-59→1 Insuficiente | 60-70→2 Aceptable | 71-80→3 Bueno |
 *         81-90→4 Distinguido | 91-100→5 Sobresaliente (Art. 15.b)
 *
 * Nota: el reglamento no contempla ningún mecanismo de "promoción" que
 * exima de rendir el Examen Final — por eso esta calculadora no muestra
 * ese estado; solo Aprobado / Reprobado / Habilitado / Pendiente.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useId, useEffect } from "react";
import {
  Calculator,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Plus,
  Trash2,
  ListChecks,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import {
  calculatePep,
  calculateRp,
  calculateStageScore,
  clampAcademic as clamp,
  getFinalGrade,
  getRequiredFinalExamScore,
  parseAcademicNumber as toNum,
  roundFinalAcademicResult as reglamentarRound,
} from "@/lib/calculadora-notas";
import { writeLocalState } from "@/lib/user-state";

export const Route = createFileRoute("/calculadora")({ component: CalculadoraPage });
const STORAGE_KEY_CALCULADORA = "iek-calculadora-notas:v1";

/* ================================================================
   CONSTANTES (Art. 15°, tabla de escala)
================================================================ */
const GRADE_TARGETS = [
  { nota: 2, nombre: "Aceptable", color: "#a78bfa" },
  { nota: 3, nombre: "Bueno", color: "#3b82f6" },
  { nota: 4, nombre: "Distinguido", color: "#22d3ee" },
  { nota: 5, nombre: "Sobresaliente", color: "#34d399" },
] as const;

const EF_MIN_OBLIGATORIO = 50; // Art. 15.a
const PEP_MIN_HABILITANTE = 60; // Art. 13.b.1
const LAB_MIN_PONDERACION = 15; // Art. 12.f

/* ================================================================
   HELPERS
================================================================ */
function validarCampo(s: string, min = 0, max = 100): string | null {
  if (s.trim() === "") return null;
  const n = toNum(s);
  if (n === null) return "Usá solo números, con punto o coma decimal";
  const decimalPart = s.trim().replace(",", ".").split(".")[1];
  if (decimalPart && decimalPart.length > 1) return "Ingresá como máximo un decimal";
  if (n < min) return `Mínimo ${min}`;
  if (n > max) return `Máximo ${max}`;
  return null;
}

interface Actividad {
  id: string;
  nombre: string;
  nota: string;
  porcentaje: string;
  esLaboratorio: boolean;
}

function nuevaActividad(): Actividad {
  return { id: crypto.randomUUID(), nombre: "", nota: "", porcentaje: "", esLaboratorio: false };
}

/* ================================================================
   SUB-COMPONENTES
================================================================ */
function Campo({
  label,
  sublabel,
  value,
  onChange,
  error,
  unit = "",
  min = 0,
  max = 100,
  compact = false,
  required = true,
}: {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  unit?: string;
  min?: number;
  max?: number;
  compact?: boolean;
  required?: boolean;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <div className="space-y-1.5">
      <div>
        <label
          htmlFor={inputId}
          className={`font-semibold text-foreground ${compact ? "text-[11px]" : "text-xs"}`}
        >
          {label}
          {required && (
            <span className="ml-1 text-primary" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {sublabel && <p className="text-[11px] text-muted-foreground">{sublabel}</p>}
      </div>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          pattern="-?[0-9]*[.,]?[0-9]*"
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={error ? errorId : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,0"
          className={`w-full rounded-xl border bg-background/50 text-center font-bold tracking-wide transition focus:outline-none focus:ring-2 focus:ring-primary/40
            ${compact ? "px-3 py-2 text-base" : "px-4 py-3 text-xl"}
            ${error ? "border-destructive text-destructive" : "border-border text-foreground"}`}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function EfBar({ efNeeded }: { efNeeded: number }) {
  const pct = clamp(efNeeded, 0, 100);
  const color =
    efNeeded <= 60
      ? "#34d399"
      : efNeeded <= 80
        ? "#22d3ee"
        : efNeeded <= 95
          ? "#fbbf24"
          : "#f87171";
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function NotaCard({
  nota,
  nombre,
  color,
  requiredScore,
  gradeAtMinimum,
}: {
  nota: number;
  nombre: string;
  color: string;
  requiredScore: number | null;
  gradeAtMinimum: number;
}) {
  const imposible = requiredScore === null;
  const esSoloMinimo = requiredScore === EF_MIN_OBLIGATORIO;

  let mensaje = "";
  let icono: React.ReactNode;

  if (imposible) {
    mensaje = "Imposible de alcanzar con el puntaje acumulado actual.";
    icono = <XCircle className="h-5 w-5 flex-shrink-0 text-destructive" />;
  } else if (esSoloMinimo) {
    mensaje = `Con el mínimo obligatorio del 50% ya alcanzás al menos la nota ${gradeAtMinimum}.`;
    icono = <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color }} />;
  } else {
    mensaje = `Necesitás al menos ${requiredScore.toFixed(1)}% en el examen final.`;
    icono =
      requiredScore <= 80 ? (
        <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color }} />
      ) : (
        <HelpCircle className="h-5 w-5 flex-shrink-0 text-amber-400" />
      );
  }

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${imposible ? "opacity-50 border-border bg-muted/30" : "border-border bg-card"}`}
      style={!imposible ? { borderLeft: `4px solid ${color}` } : {}}
    >
      <div className="flex items-start gap-3">
        {icono}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-lg font-black"
              style={!imposible ? { color } : { color: "var(--muted-foreground)" }}
            >
              {nota}
            </span>
            <span className="text-sm font-semibold text-foreground">{nombre}</span>
            {!imposible && !esSoloMinimo && (
              <span className="ml-auto text-xl font-black tabular-nums" style={{ color }}>
                {requiredScore!.toFixed(1)}%
              </span>
            )}
            {!imposible && esSoloMinimo && (
              <span className="ml-auto text-sm font-bold" style={{ color }}>
                50% (mín.)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mensaje}</p>
          {!imposible && <EfBar efNeeded={requiredScore!} />}
        </div>
      </div>
    </div>
  );
}

/** Bloque de una etapa: 1 parcial + N actividades "demás" con nombre/nota/% libres */
function EtapaBlock({
  numero,
  parcial,
  onParcial,
  parcialError,
  actividades,
  onActividades,
}: {
  numero: 1 | 2;
  parcial: string;
  onParcial: (v: string) => void;
  parcialError: string | null;
  actividades: Actividad[];
  onActividades: (a: Actividad[]) => void;
}) {
  const sumaPct = actividades.reduce((s, a) => s + (toNum(a.porcentaje) ?? 0), 0);
  const pctInvalido =
    actividades.length > 0 &&
    Math.abs(sumaPct - 100) > 1e-8 &&
    actividades.every((a) => a.porcentaje.trim() !== "");
  const labs = actividades.filter((a) => a.esLaboratorio);
  const labBajoPiso = labs.some((l) => (toNum(l.porcentaje) ?? 0) < LAB_MIN_PONDERACION);

  function actualizar(id: string, patch: Partial<Actividad>) {
    onActividades(actividades.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function agregar() {
    onActividades([...actividades, nuevaActividad()]);
  }
  function quitar(id: string) {
    onActividades(actividades.filter((a) => a.id !== id));
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display font-semibold text-base flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
          Etapa {numero}
        </h2>
      </div>

      <Campo
        label={`${numero === 1 ? "Primer" : "Segundo"} Examen Parcial`}
        sublabel="0 – 100 · pesa 50% de esta etapa"
        value={parcial}
        onChange={onParcial}
        error={parcialError}
      />

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">
            Demás actividades evaluativas de esta etapa
          </p>
          <span className="text-[11px] text-muted-foreground">pesan 50% en conjunto</span>
        </div>

        {actividades.length === 0 && (
          <p className="text-xs text-muted-foreground italic mb-2">
            Sin actividades cargadas — se asume que el parcial equivale al 100% de esta etapa.
          </p>
        )}

        <div className="space-y-3">
          {actividades.map((a) => (
            <div key={a.id} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={a.nombre}
                  onChange={(e) => actualizar(a.id, { nombre: e.target.value })}
                  placeholder="Ej: Trabajo práctico, laboratorio, taller…"
                  className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={() => quitar(a.id)}
                  aria-label="Quitar actividad"
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo
                  compact
                  label="Nota"
                  value={a.nota}
                  onChange={(v) => actualizar(a.id, { nota: v })}
                  error={validarCampo(a.nota)}
                />
                <Campo
                  compact
                  label="% en esta etapa"
                  value={a.porcentaje}
                  onChange={(v) => actualizar(a.id, { porcentaje: v })}
                  error={validarCampo(a.porcentaje, 1, 100)}
                  unit="%"
                  min={1}
                  max={100}
                />
              </div>
              <label className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={a.esLaboratorio}
                  onChange={(e) => actualizar(a.id, { esLaboratorio: e.target.checked })}
                  className="h-3 w-3 accent-primary"
                />
                Es una práctica de laboratorio obligatoria (mínimo 15% si corresponde)
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={agregar}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar actividad
        </button>

        {actividades.length > 0 && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl px-4 py-3 border text-xs ${
              pctInvalido
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-foreground/5 border-border text-muted-foreground"
            }`}
          >
            {pctInvalido ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> Los porcentajes suman{" "}
                {sumaPct}% — deberían sumar exactamente 100% entre todas las actividades de esta
                etapa.
              </>
            ) : (
              <>
                <Info className="h-3.5 w-3.5 flex-shrink-0" /> Suma actual:{" "}
                <strong className="mx-1 text-foreground">{sumaPct}%</strong>
              </>
            )}
          </div>
        )}
        {labBajoPiso && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            El reglamento exige que las prácticas de laboratorio obligatorias ponderen al menos{" "}
            {LAB_MIN_PONDERACION}% dentro de esta etapa (Art. 12.f).
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   PÁGINA PRINCIPAL
================================================================ */
function CalculadoraPage() {
  const [parcial1, setParcial1] = useState("");
  const [actividades1, setActividades1] = useState<Actividad[]>([]);
  const [parcial2, setParcial2] = useState("");
  const [actividades2, setActividades2] = useState<Actividad[]>([]);
  const [ef, setEf] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CALCULADORA);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{
          parcial1: string;
          actividades1: Actividad[];
          parcial2: string;
          actividades2: Actividad[];
          ef: string;
        }>;
        if (typeof saved.parcial1 === "string") setParcial1(saved.parcial1);
        if (Array.isArray(saved.actividades1)) setActividades1(saved.actividades1);
        if (typeof saved.parcial2 === "string") setParcial2(saved.parcial2);
        if (Array.isArray(saved.actividades2)) setActividades2(saved.actividades2);
        if (typeof saved.ef === "string") setEf(saved.ef);
      }
    } catch {
      /* conservar formulario vacío si el respaldo no es válido */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      writeLocalState(
        STORAGE_KEY_CALCULADORA,
        JSON.stringify({ parcial1, actividades1, parcial2, actividades2, ef }),
      );
    } catch {
      /* la calculadora sigue funcionando aunque el almacenamiento falle */
    }
  }, [hydrated, parcial1, actividades1, parcial2, actividades2, ef]);

  const errores = useMemo(
    () => ({
      parcial1: validarCampo(parcial1),
      parcial2: validarCampo(parcial2),
      ef: validarCampo(ef),
    }),
    [parcial1, parcial2, ef],
  );

  function calcularPPEP(parcial: string, actividades: Actividad[]): number | null {
    const nParcial = toNum(parcial);
    if (nParcial === null) return null;
    if (actividades.length === 0) return clamp(nParcial, 0, 100);
    const errorActividad = actividades.some(
      (a) =>
        validarCampo(a.nota) ||
        validarCampo(a.porcentaje, 1, 100) ||
        toNum(a.nota) === null ||
        toNum(a.porcentaje) === null,
    );
    if (errorActividad) return null;
    return calculateStageScore(
      nParcial,
      actividades.map((a) => ({ nota: toNum(a.nota)!, porcentaje: toNum(a.porcentaje)! })),
    );
  }

  const ppep1 = useMemo(() => calcularPPEP(parcial1, actividades1), [parcial1, actividades1]);
  const ppep2 = useMemo(() => calcularPPEP(parcial2, actividades2), [parcial2, actividades2]);
  const pep = useMemo(
    () => (ppep1 !== null && ppep2 !== null ? calculatePep(ppep1, ppep2) : null),
    [ppep1, ppep2],
  );

  const habilitado = pep !== null && pep >= PEP_MIN_HABILITANTE;
  const gradeAtMinimum = useMemo(
    () => (pep === null ? 1 : getFinalGrade(EF_MIN_OBLIGATORIO, pep)),
    [pep],
  );

  const resultadoEf = useMemo(() => {
    if (pep === null || ef.trim() === "" || errores.ef) return null;
    const nEf = toNum(ef)!;
    const rp = calculateRp(nEf, pep);
    const reprobadoPorEf = nEf < EF_MIN_OBLIGATORIO;
    const notaFinal = getFinalGrade(nEf, pep);
    return {
      ef: nEf,
      rp,
      nota: notaFinal,
      reprobadoPorEf,
      calificacion: ["Insuficiente", "Aceptable", "Bueno", "Distinguido", "Sobresaliente"][
        notaFinal - 1
      ],
      color: ["#f87171", "#a78bfa", "#3b82f6", "#22d3ee", "#34d399"][notaFinal - 1],
    };
  }, [pep, ef, errores.ef]);

  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        <section className="relative overflow-hidden pt-16 pb-12 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Link to="/" className="hover:text-foreground transition-colors">
                  Inicio
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">Calculadora de Notas</span>
              </div>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">
                <Calculator className="h-3.5 w-3.5 text-primary" /> Reglamento Académico FP-UNA 2026
              </span>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                Calculadora de <span className="text-gradient">Notas</span>
              </h1>
              <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
                Cargá tus dos etapas evaluativas y descubrí{" "}
                <strong className="text-foreground">qué necesitás en el examen final</strong> para
                alcanzar cada calificación.
              </p>
              <Link
                to="/reglamento-2026"
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver qué cambió en el reglamento 2026 <ChevronRight className="h-3 w-3" />
              </Link>
            </Reveal>
          </div>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-6">
            <Reveal>
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div className="text-sm">
                  <strong className="text-foreground">Regla obligatoria (Art. 15°):</strong>{" "}
                  <span className="text-muted-foreground">
                    si tu examen final es menor al <strong className="text-amber-400">50%</strong>,
                    la materia queda{" "}
                    <strong className="text-red-400">reprobada automáticamente</strong>, sin
                    importar tu PEP acumulado. Además, para tener{" "}
                    <strong className="text-foreground">derecho</strong> a rendir el final necesitás
                    un PEP de al menos{" "}
                    <strong className="text-amber-400">{PEP_MIN_HABILITANTE}%</strong> (Art. 13°) —
                    y cumplir la asistencia mínima que calcula la{" "}
                    <Link to="/asistencia" className="text-primary hover:underline">
                      Calculadora de Asistencia
                    </Link>
                    .
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 px-5 py-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="text-sm">
                    <strong className="text-foreground">Ejemplo rápido:</strong>{" "}
                    <span className="text-muted-foreground">
                      con un PEP de <strong className="text-foreground">85,63</strong> y un examen
                      final de <strong className="text-foreground">73</strong>, el rendimiento es
                      0,4 × 73 + 0,6 × 85,63 = 80,578. Se redondea a 81 y corresponde a la{" "}
                      <strong className="text-primary">nota 4</strong>.
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal variant="stagger" className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-5">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">*</span> Campos obligatorios para
                  calcular el PEP. Podés escribir hasta un decimal, con punto o coma.
                </p>
                <EtapaBlock
                  numero={1}
                  parcial={parcial1}
                  onParcial={setParcial1}
                  parcialError={errores.parcial1}
                  actividades={actividades1}
                  onActividades={setActividades1}
                />
                <EtapaBlock
                  numero={2}
                  parcial={parcial2}
                  onParcial={setParcial2}
                  parcialError={errores.parcial2}
                  actividades={actividades2}
                  onActividades={setActividades2}
                />

                <div className="glass rounded-2xl p-6">
                  <h2 className="font-display font-semibold text-base mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    ¿Ya tenés tu nota del final? (opcional)
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Ingresá tu nota del examen final para ver el Rendimiento Porcentual real.
                    <br />
                    <strong className="text-amber-400">Mínimo obligatorio: 50%.</strong>
                  </p>
                  <Campo
                    label="Nota Examen Final"
                    sublabel="0 – 100 · admite punto o coma decimal"
                    value={ef}
                    onChange={setEf}
                    error={errores.ef}
                    required={false}
                  />

                  {resultadoEf && (
                    <div
                      className="mt-4 rounded-xl border p-4 text-center"
                      style={
                        resultadoEf.reprobadoPorEf
                          ? {
                              background: "rgba(248,113,113,0.1)",
                              borderColor: "rgba(248,113,113,0.3)",
                            }
                          : {
                              background: `${resultadoEf.color}18`,
                              borderColor: `${resultadoEf.color}40`,
                            }
                      }
                    >
                      {resultadoEf.reprobadoPorEf ? (
                        <>
                          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                          <p className="font-bold text-red-400 text-lg">Reprobado</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            El examen final ({resultadoEf.ef}%) no alcanza el mínimo obligatorio del
                            50%. No aprobás la materia independientemente del PEP acumulado.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-4xl font-black" style={{ color: resultadoEf.color }}>
                            {resultadoEf.nota}
                          </p>
                          <p
                            className="font-semibold text-sm mt-1"
                            style={{ color: resultadoEf.color }}
                          >
                            {resultadoEf.calificacion}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            RP = 0,4×{resultadoEf.ef} + 0,6×{pep!.toFixed(2)} ={" "}
                            {resultadoEf.rp.toFixed(2)} → redondeado:{" "}
                            {reglamentarRound(resultadoEf.rp)}
                          </p>
                          <CheckCircle2
                            className="h-5 w-5 mx-auto mt-2"
                            style={{ color: resultadoEf.color }}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ RESULTADOS ═══ */}
              <div className="lg:col-span-2">
                <div className="sticky top-[84px] space-y-4">
                  {/* Paso a paso */}
                  <div className="glass-strong rounded-2xl p-5">
                    <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <ListChecks className="h-3.5 w-3.5" /> Cálculo paso a paso
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">PPEP1 (Etapa 1)</span>
                        <span className="font-bold text-foreground tabular-nums">
                          {ppep1 !== null ? ppep1.toFixed(2) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">PPEP2 (Etapa 2)</span>
                        <span className="font-bold text-foreground tabular-nums">
                          {ppep2 !== null ? ppep2.toFixed(2) : "—"}
                        </span>
                      </div>
                      <div className="h-px bg-border my-1" />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">PEP = (PPEP1+PPEP2)/2</span>
                        <span className="font-black text-primary tabular-nums text-base">
                          {pep !== null ? pep.toFixed(2) : "—"}
                        </span>
                      </div>
                    </div>

                    {pep !== null && (
                      <>
                        <div className="mt-3 h-2 rounded-full bg-foreground/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-cyan-400"
                            style={{ width: `${pep}%` }}
                          />
                        </div>
                        <div
                          className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${habilitado ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-500"}`}
                        >
                          {habilitado ? (
                            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          )}
                          {habilitado
                            ? "Habilitado por rendimiento (PEP ≥ 60%). Verificá también tu asistencia."
                            : `Todavía no llegás al 60% de PEP requerido para tener derecho al examen final.`}
                        </div>
                      </>
                    )}
                    {pep === null && (
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        Completá ambas etapas para ver el PEP
                      </p>
                    )}
                  </div>

                  {pep !== null && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        ¿Qué necesito en el examen final?
                      </p>
                      {GRADE_TARGETS.filter(({ nota }) => nota >= Math.max(2, gradeAtMinimum)).map(
                        ({ nota, nombre, color }) => {
                          const requiredScore = getRequiredFinalExamScore(pep, nota);
                          return (
                            <NotaCard
                              key={nota}
                              nota={nota}
                              nombre={nombre}
                              color={color}
                              requiredScore={requiredScore}
                              gradeAtMinimum={gradeAtMinimum}
                            />
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
