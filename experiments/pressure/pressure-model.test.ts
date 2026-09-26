import { describe, expect, it } from 'vitest'
import { PressureGesture, pressureSlackScale } from '../../src/pressure-input'

describe('pressure preview gesture', () => {
  it('keeps mouse, touch, and constant-default pens neutral', () => {
    for (const pointerType of ['mouse', 'touch', 'pen']) {
      const gesture = new PressureGesture()
      gesture.begin(1, { pointerType, pressure: 0.5, buttons: 1 })
      gesture.move(1, { pointerType, pressure: 0.5, buttons: 1 })
      expect(gesture.strength).toBe(0.5)
      expect(gesture.hasNonDefaultPenSample).toBe(false)
    }
  })

  it('accepts only active owned pen samples and clamps finite values', () => {
    const gesture = new PressureGesture()
    gesture.begin(1, { pointerType: 'pen', pressure: 0.5, buttons: 1 })
    gesture.move(2, { pointerType: 'pen', pressure: 0.9, buttons: 1 })
    expect(gesture.strength).toBe(0.5)
    gesture.move(1, { pointerType: 'pen', pressure: 3, buttons: 1 })
    expect(gesture.strength).toBe(1)
    gesture.move(1, { pointerType: 'pen', pressure: Number.NaN, buttons: 1 })
    expect(gesture.strength).toBe(1)
  })

  it('maps pressed zero, low, middle, and high pen samples in order', () => {
    const strengths = [0, 0.2, 0.5, 0.9].map((pressure) => {
      const gesture = new PressureGesture()
      gesture.begin(7, { pointerType: 'pen', pressure, buttons: 1 })
      return gesture.strength
    })
    expect(strengths).toEqual([0, 0.2, 0.5, 0.9])
    strengths.map(pressureSlackScale).forEach((scale, index) => {
      expect(scale).toBeCloseTo([1.65, 1.39, 1, 0.48][index])
    })
  })

  it('ignores barrel/eraser-only moves after tip contact and preserves owner', () => {
    const gesture = new PressureGesture()
    gesture.begin(7, { pointerType: 'pen', pressure: 0.8, buttons: 1 })
    for (const buttons of [0, 2, 32, 34]) {
      gesture.move(7, { pointerType: 'pen', pressure: 0.1, buttons })
      expect(gesture.strength).toBe(0.8)
    }
    gesture.move(8, { pointerType: 'pen', pressure: 0.1, buttons: 3 })
    expect(gesture.strength).toBe(0.8)
    gesture.move(7, { pointerType: 'pen', pressure: 0.3, buttons: 3 })
    expect(gesture.strength).toBe(0.3)
  })

  it('falls back for missing or inactive input and never transfers ownership', () => {
    const gesture = new PressureGesture()
    gesture.begin(7, { pointerType: 'pen', pressure: undefined as unknown as number, buttons: 1 })
    expect(gesture.strength).toBe(0.5)
    gesture.move(7, { pointerType: 'pen', pressure: 0.9, buttons: 0 })
    gesture.move(8, { pointerType: 'pen', pressure: 0.9, buttons: 1 })
    gesture.move(7, { pointerType: 'touch', pressure: 0.9, buttons: 1 })
    expect(gesture.strength).toBe(0.5)
    gesture.move(7, { pointerType: 'pen', pressure: 0.2, buttons: 1 })
    expect(gesture.strength).toBe(0.2)
    gesture.end(8)
    gesture.move(7, { pointerType: 'pen', pressure: 0.9, buttons: 0 })
    expect(gesture.strength).toBe(0.2)
    gesture.cancel()
    gesture.move(7, { pointerType: 'pen', pressure: 0.9, buttons: 1 })
    expect(gesture.strength).toBe(0.5)
  })

  it('does not interpret pointerup zero as light pressure; cancel resets', () => {
    const gesture = new PressureGesture()
    gesture.begin(1, { pointerType: 'pen', pressure: 0.8, buttons: 1 })
    gesture.move(1, { pointerType: 'pen', pressure: 0, buttons: 0 })
    gesture.end(1)
    expect(gesture.strength).toBe(0.8)
    gesture.cancel()
    expect(gesture.strength).toBe(0.5)
  })

  it('keeps slack scale finite, bounded, and smaller under firm pressure', () => {
    expect(pressureSlackScale(1)).toBeLessThan(pressureSlackScale(0))
    expect(pressureSlackScale(0.5)).toBe(1)
    for (const value of [NaN, Infinity, -100, 100]) expect(Number.isFinite(pressureSlackScale(value))).toBe(true)
  })
})
