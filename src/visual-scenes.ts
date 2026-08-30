import type { Stitch } from './stitch-model'

const colors = ['#b9403c', '#425f86', '#55765b', '#d49a2f']

export function makeVisualScene(name: string): Stitch[] | null {
  if (!['single', 'crossing', 'buildup', 'parallel', 'mixed', 'stress'].includes(name)) return null
  const stitches: Stitch[] = []
  const add = (x1: number, y1: number, x2: number, y2: number, color = colors[0], seed = stitches.length + 100) => stitches.push({ id: `scene-${stitches.length + 1}`, type: 'back', start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, width: 4.4, order: stitches.length + 1, seed })

  if (name === 'single') {
    add(.23, .32, .45, .32); add(.55, .30, .74, .42, colors[1]); add(.27, .56, .43, .72, colors[2]); add(.58, .70, .73, .48, colors[3])
  } else if (name === 'crossing') {
    const centers = [[.32, .34], [.68, .34], [.5, .66]]
    const angles = [30, 60, 90]
    centers.forEach(([cx, cy], index) => {
      const angle = angles[index] * Math.PI / 180
      add(cx - .13, cy, cx + .13, cy, index === 1 ? colors[0] : colors[1])
      add(cx - Math.cos(angle) * .13, cy - Math.sin(angle) * .13, cx + Math.cos(angle) * .13, cy + Math.sin(angle) * .13, index === 0 ? colors[1] : colors[0])
    })
  } else if (name === 'buildup') {
    ;[1, 2, 4, 8].forEach((count, group) => { for (let i = 0; i < count; i += 1) add(.2, .24 + group * .17, .8, .24 + group * .17, colors[group], group * 20 + i) })
  } else if (name === 'parallel') {
    for (let index = 0; index < 34; index += 1) add(.27 + index * .014, .28, .23 + index * .014, .72, index % 6 === 0 ? '#c7514c' : '#b9403c')
  } else if (name === 'mixed') {
    for (let index = 0; index < 22; index += 1) add(.25 + index * .021, .28, .22 + index * .021, .73, colors[1])
    for (let index = 0; index < 18; index += 1) add(.27, .3 + index * .023, .73, .25 + index * .023, colors[3])
  } else for (let index = 0; index < 1000; index += 1) {
    const ring = (index % 25) / 25 * Math.PI * 2
    const band = Math.floor(index / 25) % 20
    const radius = .08 + band * .016
    const x = .5 + Math.cos(ring) * radius
    const y = .5 + Math.sin(ring) * radius
    add(x - .025, y - .015, x + .025, y + .015, colors[index % colors.length], index + 500)
  }
  return stitches
}
