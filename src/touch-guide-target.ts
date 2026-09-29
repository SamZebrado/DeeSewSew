/** Screen-space touch affordance; never changes the guide's canonical point. */
export function touchesGuideTarget(
  x: number, y: number,
  target: { clientX: number; clientY: number } | null,
): boolean {
  return !!target && [x, y, target.clientX, target.clientY].every(Number.isFinite)
    && Math.hypot(x - target.clientX, y - target.clientY) <= 22
}
