import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  variant?: "fade" | "zoom" | "stagger";
  as?: "div" | "section" | "article" | "ul";
  delay?: number;
  threshold?: number;
};

export function Reveal({
  children,
  className,
  variant = "fade",
  as: Tag = "div",
  delay = 0,
  threshold = 0.15,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    // threshold bajo + rootMargin generoso: para secciones altas (más grandes
    // que el viewport, ej. el acordeón de la malla curricular) alcanza con
    // que aparezca el borde para revelarse — si exigiéramos que se vea un
    // % grande del elemento, uno muy alto podía quedar "atascado" a mitad
    // de la transición de opacidad (el efecto de "difuminado" reportado).
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px 100px 0px" },
    );
    io.observe(el);
    // Red de seguridad: si por lo que sea el observer no dispara enseguida,
    // no dejamos el contenido semi-invisible más que un instante.
    const fallback = window.setTimeout(() => setVisible(true), 700);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [threshold]);

  const base = variant === "zoom" ? "reveal-zoom" : variant === "stagger" ? "stagger" : "reveal";

  return (
    <Tag
      ref={ref as never}
      className={cn(base, visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
