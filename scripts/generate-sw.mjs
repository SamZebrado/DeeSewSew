import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const dist = new URL('../dist/', import.meta.url)

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const results = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) results.push(...await files(path))
    else if (entry.name !== 'sw.js') results.push(relative(dist.pathname, path).replaceAll('\\', '/'))
  }
  return results
}

const assets = (await files(dist.pathname)).sort()
const hash = createHash('sha256')
for (const asset of assets) {
  const bytes = await readFile(join(dist.pathname, asset))
  hash.update(JSON.stringify([asset, bytes.length])).update(bytes)
}
const version = hash.digest('hex').slice(0, 12)
const root = '/DeeSewSew/'
const precache = assets.map((asset) => `${root}${asset === 'index.html' ? '' : asset}`)

const source = `const VERSION = 'deesewsew-${version}'
const ROOT = '${root}'
const PRECACHE = ${JSON.stringify(precache, null, 2)}

self.addEventListener('install', (event) => {
  // Wait for a complete shell; activation occurs after old clients release it.
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('deesewsew-') && key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin + ROOT)) return
  event.respondWith((async () => {
    const cache = await caches.open(VERSION)
    const cached = await cache.match(event.request, { ignoreVary: true })
    if (cached) return cached
    try {
      return await fetch(event.request)
    } catch (error) {
      if (event.request.mode === 'navigate') {
        const shell = await cache.match(ROOT)
        if (shell) return shell
      }
      throw error
    }
  })())
})
`

await writeFile(new URL('../dist/sw.js', import.meta.url), source)
console.log(`Generated deesewsew-${version} with ${precache.length} app-shell assets`)
