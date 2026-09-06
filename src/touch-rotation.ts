type Point = { x: number; y: number }
/** Contact ownership survives cancellation until all fingers lift. */
export class TouchRotation {
  private contacts = new Map<number, Point>()
  private suppressed = false
  private pair: number[] = []
  down(id: number, x: number, y: number, primary = false): 'stitch' | 'rotate' | 'ignore' {
    // A new native primary down starts a fresh sequence after e.g. OS focus loss.
    if (primary) { this.contacts.clear(); this.pair = []; this.suppressed = false }
    this.contacts.set(id, { x, y })
    if (this.contacts.size === 1 && !this.suppressed) return 'stitch'
    if (this.contacts.size === 2 && !this.suppressed) {
      this.suppressed = true
      this.pair = [...this.contacts.keys()]
      return 'rotate'
    }
    return 'ignore'
  }
  move(id: number, x: number, y: number): Point | null {
    if (!this.contacts.has(id)) return null
    this.contacts.set(id, { x, y })
    return this.centroid()
  }
  centroid(): Point | null {
    const [a, b] = this.pair.map(id => this.contacts.get(id))
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null
  }
  up(id: number): boolean {
    const consumed = this.suppressed
    this.contacts.delete(id)
    if (!this.centroid()) this.pair = []
    if (!this.contacts.size) this.suppressed = false
    return consumed
  }
  cancel(): void { this.pair = []; this.suppressed = this.contacts.size > 0 }
  has(id: number): boolean { return this.contacts.has(id) }
  get blocked(): boolean { return this.suppressed }
}
