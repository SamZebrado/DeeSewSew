export type PressureSample = { pointerType: string; pressure: number; buttons: number }

// A constant 0.5 is the Pointer Events fallback for hardware without pressure.
// It is deliberately neutral even for a pen until a non-default sample is observed.
export class PressureGesture {
  private pointerId: number | null = null
  private nonDefaultPen = false
  private lastPressure = 0.5

  begin(pointerId: number, sample: PressureSample): void {
    this.pointerId = pointerId
    this.nonDefaultPen = false
    this.lastPressure = 0.5
    this.move(pointerId, sample)
  }

  move(pointerId: number, sample: PressureSample): void {
    // Only tip-contact samples may update strength; barrel/eraser-only moves
    // cannot turn a held stitch into a second pressure input mode.
    if (pointerId !== this.pointerId || sample.pointerType !== 'pen' || (sample.buttons & 1) === 0) return
    if (!Number.isFinite(sample.pressure)) return
    const pressure = Math.max(0, Math.min(1, sample.pressure))
    if (Math.abs(pressure - 0.5) > 0.025) this.nonDefaultPen = true
    if (this.nonDefaultPen) this.lastPressure = pressure
  }

  // pointerup is always pressure 0 by specification; preserve the last active
  // value until the preview is dismissed. Cancellation discards it immediately.
  end(pointerId: number): void { if (pointerId === this.pointerId) this.pointerId = null }
  cancel(): void { this.pointerId = null; this.nonDefaultPen = false; this.lastPressure = 0.5 }
  get strength(): number { return this.nonDefaultPen ? this.lastPressure : 0.5 }
  get hasNonDefaultPenSample(): boolean { return this.nonDefaultPen }
}

export function pressureSlackScale(pressure: number): number {
  const safePressure = Number.isFinite(pressure) ? Math.max(0, Math.min(1, pressure)) : 0.5
  return 1 + (0.5 - safePressure) * 1.3
}
