import assert from "node:assert/strict";
import test from "node:test";
import { parseRomCatalog } from "./rom-catalog.ts";

test("acepta una ROM pública con licencia y fuente", () => {
  const games = parseRomCatalog({
    games: [
      {
        id: "juego-libre",
        title: "Juego libre",
        description: "Demo redistribuible",
        author: "Autora",
        license: "CC BY 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        sourceUrl: "https://example.com/juego",
        system: "gba",
        rom: "/roms/juego-libre.gba",
      },
    ],
  });

  assert.equal(games[0]?.id, "juego-libre");
});

test("acepta sistemas compatibles y valida su extensión", () => {
  const games = parseRomCatalog({
    games: [
      {
        id: "demo-snes",
        title: "Demo SNES",
        description: "Demo redistribuible",
        author: "Autor",
        license: "MIT",
        licenseUrl: "https://example.com/license",
        sourceUrl: "https://example.com/demo",
        system: "snes",
        rom: "/roms/demo-snes.sfc",
      },
    ],
  });

  assert.equal(games[0]?.system, "snes");
  assert.throws(() =>
    parseRomCatalog({
      games: [{ ...games[0], rom: "/roms/demo-snes.gba" }],
    }),
  );
});

test("rechaza rutas externas o entradas sin licencia", () => {
  assert.throws(() =>
    parseRomCatalog({
      games: [
        {
          id: "juego",
          title: "Juego",
          description: "Sin permiso documentado",
          author: "Autor",
          sourceUrl: "https://example.com/juego",
          system: "gba",
          rom: "https://example.com/juego.gba",
        },
      ],
    }),
  );
});
