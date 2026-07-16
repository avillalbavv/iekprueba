import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteFooter } from "@/components/SiteFooter";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/terminos")({ component: TermsPage });

function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteNavbar />
      <main className="relative mx-auto max-w-4xl px-6 py-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
        <Reveal className="relative">
          <nav className="mb-6 flex gap-2 text-sm text-muted-foreground">
            <Link to="/">Inicio</Link>
            <span>›</span>
            <span className="text-foreground">Términos de uso</span>
          </nav>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
            Términos de <span className="text-gradient">Uso</span>
          </h1>
          <p className="mt-5 text-muted-foreground">Última actualización: 12 de julio de 2026.</p>
        </Reveal>
        <div className="relative mt-10 space-y-8 text-sm leading-7 text-muted-foreground sm:text-base">
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Carácter orientativo
            </h2>
            <p className="mt-2">
              La Web de la Delegación Estudiantil de Ingeniería Electrónica es una plataforma de
              apoyo. La información mostrada no reemplaza resoluciones, sistemas académicos,
              Secretaría Académica ni otros canales oficiales de la FP-UNA.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Responsabilidad del usuario
            </h2>
            <p className="mt-2">
              Cada estudiante debe verificar fechas, aulas, correlatividades, habilitaciones y
              resultados antes de tomar decisiones académicas. Las calculadoras ofrecen estimaciones
              basadas en los datos ingresados.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">Uso adecuado</h2>
            <p className="mt-2">
              No está permitido intentar acceder a cuentas ajenas, alterar permisos, interferir con
              la plataforma, cargar contenido ilícito o utilizar los servicios para perjudicar a
              otros estudiantes o a la institución.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Disponibilidad y cambios
            </h2>
            <p className="mt-2">
              Las funciones pueden actualizarse para mejorar seguridad, exactitud o compatibilidad.
              Cuando un dato no esté confirmado, la plataforma debe identificarlo como pendiente de
              confirmación oficial.
            </p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold text-foreground">Contacto</h2>
            <p className="mt-2">
              Para reportar información incorrecta o consultar estos términos, utilizá la sección{" "}
              <Link to="/contacto" className="text-primary hover:underline">
                Contacto
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
