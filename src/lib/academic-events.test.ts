import assert from "node:assert/strict";
import test from "node:test";
import { esTipoRevision } from "./academic-events.ts";

test("distingue revisiones de parciales y finales", () => {
  assert.equal(esTipoRevision("revision1"), true);
  assert.equal(esTipoRevision("revision2"), true);
  assert.equal(esTipoRevision("parcial1"), false);
  assert.equal(esTipoRevision("parcial2"), false);
  assert.equal(esTipoRevision("final1"), false);
  assert.equal(esTipoRevision("final2"), false);
});
