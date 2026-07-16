import { useEffect, useState } from "react";
import { hydratePublishedScheduleData } from "@/lib/schedule-update-service";

export function ScheduleDataBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setReady(true);
    }, 3000);
    void hydratePublishedScheduleData().finally(() => {
      window.clearTimeout(timeout);
      if (active) setReady(true);
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6" role="status">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-pulse rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando datos académicos…</p>
        </div>
      </div>
    );
  }

  return children;
}
