import type { NormalizedPoint } from './stitch-model'

export class ThreadCoverage {
  private resolution: number
  private cells: Float32Array

  constructor(resolution = 96) {
    this.resolution = resolution
    this.cells = new Float32Array(resolution * resolution)
  }

  private cell(x: number, y: number): number {
    const gx = Math.max(0, Math.min(this.resolution - 1, Math.round(x * (this.resolution - 1))))
    const gy = Math.max(0, Math.min(this.resolution - 1, Math.round(y * (this.resolution - 1))))
    return gy * this.resolution + gx
  }

  private samples(start: NormalizedPoint, end: NormalizedPoint): NormalizedPoint[] {
    const count = Math.max(4, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) * this.resolution * 1.5))
    return Array.from({ length: count + 1 }, (_, index) => {
      const amount = index / count
      return { x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount }
    })
  }

  samplePath(start: NormalizedPoint, end: NormalizedPoint): number {
    const values = this.samples(start, end).map((point) => {
      const center = this.cell(point.x, point.y)
      const cx = center % this.resolution
      const cy = Math.floor(center / this.resolution)
      let sum = 0; let count = 0
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        const x = cx + ox; const y = cy + oy
        if (x >= 0 && x < this.resolution && y >= 0 && y < this.resolution) { sum += this.cells[y * this.resolution + x]; count += 1 }
      }
      return count ? sum / count : 0
    })
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  addPath(start: NormalizedPoint, end: NormalizedPoint): void {
    for (const point of this.samples(start, end)) {
      const center = this.cell(point.x, point.y)
      const cx = center % this.resolution
      const cy = Math.floor(center / this.resolution)
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        const x = cx + ox; const y = cy + oy
        if (x >= 0 && x < this.resolution && y >= 0 && y < this.resolution) {
          const falloff = ox === 0 && oy === 0 ? 1 : .42
          this.cells[y * this.resolution + x] += falloff
        }
      }
    }
  }
}
