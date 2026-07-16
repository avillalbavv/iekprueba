/**
 * /contacto — Formulario de contacto y canales de comunicación.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Instagram,
  Mail,
  ExternalLink,
  ChevronRight,
  Send,
  MessageSquare,
  Facebook,
  Youtube,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";
import { z } from "zod";
import { submitContactMessage } from "@/lib/contact-service";

export const Route = createFileRoute("/contacto")({ component: ContactoPage });

const contactSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre").max(80, "Máximo 80 caracteres"),
  correo: z.string().trim().email("Correo inválido").max(120),
  asunto: z.string().trim().min(3, "Ingresá un asunto").max(120),
  mensaje: z.string().trim().min(10, "Mensaje muy corto").max(1000, "Máximo 1000 caracteres"),
});

const SOCIALS = [
  {
    icon: Instagram,
    label: "Instagram",
    handle: "@iek_fpuna",
    href: "https://www.instagram.com/iek_fpuna/",
    desc: "Seguinos para novedades, avisos y actividades.",
    color: "#e1306c",
  },
  {
    icon: Facebook,
    label: "Facebook",
    handle: "Delegación IEK",
    href: "https://www.facebook.com/DelegacionIEK",
    desc: "Publicaciones, eventos y novedades de la delegación.",
    color: "#1877f2",
  },
  {
    icon: Youtube,
    label: "YouTube",
    handle: "Delegación IEK",
    href: "https://www.youtube.com/channel/UCoJV8IlpUXYba0VhD1oL8FQ",
    desc: "Charlas, tutoriales y contenido en video.",
    color: "#ff0000",
  },
  {
    icon: Mail,
    label: "Correo electrónico",
    handle: "delegacioniek@gmail.com",
    href: "mailto:delegacioniek@gmail.com",
    desc: "Para consultas formales o propuestas.",
    color: "#22d3ee",
  },
  {
    icon: ExternalLink,
    label: "Sitio oficial FPUNA",
    handle: "pol.una.py/carreras/iek/",
    href: "https://www.pol.una.py/carreras/iek/",
    desc: "Canal oficial de la carrera en la Facultad Politécnica.",
    color: "#3b82f6",
  },
];

function ContactoPage() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const parsed = contactSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los campos");
      return;
    }
    setLoading(true);
    try {
      const delivery = await submitContactMessage({
        ...parsed.data,
        website: String(data.website || ""),
      });
      if (delivery === "stored") {
        toast.success("Mensaje enviado a la Delegación. Gracias por escribirnos.");
      } else {
        toast.info("Abrimos tu aplicación de correo. Confirmá allí el envío del mensaje.");
      }
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el mensaje");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Toaster theme="system" position="top-center" richColors />
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
                <span className="text-foreground">Contacto</span>
              </div>
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground mb-4">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Comunicación
              </span>
              <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
                <span className="text-gradient">Contacto</span>
              </h1>
              <p className="mt-5 text-base text-muted-foreground max-w-xl leading-relaxed">
                ¿Tenés una consulta, propuesta o querés sumarte a la Delegación? Escribinos y te
                respondemos a la brevedad.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/60">
                Evitá compartir datos sensibles, contraseñas o documentos personales a través de
                este formulario.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Formulario + canales */}
        <section className="pb-24">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal variant="stagger" className="grid gap-8 lg:grid-cols-5">
              {/* Formulario */}
              <form
                onSubmit={onSubmit}
                className="glass rounded-2xl p-7 sm:p-9 lg:col-span-3 space-y-5"
              >
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Envianos un mensaje
                </h2>

                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-px w-px opacity-0"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      placeholder="Tu nombre"
                      maxLength={80}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correo">Correo electrónico</Label>
                    <Input
                      id="correo"
                      name="correo"
                      type="email"
                      placeholder="tu@correo.com"
                      maxLength={120}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asunto">Asunto</Label>
                  <Input
                    id="asunto"
                    name="asunto"
                    placeholder="¿Sobre qué querés escribirnos?"
                    maxLength={120}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mensaje">Mensaje</Label>
                  <Textarea
                    id="mensaje"
                    name="mensaje"
                    rows={6}
                    placeholder="Escribí tu consulta, propuesta o comentario..."
                    maxLength={1000}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-premium h-11 w-full sm:w-auto rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow-[0_10px_40px_-10px] shadow-primary/60"
                >
                  {loading ? "Enviando..." : "Enviar mensaje"}
                </Button>
              </form>

              {/* Canales */}
              <aside className="lg:col-span-2 space-y-5">
                <div className="glass-strong rounded-2xl p-7">
                  <h3 className="font-display text-lg font-semibold mb-5">Otros canales</h3>
                  <div className="space-y-4">
                    {SOCIALS.map(({ icon: Icon, label, handle, href, desc, color }) => (
                      <a
                        key={label}
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="flex items-start gap-4 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-4 transition hover:bg-foreground/9 hover:border-foreground/15 group"
                      >
                        <div
                          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg ring-1 ring-foreground/10"
                          style={{ background: `${color}18` }}
                        >
                          <Icon className="h-4 w-4" style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{label}</div>
                          <div className="text-xs text-primary truncate">{handle}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-2xl p-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Para consultas académicas oficiales, inscripciones o trámites administrativos,
                    contactar directamente con la{" "}
                    <a
                      href="https://www.pol.una.py/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      Facultad Politécnica <ExternalLink className="h-3 w-3" />
                    </a>
                    .
                  </p>
                </div>
              </aside>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
