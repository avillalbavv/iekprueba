import { useEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-service";
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => loadNotifications());
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  function read(id: string) {
    markNotificationRead(id);
    setItems(loadNotifications());
  }
  function readAll() {
    markAllNotificationsRead();
    setItems(loadNotifications());
  }
  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => {
          setItems(loadNotifications());
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${unread} notificaciones sin leer`}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Centro de notificaciones"
          className="fixed inset-x-3 top-20 z-[120] max-h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl border border-border bg-popover p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[340px] sm:max-w-[calc(100vw-2rem)]"
        >
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <h2 className="font-semibold">Notificaciones</h2>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={readAll}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                >
                  Marcar todas leídas
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar notificaciones"
                className="rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-2 max-h-[calc(100dvh-10rem)] space-y-2 overflow-y-auto overscroll-contain sm:max-h-96">
            {items.slice(0, 10).map((n) => (
              <article
                key={n.id}
                className={`rounded-xl border p-3 text-sm ${n.readAt ? "border-border opacity-70" : "border-primary/30 bg-primary/5"}`}
              >
                <a
                  href={n.actionUrl || "#"}
                  onClick={() => {
                    read(n.id);
                    setOpen(false);
                  }}
                  className="break-words font-medium"
                >
                  {n.title}
                </a>
                <p className="mt-1 break-words text-xs text-muted-foreground">{n.message}</p>
                {!n.readAt && (
                  <button
                    onClick={() => read(n.id)}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
                  >
                    <Check className="h-3 w-3" />
                    Marcar leída
                  </button>
                )}
              </article>
            ))}
            {!items.length && (
              <p className="p-5 text-center text-sm text-muted-foreground">
                No hay notificaciones nuevas.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
