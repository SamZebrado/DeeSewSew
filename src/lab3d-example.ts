import { anchor, emptyLab, finishRun, startRun, type LabArtwork, type Vec3 } from './lab3d-model'

/** One optional composition, made with the same canonical operations as manual work. */
export function threeBands(base: LabArtwork = emptyLab()): LabArtwork {
  if (base.runs.length || base.support.state !== 'installed') throw Error('Example needs an empty installed support')
  let result = base
  for (const [index, color] of ['#9b4a48', '#456c68', '#ad782e'].entries()) {
    result = startRun(result, color)
    const latitude = (index - 1) * .42, radius = Math.cos(latitude)
    for (let i = 0; i <= 16; i++) {
      const angle = i / 16 * Math.PI * 2
      // Duplicate closure coordinates exactly rather than storing sin(2π) drift.
      const p: Vec3 = i === 16 ? [0, Math.sin(latitude), radius] : [Math.sin(angle) * radius, Math.sin(latitude), Math.cos(angle) * radius]
      result = anchor(result, p)
    }
    result = finishRun(result)
  }
  return result
}
