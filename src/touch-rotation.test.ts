import { describe, expect, it } from 'vitest'
import { TouchRotation } from './touch-rotation'
describe('touch rotation ownership', () => {
  it('suppresses the trailing finger and resets after all lift', () => {
    const gesture = new TouchRotation()
    expect(gesture.down(1, 10, 10)).toBe('stitch')
    expect(gesture.down(2, 30, 10)).toBe('rotate')
    expect(gesture.move(2, 50, 30)).toEqual({ x: 30, y: 20 })
    expect(gesture.up(1)).toBe(true)
    expect(gesture.move(2, 60, 30)).toBeNull()
    expect(gesture.blocked).toBe(true)
    expect(gesture.up(2)).toBe(true)
    expect(gesture.down(3, 10, 10)).toBe('stitch')
  })
  it('cancel and extra contacts cannot restart a gesture mid-contact', () => {
    const gesture = new TouchRotation()
    gesture.down(1, 0, 0); gesture.down(2, 2, 2)
    expect(gesture.down(3, 4, 4)).toBe('ignore')
    gesture.cancel()
    expect(gesture.move(1, 1, 1)).toBeNull()
    expect(gesture.up(1)).toBe(true)
    expect(gesture.up(2)).toBe(true)
    expect(gesture.up(3)).toBe(true)
    expect(gesture.blocked).toBe(false)
  })
  it('a fresh native primary sequence recovers after an OS-cancelled contact', () => {
    const gesture = new TouchRotation()
    gesture.down(1, 0, 0, true); gesture.cancel()
    expect(gesture.down(4, 10, 10, true)).toBe('stitch')
    expect(gesture.down(5, 20, 10)).toBe('rotate')
  })
})
