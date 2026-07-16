import type { RadarItem } from "./academic-radar.ts";
import { writeLocalState } from "./user-state.ts";
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
  readAt?: string;
  actionUrl?: string;
}
const KEY = "iek-notifications:v1";
export function upsertNotification(notification: AppNotification): AppNotification[] {
  const map = new Map(loadNotifications().map((item) => [item.id, item]));
  if (!map.has(notification.id)) map.set(notification.id, notification);
  const next = [...map.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
  writeLocalState(KEY, JSON.stringify(next));
  return next;
}
export function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
export function syncRadarNotifications(items: RadarItem[]): AppNotification[] {
  const existing = loadNotifications(),
    map = new Map(existing.map((n) => [n.id, n]));
  for (const i of items.filter((i) => i.priority === "high" || i.priority === "critical"))
    if (!map.has(i.id))
      map.set(i.id, {
        id: i.id,
        type: i.type,
        title: i.title,
        message: i.description,
        priority: i.priority,
        createdAt: i.createdAt,
        actionUrl: i.actionUrl,
      });
  const next = [...map.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
  writeLocalState(KEY, JSON.stringify(next));
  return next;
}
export function markNotificationRead(id: string) {
  const next = loadNotifications().map((n) =>
    n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
  );
  writeLocalState(KEY, JSON.stringify(next));
}
export function markAllNotificationsRead() {
  const readAt = new Date().toISOString();
  const next = loadNotifications().map((n) => (n.readAt ? n : { ...n, readAt }));
  writeLocalState(KEY, JSON.stringify(next));
}
