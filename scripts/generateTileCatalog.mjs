#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const root = process.cwd();
const texturesDir = path.join(root, 'public', 'textures', 'tiles');
const metadataPath = path.join(root, 'tile-metadata.json');
const outputPath = path.join(root, 'src', 'data', 'tileCatalog.ts');

const DEFAULT_SIZE = { width: 30, height: 30 };

async function readMetadata() {
  try {
    const raw = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('No tile-metadata.json found. Using defaults for all tiles.');
      return {};
    }
    throw error;
  }
}

function slugToName(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function serializeTile(tile) {
  const {
    id,
    name,
    textureUrl,
    realWorldSizeCm,
    groutColor,
    groutWidthMm,
    roughness,
  } = tile;

  const lines = [
    '  {',
    `    id: '${id}',`,
    `    name: '${name}',`,
    `    textureUrl: '${textureUrl}',`,
    `    realWorldSizeCm: { width: ${realWorldSizeCm.width}, height: ${realWorldSizeCm.height} },`,
  ];

  if (groutColor) {
    lines.push(`    groutColor: '${groutColor}',`);
  }
  if (typeof groutWidthMm === 'number') {
    lines.push(`    groutWidthMm: ${groutWidthMm},`);
  }
  if (typeof roughness === 'number') {
    lines.push(`    roughness: ${roughness},`);
  }

  lines.push('  }');
  return lines.join('\n');
}

async function main() {
  const files = (await fs.readdir(texturesDir)).filter((file) =>
    /\.(png|jpe?g|svg|webp|avif)$/i.test(file),
  );

  files.sort();

  const metadata = await readMetadata();

  const tiles = files.map((file) => {
    const slug = file.replace(/\.[^.]+$/, '');
    const info = metadata[slug] ?? {};
    return {
      id: info.id ?? slug,
      name: info.name ?? slugToName(slug),
      textureUrl: `/textures/tiles/${file}`,
      realWorldSizeCm: info.realWorldSizeCm ?? DEFAULT_SIZE,
      groutColor: info.groutColor,
      groutWidthMm: info.groutWidthMm,
      roughness: info.roughness,
    };
  });

  const tileExports = tiles.map(serializeTile).join(',\n');
  const fileContents = `export type TileDimensionsCm = {\n  width: number;\n  height: number;\n};\n\nexport type TileDefinition = {\n  id: string;\n  name: string;\n  textureUrl: string;\n  realWorldSizeCm: TileDimensionsCm;\n  groutColor?: string;\n  groutWidthMm?: number;\n  roughness?: number;\n};\n\nexport const tileCatalog: TileDefinition[] = [\n${tileExports}\n];\n`;

  await fs.writeFile(outputPath, fileContents);
  console.log(`Generated tile catalog with ${tiles.length} entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
