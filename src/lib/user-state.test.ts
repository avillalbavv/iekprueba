import test from "node:test";
import assert from "node:assert/strict";
import { mergeStates, type SyncedState } from "./user-state.ts";

function state(values: Record<string, string>, updatedAt: Record<string, string>): SyncedState {
  return { version: 1, values, updatedAt };
}

test("la migración conserva datos locales cuando todavía no existe estado remoto", () => {
  const local = state(
    { "poliplanner:seleccion:v2": "horario-local" },
    { "poliplanner:seleccion:v2": "2026-07-12T01:00:00.000Z" },
  );
  assert.deepEqual(mergeStates(local, state({}, {})), local);
});

test("la sincronización elige la versión más reciente por herramienta", () => {
  const local = state(
    { "iek-asistencia:v2": "asistencia-local", "iek-promedio-db-v2": "promedio-viejo" },
    {
      "iek-asistencia:v2": "2026-07-12T02:00:00.000Z",
      "iek-promedio-db-v2": "2026-07-10T02:00:00.000Z",
    },
  );
  const remote = state(
    { "iek-asistencia:v2": "asistencia-vieja", "iek-promedio-db-v2": "promedio-remoto" },
    {
      "iek-asistencia:v2": "2026-07-11T02:00:00.000Z",
      "iek-promedio-db-v2": "2026-07-12T03:00:00.000Z",
    },
  );
  const merged = mergeStates(local, remote);
  assert.equal(merged.values["iek-asistencia:v2"], "asistencia-local");
  assert.equal(merged.values["iek-promedio-db-v2"], "promedio-remoto");
});

test("la sincronización combina herramientas de dispositivos diferentes", () => {
  const merged = mergeStates(
    state({ "iek-asistencia:v2": "A" }, { "iek-asistencia:v2": "2026-07-12T01:00:00.000Z" }),
    state(
      { "poliplanner:seleccion:v2": "P" },
      { "poliplanner:seleccion:v2": "2026-07-12T01:00:00.000Z" },
    ),
  );
  assert.deepEqual(merged.values, { "iek-asistencia:v2": "A", "poliplanner:seleccion:v2": "P" });
});
