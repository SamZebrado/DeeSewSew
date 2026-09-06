import type { NormalizedPoint } from './stitch-model'

export class ThreadCoverage {
  private readonly resolution: number
  private readonly cells: Float32Array

  constructor(resolution = 96) {
    this.resolution = resolution
    this.cells = new Float32Array(resolution * resolution)
  }

  private cell(x: number, y: number): number {
    const gx = Math.max(0, Math.min(this.resolution - 1, Math.round(x * (this.resolution - 1))))
    const gy = Math.max(0, Math.min(this.resolution - 1, Math.round(y * (this.resolution - 1))))
    return gy * this.resolution + gx
  }

  private forEachSample(start: NormalizedPoint, end: NormalizedPoint, visit: (x: number, y: number) => void): number {
    const count = Math.max(4, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) * this.resolution * 1.5))
    for (let index = 0; index <= count; index += 1) {
      const amount = index / count
      visit(start.x + (end.x - start.x) * amount, start.y + (end.y - start.y) * amount)
    }
    return count + 1
  }

  private sampleCell(x: number, y: number): number {
    const center = this.cell(x, y)
    const cx = center % this.resolution
    const cy = Math.floor(center / this.resolution)
    let sum = 0
    let count = 0
    for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
      const sampleX = cx + ox
      const sampleY = cy + oy
      if (sampleX >= 0 && sampleX < this.resolution && sampleY >= 0 && sampleY < this.resolution) {
        sum += this.cells[sampleY * this.resolution + sampleX]
        count += 1
      }
    }
    return count ? sum / count : 0
  }

  clear(): void {
    this.cells.fill(0)
  }
  clone(): ThreadCoverage {
    const copy = new ThreadCoverage(this.resolution)
    copy.cells.set(this.cells)
    return copy
  }

  samplePath(start: NormalizedPoint, end: NormalizedPoint): number {
    let sum = 0
    const samples = this.forEachSample(start, end, (x, y) => { sum += this.sampleCell(x, y) })
    return samples ? sum / samples : 0
  }

  addPath(start: NormalizedPoint, end: NormalizedPoint): void {
    this.forEachSample(start, end, (sampleX, sampleY) => {
      const center = this.cell(sampleX, sampleY)
      const cx = center % this.resolution
      const cy = Math.floor(center / this.resolution)
      for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) {
        const x = cx + ox; const y = cy + oy
        if (x >= 0 && x < this.resolution && y >= 0 && y < this.resolution) {
          const falloff = ox === 0 && oy === 0 ? 1 : .42
          this.cells[y * this.resolution + x] += falloff
        }
      }
    })
  }
}
