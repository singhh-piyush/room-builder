// Copies the Furniture Bits glTF assets into public/ so Vite serves them at
// /assets/furniture-bits/<name>.gltf at runtime.
//
// Why a copy step instead of importing the models?
//  - The source pack lives in ./Assets/gltf as separate .gltf + .bin + a shared
//    furniturebits_texture.png. glTF references its .bin and texture by relative
//    URI, so the whole folder must sit together under Vite's `public/` dir to be
//    fetched correctly by GLTFLoader/useGLTF.
//  - Keeping ./Assets untouched preserves the original pack; this script is
//    idempotent and is wired into `predev`/`prebuild`.
import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(root, 'Assets', 'gltf');
const DEST = join(root, 'public', 'assets', 'furniture-bits');

async function main() {
  try {
    await stat(SRC);
  } catch {
    console.error(`[copy-assets] source not found: ${SRC}`);
    process.exit(1);
  }

  await mkdir(DEST, { recursive: true });
  const files = await readdir(SRC);
  let copied = 0;
  for (const f of files) {
    // Copy the model graph (.gltf, .bin) plus the shared texture (.png).
    if (/\.(gltf|bin|png)$/i.test(f)) {
      await cp(join(SRC, f), join(DEST, f));
      copied++;
    }
  }
  console.log(`[copy-assets] copied ${copied} files -> ${DEST}`);
}

main().catch((err) => {
  console.error('[copy-assets] failed:', err);
  process.exit(1);
});
