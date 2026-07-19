import { Link } from "@tanstack/react-router";
import { ExternalLink, Facebook, Instagram, Mail, Youtube } from "lucide-react";
import iekLogo from "@/assets/iek-logo.png";

const CONTACTS = [
  {
    icon: Instagram,
    label: "Instagram",
    text: "@iek_fpuna",
    href: "https://www.instagram.com/iek_fpuna/",
  },
  {
    icon: Facebook,
    label: "Facebook",
    text: "Delegación IEK",
    href: "https://www.facebook.com/DelegacionIEK",
  },
  {
    icon: Youtube,
    label: "YouTube",
    text: "Delegación IEK",
    href: "https://www.youtube.com/channel/UCoJV8IlpUXYba0VhD1oL8FQ",
  },
  {
    icon: Mail,
    label: "Correo",
    text: "delegacioniek@gmail.com",
    href: "mailto:delegacioniek@gmail.com",
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border bg-background/30 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid items-start gap-10 text-center md:grid-cols-2 md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={iekLogo}
                alt="Logo IEK FP-UNA"
                width={60}
                height={60}
                className="h-15 w-15 rounded-full object-cover ring-1 ring-primary/30"
              />
              <div>
                <p className="font-display text-base font-semibold">Delegación Estudiantil</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Ingeniería en Electrónica · FP-UNA
                </p>
              </div>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Comunicación, representación y acompañamiento para la comunidad estudiantil de
              Ingeniería en Electrónica.
            </p>
            <a
              href="https://www.pol.una.py/carreras/iek/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Portal oficial de la FP-UNA
            </a>
          </div>

          <div className="md:justify-self-end">
            <h2 className="font-display text-base font-semibold">Contacto y redes</h2>
            <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 md:max-w-lg">
              {CONTACTS.map(({ icon: Icon, label, text, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="group flex items-center gap-2.5 py-1 text-left text-muted-foreground transition hover:text-foreground"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/8 text-primary transition group-hover:bg-primary/15">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] text-muted-foreground/70">{label}</span>
                      <span className="block truncate text-sm text-foreground/90">{text}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-9 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-center text-xs text-muted-foreground/65 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Delegación Estudiantil de Ingeniería en Electrónica.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/privacidad" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link to="/terminos" className="hover:text-foreground">
              Términos de uso
            </Link>
            <Link to="/contacto" className="hover:text-foreground">
              Contacto
            </Link>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground/45">
          <p>Sitio estudiantil orientativo · No reemplaza los canales oficiales de la FP-UNA.</p>
          <Link
            to="/laboratorio-000"
            aria-label="Abrir señal desconocida"
            title="¿Qué es esto?"
            className="group relative grid h-4 w-4 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70"
          >
            <span className="absolute h-3 w-3 rounded-full bg-red-500/5 opacity-0 blur-sm transition group-hover:opacity-100 group-focus-visible:opacity-100" />
            <span className="relative h-1.5 w-1.5 rounded-full border border-red-400/25 bg-red-500/35 shadow-[0_0_5px_rgba(239,68,68,0.25)] transition duration-300 group-hover:border-red-300/80 group-hover:bg-red-400 group-hover:shadow-[0_0_10px_rgba(248,113,113,0.8)] group-focus-visible:bg-red-400" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
