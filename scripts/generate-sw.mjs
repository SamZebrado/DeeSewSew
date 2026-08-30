import { createHash } from 'node:crypto'
import { readdir, writeFile } from 'node:fs/promises'
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
const version = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12)
const root = '/DeeSewSew/'
const precache = assets.map((asset) => `${root}${asset === 'index.html' ? '' : asset}`)

const source = `const VERSION = 'deesewsew-${version}'
const ROOT = '${root}'
const PRECACHE = ${JSON.stringify(precache, null, 2)}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin + ROOT)) return
  event.respondWith(caches.match(event.request, { ignoreVary: true }).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(VERSION).then((cache) => cache.put(event.request, response.clone()))
    return response
  })).catch(() => caches.match(ROOT)))
})
`

await writeFile(new URL('../dist/sw.js', import.meta.url), source)
console.log(`Generated deesewsew-${version} with ${precache.length} app-shell assets`)
