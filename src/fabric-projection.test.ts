import { describe, expect, it } from 'vitest'
import { classifyFabricInteraction, inverseProjectFabricPoint, projectFabricPoint } from './fabric-projection'

const geometry = { centerX: 420, centerY: 360, size: 640, perspectivePx: 1040 }
const point = { x: .34, y: .61 }

describe('fabric inverse projection', () => {
  for (const view of [
    { label: 'front', yawDeg: 0, pitchDeg: 0 },
    { label: 'moderate front', yawDeg: 45, pitchDeg: 12 },
    { label: 'limited front', yawDeg: 68, pitchDeg: -8 },
    { label: 'back', yawDeg: 180, pitchDeg: 0 },
    { label: 'moderate back', yawDeg: 220, pitchDeg: 10 },
  ]) {
    it(`round-trips a known ${view.label} point`, () => {
      const projected = projectFabricPoint(point, view, geometry)
      expect(projected).not.toBeNull()
      const restored = inverseProjectFabricPoint(projected!.clientX, projected!.clientY, view, geometry)
      expect(restored?.x).toBeCloseTo(point.x, 6)
      expect(restored?.y).toBeCloseTo(point.y, 6)
    })
  }

  it('preserves correct mirror semantics on the reverse', () => {
    const front = projectFabricPoint(point, { yawDeg: 0, pitchDeg: 0 }, geometry)!
    const back = projectFabricPoint(point, { yawDeg: 180, pitchDeg: 0 }, geometry)!
    expect(front.clientX - geometry.centerX).toBeCloseTo(-(back.clientX - geometry.centerX), 6)
    expect(inverseProjectFabricPoint(back.clientX, back.clientY, { yawDeg: 180, pitchDeg: 0 }, geometry)).toEqual(point)
  })

  it('classifies moderate, limited, and degenerate angles explicitly', () => {
    expect(classifyFabricInteraction({ yawDeg: 45, pitchDeg: 0 })).toBe('editable')
    expect(classifyFabricInteraction({ yawDeg: 68, pitchDeg: 0 })).toBe('limited')
    expect(classifyFabricInteraction({ yawDeg: 82, pitchDeg: 0 })).toBe('inspect-only')
    expect(classifyFabricInteraction({ yawDeg: 135, pitchDeg: 0 })).toBe('editable')
  })

  it('rejects extreme angles, outside-hoop targets, and invalid geometry', () => {
    expect(inverseProjectFabricPoint(420, 360, { yawDeg: 90, pitchDeg: 0 }, geometry)).toBeNull()
    expect(inverseProjectFabricPoint(50, 50, { yawDeg: 0, pitchDeg: 0 }, geometry)).toBeNull()
    expect(inverseProjectFabricPoint(420, 360, { yawDeg: 0, pitchDeg: 0 }, { ...geometry, size: 0 })).toBeNull()
  })
})
