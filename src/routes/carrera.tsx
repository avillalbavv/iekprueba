/**
 * /carrera — Información completa de la carrera IEK.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  HeartPulse,
  Settings2,
  Bot,
  Radio,
  GraduationCap,
  Briefcase,
  Target,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Map,
  Zap,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/carrera")({ component: CarreraPage });

const ENFASIS = [
  {
    icon: Settings2,
    id: "control-industrial",
    color: "#3b82f6",
    title: "Control Industrial",
    desc: "Formación orientada a la automatización de procesos, sistemas de control, PLC, sensores, actuadores e instrumentación industrial. Ideal para trabajar en plantas de producción, fábricas y entornos industriales.",
    materias: [
      "Automatización Industrial",
      "Controladores Programables",
      "Instrumentación y Control",
      "Neumática e Hidráulica",
      "Sistemas de Potencia",
    ],
  },
  {
    icon: HeartPulse,
    id: "electronica-medica",
    color: "#2dd4bf",
    title: "Electrónica Médica",
    desc: "Diseño y mantenimiento de equipamiento biomédico, instrumentación médica y sistemas de diagnóstico. Orientado al sector salud, hospitales y empresas de tecnología médica.",
    materias: [
      "Electrónica Médica I, II y III",
      "Diagnóstico por Imágenes",
      "Bioseguridad",
      "Organización Hospitalaria",
      "Química Clínica",
    ],
  },
  {
    icon: Bot,
    id: "mecatronica",
    color: "#a78bfa",
    title: "Mecatrónica",
    desc: "Integración de mecánica, electrónica, control y programación para el desarrollo de sistemas inteligentes, robótica y manufactura avanzada.",
    materias: [
      "Robótica",
      "Control Automático",
      "Manufactura con CNC",
      "Inteligencia Artificial",
      "Sistemas Mecatrónicos",
    ],
  },
  {
    icon: Radio,
    id: "teleprocesamiento",
    color: "#fb923c",
    title: "Teleprocesamiento de Información",
    desc: "Telecomunicaciones, redes de datos, transmisión de señales, modulación y sistemas de comunicación. Clave para el sector de internet, telefonía y conectividad.",
    materias: [
      "Modulación I y II",
      "Redes de Datos",
      "Microondas",
      "Comunicación Satelital",
      "Protocolos de Comunicación",
    ],
  },
];

const PERFIL_EGRESADO = [
  "Diseñar, implementar y mantener sistemas electrónicos y de control",
  "Aplicar teorías de control automático y automatización",
  "Desarrollar software para sistemas embebidos y microcontroladores",
  "Analizar y procesar señales electrónicas y de telecomunicaciones",
  "Planificar y gestionar proyectos tecnológicos",
  "Aplicar principios de instrumentación y medición en entornos industriales y de salud",
  "Integrar conocimientos multidisciplinarios para resolver problemas complejos",
  "Utilizar herramientas modernas de diseño y simulación electrónica",
];

const CAMPOS_LABORALES = [
  {
    icon: Settings2,
    area: "Industria y automatización",
    desc: "Plantas de producción, fábricas, refinadoras, empresas de manufactura.",
  },
  {
    icon: Radio,
    area: "Telecomunicaciones",
    desc: "Empresas de telefonía, internet, satélites, redes de datos y fibra óptica.",
  },
  {
    icon: HeartPulse,
    area: "Sector salud",
    desc: "Hospitales, clínicas, empresas de equipamiento médico e instituciones de salud pública.",
  },
  {
    icon: Bot,
    area: "Robótica e I+D",
    desc: "Centros de investigación, universidades, empresas de tecnología avanzada.",
  },
  {
    icon: GraduationCap,
    area: "Educación e investigación",
    desc: "Docencia universitaria, investigación aplicada, publicaciones académicas.",
  },
  {
    icon: Briefcase,
    area: "Emprendimiento",
    desc: "Creación de empresas tecnológicas, consultoría, freelance, startups.",
  },
];

function CarreraPage() {
  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        {/* Header */}
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Link to="/" className="hover:text-foreground transition-colors">
                  Inicio
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">La Carrera</span>
              </div>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                Facultad Politécnica · UNA
              </span>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                Ingeniería en <br />
                <span className="text-gradient">Electrónica</span>
              </h1>
              <p className="mt-5 text-base text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
                Una carrera de 10 semestres que forma ingenieros capaces de diseñar, analizar e
                implementar sistemas electrónicos modernos en áreas como automatización,
                telecomunicaciones, electrónica médica y mecatrónica.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/mapa"
                  className="btn-premium inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-primary/40 shadow-[0_8px_30px_-8px]"
                >
                  <Map className="h-4 w-4" /> Ver mapa de materias
                </Link>
                <a
                  href="https://www.pol.una.py/carreras/iek/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium hover:bg-foreground/10 text-muted-foreground"
                >
                  <ExternalLink className="h-4 w-4" /> Sitio oficial FPUNA
                </a>
              </div>
            </Reveal>

            {/* Stats */}
            <Reveal
              variant="stagger"
              className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-2xl"
            >
              {[
                { k: "10", v: "Semestres" },
                { k: "4", v: "Énfasis" },
                { k: "5 años", v: "Duración" },
                { k: "FPUNA", v: "Facultad" },
              ].map((s) => (
                <div key={s.v} className="glass card-hover rounded-2xl p-4 text-center">
                  <div className="font-display text-xl font-bold text-gradient">{s.k}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ¿Qué es IEK? */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal variant="stagger" className="grid gap-6 lg:grid-cols-5">
              <div className="glass card-hover rounded-2xl p-8 lg:col-span-3">
                <Zap className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display text-2xl font-bold mb-4">
                  ¿Qué es Ingeniería en Electrónica?
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  La carrera de Ingeniería en Electrónica (IEK) de la Facultad Politécnica de la UNA
                  forma profesionales orientados al diseño, análisis, implementación y optimización
                  de sistemas electrónicos modernos.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Su campo de acción abarca áreas estratégicas de la tecnología: automatización
                  industrial, telecomunicaciones, electrónica médica, robótica, control de sistemas,
                  electrónica digital y microprocesadores.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Los primeros cuatro semestres constituyen el{" "}
                  <strong className="text-foreground">Plan Básico</strong> — formación común para
                  todos los estudiantes — seguidos por seis semestres de especialización en uno de
                  los cuatro énfasis disponibles.
                </p>
              </div>
              <div className="glass-strong card-hover rounded-2xl p-8 lg:col-span-2">
                <Target className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-display text-xl font-semibold mb-4">Objetivos de la carrera</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {[
                    "Formar ingenieros con sólidos fundamentos matemáticos y físicos",
                    "Desarrollar capacidades de diseño y análisis de sistemas electrónicos",
                    "Fomentar el pensamiento crítico y la resolución de problemas complejos",
                    "Promover la innovación tecnológica y el espíritu emprendedor",
                    "Preparar para el ejercicio ético de la profesión",
                  ].map((obj) => (
                    <li key={obj} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Énfasis */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted-foreground mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Cuatro caminos, una carrera
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">Énfasis disponibles</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm">
                A partir del quinto semestre, el estudiante elige uno de los cuatro énfasis de
                especialización.
              </p>
            </Reveal>

            <Reveal variant="stagger" className="grid gap-5 sm:grid-cols-2">
              {ENFASIS.map(({ icon: Icon, title, desc, color, materias }) => (
                <article
                  key={title}
                  className="glass card-hover group relative overflow-hidden rounded-2xl p-7"
                >
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ring-1 ring-foreground/10"
                      style={{ background: `${color}22` }}
                    >
                      <Icon className="h-6 w-6" style={{ color }} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Algunas materias
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {materias.map((m) => (
                        <span
                          key={m}
                          className="rounded-lg border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </Reveal>

            <Reveal className="mt-8 text-center">
              <Link
                to="/mapa"
                className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium hover:bg-foreground/10"
              >
                <Map className="h-4 w-4 text-primary" />
                Ver mapa interactivo de materias
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Perfil del egresado */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted-foreground mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Formación integral
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">Perfil del egresado</h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
                El ingeniero en Electrónica egresado de la FPUNA estará en condiciones de:
              </p>
            </Reveal>
            <Reveal
              variant="stagger"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto"
            >
              {PERFIL_EGRESADO.map((item) => (
                <div key={item} className="glass card-hover rounded-xl p-4 flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Campos laborales */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted-foreground mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Mercado laboral
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">Campos de acción profesional</h2>
            </Reveal>
            <Reveal variant="stagger" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS_LABORALES.map(({ icon: Icon, area, desc }) => (
                <div
                  key={area}
                  className="glass card-hover group flex items-start gap-4 rounded-xl p-5"
                >
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-foreground/5 ring-1 ring-foreground/10 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{area}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* Requisitos de titulación */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center mb-10">
              <h2 className="text-3xl font-bold sm:text-4xl">Requisitos de titulación</h2>
              <p className="mt-3 text-muted-foreground text-sm max-w-lg mx-auto">
                Información orientativa según la Guía Académica 2024. Verificar siempre con la
                institución.
              </p>
            </Reveal>
            <Reveal
              variant="stagger"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto"
            >
              {[
                {
                  icon: BookOpen,
                  title: "Plan de estudios",
                  body: "Aprobar todas las asignaturas del énfasis elegido.",
                },
                {
                  icon: Users,
                  title: "Extensión universitaria",
                  body: "Completar 30 horas de Extensión Universitaria.",
                },
                {
                  icon: Briefcase,
                  title: "Pasantía supervisada",
                  body: "Realizar una pasantía de 160–240 horas según el énfasis (verificar en guía oficial).",
                },
                {
                  icon: GraduationCap,
                  title: "Trabajo de Grado",
                  body: "Aprobar Anteproyecto y Proyecto de Trabajo de Grado.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="glass card-hover rounded-2xl p-6 text-center">
                  <Icon className="h-6 w-6 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </Reveal>

            <Reveal className="mt-8 text-center">
              <Link
                to="/recursos"
                className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium hover:bg-foreground/10"
              >
                <BookOpen className="h-4 w-4 text-primary" />
                Ver Guía Académica completa
              </Link>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
