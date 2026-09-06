import { afterEach, expect, test } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'

const temporary = []
afterEach(async () => { await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
async function generate(content = 'one') {
  const root = await mkdtemp(join(tmpdir(), 'deesewsew-sw-test-'))
  temporary.push(root)
  await mkdir(join(root, 'scripts'))
  await mkdir(join(root, 'dist'))
  await copyFile(new URL('./generate-sw.mjs', import.meta.url), join(root, 'scripts/generate-sw.mjs'))
  await writeFile(join(root, 'dist/index.html'), content)
  const build = async () => {
    execFileSync(process.execPath, [join(root, 'scripts/generate-sw.mjs')])
    return readFile(join(root, 'dist/sw.js'), 'utf8')
  }
  return { root, build }
}
function runtime(source) {
  const handlers = {}, deleted = []
  const cache = { match: async () => 'cached html', addAll: async () => {} }
  runInNewContext(source, {
    self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => { handlers[name] = fn }, clients: { claim: async () => {} }, skipWaiting: async () => {} },
    caches: { open: async () => cache, match: (...args) => cache.match(...args), keys: async () => ['deesewsew-old', 'beatgarden-offline-v1', 'another-project-cache'], delete: async key => { deleted.push(key) } },
    fetch: async () => { throw new Error('offline') },
  })
  return { handlers, deleted, cache }
}
test('activation preserves other applications caches', async () => {
  const fixture = await generate()
  const { handlers, deleted } = runtime(await fixture.build())
  let pending
  handlers.activate({ waitUntil: promise => { pending = promise } })
  await pending
  expect(deleted).toEqual(['deesewsew-old'])
})
test('version changes when same filename changes content', async () => {
  const fixture = await generate()
  const before = await fixture.build()
  await writeFile(join(fixture.root, 'dist/index.html'), 'two')
  expect((await fixture.build()).split('\n')[0]).not.toBe(before.split('\n')[0])
})
test('offline HTML fallback is navigation only', async () => {
  const fixture = await generate()
  const { handlers, cache } = runtime(await fixture.build())
  cache.match = async request => typeof request === 'string' ? 'cached html' : undefined
  for (const mode of ['navigate', 'cors']) {
    let response
    handlers.fetch({ request: { method: 'GET', url: 'https://example.test/DeeSewSew/missing', mode }, respondWith: value => { response = value } })
    if (mode === 'navigate') expect(await response).toBe('cached html')
    else await expect(response).rejects.toThrow('offline')
  }
})
