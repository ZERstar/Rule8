import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

for (const dir of ['.next', '.next-dev']) {
  rmSync(resolve(process.cwd(), dir), {
    recursive: true,
    force: true,
  })
}
