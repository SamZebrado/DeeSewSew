/** Move existing controls, preserving their handlers and desktop DOM positions. */
export function mountMobileActions(
  anchor: HTMLElement,
  edit: readonly HTMLElement[],
  view: readonly HTMLElement[],
  progress: HTMLElement,
  beforeMove: () => void,
): void {
  const panel = document.createElement('div')
  panel.id = 'mobile-actions'
  panel.hidden = true
  const edits = document.createElement('div'), views = document.createElement('div')
  edits.className = 'mobile-edit-actions'; views.className = 'mobile-view-actions'
  panel.append(edits, views)
  anchor.after(panel)
  const slots = [...edit, ...view, progress].map(element => {
    const home = document.createComment('mobile action home')
    element.before(home)
    return { element, home }
  })
  const query = window.matchMedia('(max-width: 480px)')
  let mobile = false
  const sync = () => {
    if (mobile === query.matches) return
    beforeMove()
    const focused = document.activeElement
    mobile = query.matches
    if (mobile) {
      edits.append(...edit); views.append(...view); panel.append(progress)
    } else {
      for (const { element, home } of slots) home.after(element)
    }
    panel.hidden = !mobile
    if (focused instanceof HTMLElement && slots.some(({ element }) => element === focused || element.contains(focused))) {
      focused.focus({ preventScroll: true })
    }
  }
  query.addEventListener('change', sync)
  sync()
}
