/**
 * /delegacion — Delegación Estudiantil IEK FPUNA
 * Estructura: Delegado General + Workgroup
 * Para agregar integrantes: editar los arrays DELEGADO_GENERAL y WORKGROUP.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Target,
  CheckSquare,
  MessageSquare,
  Instagram,
  Mail,
  Megaphone,
  Lightbulb,
  CalendarDays,
  BookOpen,
  Network,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  UserCircle2,
  Star,
  Wrench,
  Facebook,
  Youtube,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/delegacion")({ component: DelegacionPage });

/* ============================================================
   DATOS DEL EQUIPO — editar aquí para actualizar integrantes
   ============================================================ */
const DELEGADO_GENERAL = {
  nombre: "Univ. Matías Benítez",
  rol: "Delegado",
  descripcion:
    "Representante principal de los estudiantes de Ingeniería en Electrónica ante las autoridades de la Facultad Politécnica — UNA.",
  instagram: "https://www.instagram.com/iek_fpuna/",
};

/**
 * Para agregar un integrante al Workgroup, agregar un objeto al array:
 * { nombre: "Nombre Apellido", rol: "Descripción del rol", area: "Área" }
 * Areas disponibles: "Comunicación" | "Académico" | "Eventos" | "Tecnología" | "General"
 */
const WORKGROUP: { nombre: string; rol: "Miembro de Delegación" }[] = [
  { nombre: "Univ. Mery Ávalos", rol: "Miembro de Delegación" },
  { nombre: "Univ. Fabiana Cáceres", rol: "Miembro de Delegación" },
  { nombre: "Univ. Diego Echeverría", rol: "Miembro de Delegación" },
  { nombre: "Univ. Giovanni Ferreira", rol: "Miembro de Delegación" },
  { nombre: "Univ. Jesús Florentín", rol: "Miembro de Delegación" },
  { nombre: "Univ. Fabricio Lemir", rol: "Miembro de Delegación" },
  { nombre: "Univ. Matías Martín", rol: "Miembro de Delegación" },
  { nombre: "Univ. Agustín Martínez", rol: "Miembro de Delegación" },
  { nombre: "Univ. Enzo Martínez", rol: "Miembro de Delegación" },
  { nombre: "Univ. Carlos Matiauda", rol: "Miembro de Delegación" },
  { nombre: "Univ. Fabrizio Mendoza", rol: "Miembro de Delegación" },
  { nombre: "Univ. Johann Saldívar", rol: "Miembro de Delegación" },
  { nombre: "Univ. Alejandro Villalba", rol: "Miembro de Delegación" },
];

const FUNCIONES = [
  {
    icon: MessageSquare,
    title: "Comunicación",
    desc: "Canal de comunicación entre los estudiantes y la institución, difundiendo avisos y novedades.",
  },
  {
    icon: Megaphone,
    title: "Representación",
    desc: "Representamos los intereses de los estudiantes de IEK ante las autoridades académicas.",
  },
  {
    icon: Lightbulb,
    title: "Talleres y charlas",
    desc: "Organizamos actividades de formación complementaria, charlas técnicas y talleres prácticos.",
  },
  {
    icon: CalendarDays,
    title: "Eventos",
    desc: "Coordinamos jornadas de integración, actividades culturales y eventos estudiantiles.",
  },
  {
    icon: BookOpen,
    title: "Apoyo académico",
    desc: "Facilitamos recursos, información sobre la malla curricular y acompañamiento durante la carrera.",
  },
  {
    icon: Network,
    title: "Comunidad",
    desc: "Fortalecemos los vínculos entre estudiantes de distintos semestres y énfasis.",
  },
  {
    icon: ShieldCheck,
    title: "Transparencia",
    desc: "Actuamos con responsabilidad, transparencia y compromiso hacia la comunidad IEK.",
  },
  {
    icon: Users,
    title: "Integración",
    desc: "Promovemos la participación activa e integración de todos los estudiantes.",
  },
];

function DelegacionPage() {
  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main>
        {/* ===== HEADER ===== */}
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <Link to="/" className="hover:text-foreground transition-colors">
                  Inicio
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">Delegación</span>
              </div>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">
                <Users className="h-3.5 w-3.5 text-primary" />
                Representación Estudiantil
              </span>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                Delegación <br />
                <span className="text-gradient">Estudiantil IEK</span>
              </h1>
              <p className="mt-5 text-base text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
                Somos el espacio de representación, comunicación y acompañamiento de los estudiantes
                de Ingeniería en Electrónica de la FPUNA.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ===== MISIÓN Y OBJETIVOS ===== */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal variant="stagger" className="grid gap-6 lg:grid-cols-2">
              <div className="glass card-hover rounded-2xl p-8">
                <Target className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display text-2xl font-bold mb-4">Nuestra misión</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  La Delegación Estudiantil IEK busca ser un puente real entre los estudiantes de la
                  carrera y la institución, fomentando la participación activa, la comunicación
                  fluida y el fortalecimiento de la comunidad estudiantil.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Queremos que cada estudiante de IEK se sienta acompañado, informado y representado
                  durante toda su trayectoria académica.
                </p>
              </div>
              <div className="glass-strong card-hover rounded-2xl p-8">
                <CheckSquare className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display text-2xl font-bold mb-4">Objetivos</h2>
                <ul className="space-y-3">
                  {[
                    "Representar los intereses y necesidades de los estudiantes de IEK",
                    "Facilitar la comunicación entre estudiantes e institución",
                    "Organizar actividades de formación, integración y apoyo académico",
                    "Difundir oportunidades, becas, eventos y novedades relevantes",
                    "Fortalecer el sentido de comunidad y pertenencia en la carrera",
                    "Actuar con transparencia, responsabilidad y ética estudiantil",
                  ].map((obj) => (
                    <li key={obj} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span className="text-sm text-muted-foreground leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== DELEGADO GENERAL ===== */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted-foreground mb-4">
                <Star className="h-3.5 w-3.5 text-primary" /> Autoridad principal
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">Delegado</h2>
            </Reveal>

            <Reveal>
              <div className="mx-auto max-w-lg">
                <div className="glass-strong card-hover rounded-3xl p-8 text-center relative overflow-hidden">
                  {/* Glow decorativo */}
                  <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
                  <div className="relative">
                    {/* Avatar */}
                    <div className="mx-auto mb-5 grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 ring-4 ring-primary/25 ring-offset-4 ring-offset-transparent">
                      <UserCircle2 className="h-14 w-14 text-primary/60" />
                    </div>
                    {/* Rol badge */}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary border border-primary/25 mb-3">
                      <Star className="h-3 w-3" />
                      {DELEGADO_GENERAL.rol}
                    </span>
                    <h3 className="font-display text-2xl font-bold text-foreground mt-2">
                      {DELEGADO_GENERAL.nombre}
                    </h3>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      {DELEGADO_GENERAL.descripcion}
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                      <a
                        href={DELEGADO_GENERAL.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-foreground/10"
                      >
                        <Instagram className="h-4 w-4 text-pink-400" />
                        Instagram
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== WORKGROUP ===== */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted-foreground mb-4">
                <Wrench className="h-3.5 w-3.5 text-primary" /> Equipo de trabajo
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">Miembros de la Delegación</h2>
              <p className="mt-3 text-muted-foreground text-sm max-w-md mx-auto">
                Equipo de representación y acompañamiento estudiantil de IEK.
              </p>
            </Reveal>

            <Reveal variant="stagger" className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {WORKGROUP.map((miembro) => {
                return (
                  <div
                    key={miembro.nombre}
                    className="glass card-hover group rounded-2xl p-6 text-center"
                  >
                    {/* Avatar placeholder */}
                    <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full border-2 border-primary/25 bg-primary/10 ring-2 ring-primary/30 ring-offset-2 ring-offset-transparent transition-transform duration-300 group-hover:scale-105">
                      <UserCircle2 className="h-10 w-10 text-primary/60" />
                    </div>
                    <span
                      className="inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{
                        background: "rgba(59,130,246,0.1)",
                        color: "#3b82f6",
                        border: "1px solid rgba(59,130,246,0.25)",
                      }}
                    >
                      {miembro.rol}
                    </span>
                    <p className="font-semibold text-foreground text-sm">{miembro.nombre}</p>
                  </div>
                );
              })}
            </Reveal>
          </div>
        </section>

        {/* ===== FUNCIONES ===== */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1 text-xs text-muted-foreground mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> ¿Qué hacemos?
              </div>
              <h2 className="text-3xl font-bold sm:text-4xl">Funciones de la Delegación</h2>
            </Reveal>
            <Reveal variant="stagger" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FUNCIONES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="glass card-hover group rounded-xl p-5">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-foreground/5 ring-1 ring-foreground/10 transition-transform duration-300 group-hover:scale-110 mb-3">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ===== CTA CONTACTO ===== */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal variant="zoom">
              <div className="relative overflow-hidden rounded-3xl glass-strong p-10 sm:p-14">
                <div className="float-slow absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
                <div className="relative grid gap-8 lg:grid-cols-2 items-center">
                  <div>
                    <h2 className="text-3xl font-bold sm:text-4xl mb-4">
                      Contactá a la Delegación
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      ¿Tenés una consulta, propuesta o querés sumarte? Escribinos por redes o
                      mediante el formulario.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href="https://www.instagram.com/iek_fpuna/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-foreground/10"
                      >
                        <Instagram className="h-4 w-4 text-pink-400" /> @iek_fpuna
                      </a>
                      <a
                        href="https://www.facebook.com/DelegacionIEK"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-foreground/10"
                      >
                        <Facebook className="h-4 w-4 text-blue-500" /> Facebook
                      </a>
                      <a
                        href="https://www.youtube.com/channel/UCoJV8IlpUXYba0VhD1oL8FQ"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-foreground/10"
                      >
                        <Youtube className="h-4 w-4 text-red-500" /> YouTube
                      </a>
                      <a
                        href="mailto:delegacioniek@gmail.com"
                        className="btn-premium glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-foreground/10"
                      >
                        <Mail className="h-4 w-4 text-primary" /> Correo
                      </a>
                      <Link
                        to="/contacto"
                        className="btn-premium inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
                      >
                        Formulario <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                  <div className="glass rounded-2xl p-6">
                    <h3 className="font-display font-semibold text-lg mb-3">Participá</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      La Delegación está abierta a todos los estudiantes de IEK. Si tenés ideas o
                      querés sumarte al equipo, no dudes en contactarnos.
                    </p>
                  </div>
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
