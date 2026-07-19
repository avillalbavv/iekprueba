import { z } from "zod";

export const ROM_SYSTEMS = {
  gba: { label: "Game Boy Advance", core: "gba", extensions: ["gba"] },
  gb: { label: "Game Boy / Color", core: "gb", extensions: ["gb", "gbc"] },
  nes: { label: "Nintendo Entertainment System", core: "nes", extensions: ["nes"] },
  snes: { label: "Super Nintendo", core: "snes", extensions: ["sfc", "smc"] },
  nds: { label: "Nintendo DS", core: "nds", extensions: ["nds"] },
  n64: { label: "Nintendo 64", core: "n64", extensions: ["n64", "z64", "v64"] },
  "sega-md": { label: "Mega Drive / Genesis", core: "segaMD", extensions: ["md", "gen", "bin"] },
  "sega-ms": { label: "Master System", core: "segaMS", extensions: ["sms"] },
  "sega-gg": { label: "Game Gear", core: "segaGG", extensions: ["gg"] },
  psx: { label: "PlayStation", core: "psx", extensions: ["chd", "pbp"] },
  arcade: { label: "Arcade", core: "arcade", extensions: ["zip"] },
} as const;

const systemSchema = z.enum(Object.keys(ROM_SYSTEMS) as [keyof typeof ROM_SYSTEMS, ...(keyof typeof ROM_SYSTEMS)[]]);

const romCatalogEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    title: z.string().min(1),
    description: z.string().min(1),
    author: z.string().min(1),
    license: z.string().min(1),
    licenseUrl: z.string().url(),
    sourceUrl: z.string().url(),
    system: systemSchema,
    rom: z.string().regex(/^\/roms\/[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/),
    cover: z.string().regex(/^\/roms\/[a-zA-Z0-9._-]+\.(png|jpe?g|webp|svg)$/).optional(),
  })
  .superRefine((game, context) => {
    const extension = game.rom.split(".").pop()?.toLowerCase();
    const allowedExtensions = ROM_SYSTEMS[game.system].extensions as readonly string[];
    if (!extension || !allowedExtensions.includes(extension)) {
      context.addIssue({
        code: "custom",
        path: ["rom"],
        message: `Extensión incompatible con ${ROM_SYSTEMS[game.system].label}`,
      });
    }
  });

const romCatalogSchema = z.object({
  games: z.array(romCatalogEntrySchema),
});

export type RomCatalogEntry = z.infer<typeof romCatalogEntrySchema>;

export function parseRomCatalog(value: unknown): RomCatalogEntry[] {
  return romCatalogSchema.parse(value).games;
}
