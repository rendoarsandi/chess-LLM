import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../client/package.json', import.meta.url))
const packageRoot = dirname(require.resolve('stockfish/package.json'))
const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
const destination = fileURLToPath(new URL('../client/public/engine/', import.meta.url))
await mkdir(destination, { recursive: true })
for (const extension of ['js', 'wasm']) {
  const name = `stockfish-${metadata.buildVersion}-lite-single.${extension}`
  await copyFile(join(packageRoot, 'bin', name), join(destination, name))
}
await copyFile(join(packageRoot, 'Copying.txt'), join(destination, 'COPYING.txt'))
await writeFile(
  join(destination, 'README.txt'),
  `Stockfish.js ${metadata.version} — Stockfish ${metadata.buildVersion}\n\nUnmodified lite, single-threaded WebAssembly build by Nathan Rugg and the Stockfish contributors.\nDistributed under the GNU General Public License, version 3; see COPYING.txt.\n\nCorresponding source, neural networks, and build instructions:\nhttps://github.com/nmrugg/stockfish.js/tree/v${metadata.version}\nhttps://github.com/nmrugg/stockfish.js/archive/refs/tags/v${metadata.version}.tar.gz\nExact distributed package: https://www.npmjs.com/package/stockfish/v/${metadata.version}\n\nOnly the lite single-threaded engine is served to the browser.\nAnalysis runs in a Web Worker and is never used by the benchmark runner.\n`,
)
console.log(`Prepared Stockfish.js ${metadata.version} browser assets.`)
