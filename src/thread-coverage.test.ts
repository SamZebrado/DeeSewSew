import { describe, expect, it } from 'vitest'
import { ThreadCoverage } from './thread-coverage'

describe('ThreadCoverage incremental grid', () => {
  const horizontal = [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }] as const

  it('starts empty and accumulates only appended paths', () => {
    const coverage = new ThreadCoverage(64)
    expect(coverage.samplePath(...horizontal)).toBe(0)
    coverage.addPath(...horizontal)
    const once = coverage.samplePath(...horizontal)
    coverage.addPath(...horizontal)
    expect(once).toBeGreaterThan(0)
    expect(coverage.samplePath(...horizontal)).toBeGreaterThan(once)
  })

  it('clears in place for an explicit static rebuild', () => {
    const coverage = new ThreadCoverage(64)
    coverage.addPath(...horizontal)
    coverage.clear()
    expect(coverage.samplePath(...horizontal)).toBe(0)
  })

  it('is deterministic for zero-length and boundary paths', () => {
    const coverage = new ThreadCoverage(32)
    const point = { x: 0, y: 0 }
    coverage.addPath(point, point)
    const first = coverage.samplePath(point, point)
    expect(first).toBeGreaterThan(0)
    expect(coverage.samplePath(point, point)).toBe(first)
  })
})
