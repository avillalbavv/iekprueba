/**
 * SiteNavbar v8 — mega menú.
 *
 * v7 listaba cada sección como un link suelto en la barra desktop; con 8+
 * secciones más el dropdown de Herramientas, la barra desbordaba en
 * pantallas de escritorio comunes (1280–1440px). Se reemplaza por un único
 * botón "Explorar" que abre un panel agrupado por categoría — la barra ya
 * no crece en ancho sin importar cuántas secciones se agreguen a futuro.
 */
import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu,
  X,
  Map,
  Calculator,
  ExternalLink,
  MapPin,
  ChevronDown,
  Sun,
  Moon,
  BarChart2,
  CalendarRange,
  CalendarCheck2,
  GraduationCap,
  Users,
  Bell,
  CalendarClock,
  BookOpen,
  Bug,
  ScrollText,
  Mail,
  UserRound,
  Radar,
  BookOpenCheck,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import iekLogo from "@/assets/iek-logo.png";
import { GlobalCommand } from "@/components/GlobalCommand";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/components/AuthProvider";

const NAV_PRINCIPALES = [
  { to: "/", label: "Inicio" },
  { to: "/cuenta", label: "Mi cuenta" },
  { to: "/contacto", label: "Contacto" },
];

const MEGA_MENU = [
  {
    titulo: "Institucional",
    items: [
      { to: "/carrera", label: "La Carrera", icon: GraduationCap },
      { to: "/delegacion", label: "Delegación", icon: Users },
      { to: "/avisos", label: "Avisos", icon: Bell },
      { to: "/calendario-academico", label: "Calendario Académico", icon: CalendarClock },
    ],
  },
  {
    titulo: "Recursos",
    items: [
      { to: "/recursos", label: "Recursos", icon: BookOpen },
      { to: "/manual-de-bichos", label: "Manual de Nuevos Ingresantes", icon: Bug },
      { to: "/reglamento-2026", label: "Nuevo Reglamento 2026", icon: ScrollText },
      { to: "/contacto", label: "Contacto", icon: Mail },
    ],
  },
  {
    titulo: "Herramientas",
    items: [
      { to: "/radar-academico", label: "Mi Semestre", icon: Radar },
      { to: "/poliplanner", label: "Planificador IEK", icon: CalendarRange },
      { to: "/asistencia", label: "Calculadora de Asistencia", icon: CalendarCheck2 },
      { to: "/mapa", label: "Mapa de Materias", icon: Map },
      { to: "/calculadora", label: "Calculadora de Notas", icon: Calculator },
      { to: "/promedio", label: "Promedio General", icon: BarChart2 },
      { to: "/aulas", label: "¿Dónde rindo?", icon: MapPin },
      { to: "/plan-de-estudio", label: "Planificador de estudio", icon: BookOpenCheck },
    ],
  },
];

function ThemeToggle({ menu = false }: { menu?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={
        menu
          ? "flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-foreground/6 hover:text-foreground"
          : "rounded-md p-2 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
      }
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {menu && <span>{theme === "dark" ? "Usar modo claro" : "Usar modo oscuro"}</span>}
    </button>
  );
}

export function SiteNavbar() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) setMegaOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMegaOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto max-w-6xl px-4 [margin-top:max(0.75rem,env(safe-area-inset-top))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <nav className="glass-strong flex items-center justify-between rounded-2xl px-4 py-3 glow-ring">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-3 flex-shrink-0" aria-label="Inicio">
            <img
              src={iekLogo}
              alt="Logo IEK FP-UNA"
              width={48}
              height={48}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-primary/30 transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11"
            />
            <span className="font-display text-sm font-semibold tracking-wide sm:text-base">
              <span className="text-gradient">IEK</span>{" "}
              <span className="hidden sm:inline">FP-UNA</span>
            </span>
          </Link>

          {/* Desktop: solo Inicio + botón Explorar (mega menú) + Contacto — nunca crece en ancho */}
          <div ref={megaRef} className="relative hidden items-center gap-1 xl:flex">
            <Link
              to="/"
              className="link-shimmer rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground [&.active]:text-primary [&.active]:font-medium"
            >
              Inicio
            </Link>
            <button
              onClick={() => setMegaOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={megaOpen}
              className="link-shimmer flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              Explorar
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`}
              />
            </button>
            <Link
              to="/contacto"
              className="link-shimmer rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground [&.active]:text-primary [&.active]:font-medium"
            >
              Contacto
            </Link>

            {megaOpen && (
              <div
                role="menu"
                className="absolute left-1/2 top-full mt-3 w-[640px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-border bg-popover p-6 shadow-2xl"
                style={{ zIndex: 100 }}
              >
                <div className="grid grid-cols-3 gap-6">
                  {MEGA_MENU.map((col) => (
                    <div key={col.titulo}>
                      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        {col.titulo}
                      </p>
                      <ul className="space-y-0.5">
                        {col.items.map(({ to, label, icon: Icon }) => (
                          <li key={to}>
                            <Link
                              to={to}
                              onClick={() => setMegaOpen(false)}
                              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground [&.active]:text-primary"
                            >
                              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="leading-snug">{label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="hidden xl:block">
              <GlobalCommand />
            </div>
            <NotificationBell />
            {auth.role !== "student" && (
              <Link
                to="/admin"
                aria-label="Panel administrativo"
                className="hidden rounded-md p-2 text-muted-foreground hover:bg-foreground/10 hover:text-primary xl:block"
              >
                <ShieldCheck className="h-4 w-4" />
              </Link>
            )}
            <Link
              to="/cuenta"
              aria-label="Mi cuenta"
              className="relative hidden rounded-md p-2 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground xl:block [&.active]:text-primary"
            >
              <UserRound className="h-4 w-4" />
            </Link>
            <ThemeToggle />
            <a
              href="https://www.pol.una.py/carreras/iek/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-premium hidden items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px] shadow-primary/50 lg:inline-flex"
            >
              Portal FPUNA <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              className="rounded-md p-2 transition hover:bg-foreground/5 xl:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu — agrupado por las mismas categorías que el mega menú de escritorio */}
        {open && (
          <div className="mt-2 max-h-[75vh] animate-fade-in overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-2xl xl:hidden">
            <div className="mb-1">
              <GlobalCommand menu onClose={() => setOpen(false)} />
              {auth.role !== "student" && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-foreground/6 hover:text-primary"
                >
                  <ShieldCheck className="h-4 w-4" /> Panel administrativo
                </Link>
              )}
            </div>
            <div className="mx-2 my-1 h-px bg-foreground/8" />
            {NAV_PRINCIPALES.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:translate-x-1 hover:bg-foreground/6 hover:text-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
              >
                {label}
              </Link>
            ))}
            {MEGA_MENU.map((col) => (
              <div key={col.titulo}>
                <div className="my-1 h-px bg-foreground/8 mx-2" />
                <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  {col.titulo}
                </p>
                {col.items.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:translate-x-1 hover:bg-foreground/6 hover:text-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="my-2 h-px bg-foreground/8 mx-2" />
            <a
              href="https://www.pol.una.py/carreras/iek/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              Portal FPUNA · IEK
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
