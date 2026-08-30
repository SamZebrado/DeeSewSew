import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const expected = [
  ['desktop-1440x900.png', 1440, 900],
  ['tablet-landscape-1024x768.png', 1024, 768],
  ['tablet-portrait-768x1024.png', 768, 1024],
  ['phone-390x844.png', 390, 844],
]
const hashes = new Set()

for (const [name, width, height] of expected) {
  const data = await readFile(new URL(`../review/r3-flat/${name}`, import.meta.url))
  if (data.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${name}: not a PNG`)
  const actualWidth = data.readUInt32BE(16)
  const actualHeight = data.readUInt32BE(20)
  if (actualWidth !== width || actualHeight !== height) throw new Error(`${name}: expected ${width}x${height}, got ${actualWidth}x${actualHeight}`)
  const hash = createHash('sha256').update(data).digest('hex')
  hashes.add(hash)
  console.log(`${name}: ${actualWidth}x${actualHeight} ${hash}`)
}

if (hashes.size < 3) throw new Error(`Responsive evidence has only ${hashes.size} unique hashes`)
console.log(`Responsive evidence check passed with ${hashes.size} unique images`)
