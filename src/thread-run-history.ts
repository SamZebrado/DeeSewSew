import { undoTopology, redoTopology, type TopologyOperationV3 } from './embroidery-topology'
import { activeThreadRun, endThreadRun, type ThreadRunState, type ThreadRun, type ThreadAnchor } from './thread-runs'

type RunDescriptor = Omit<ThreadRun, 'punctureIds' | 'segmentIds'>
type RunOperation = { kind: 'end'; runId: string; order: number; anchor:ThreadAnchor }
  | { kind: 'puncture'; operation: TopologyOperationV3; run: RunDescriptor; created: boolean }
  | { kind: 'legacy'; operation: TopologyOperationV3 }
export interface ThreadRunHistory { present: ThreadRunState; future: readonly RunOperation[] }
export const createThreadHistory = (present: ThreadRunState): ThreadRunHistory => ({ present, future: [] })
export const commitThreadState = (present: ThreadRunState): ThreadRunHistory => ({ present, future: [] })
export function endHistoryThread(history: ThreadRunHistory): ThreadRunHistory {
  const present = endThreadRun(history.present)
  return present === history.present ? history : commitThreadState(present)
}

/** History retains only operation deltas, never a whole-piece snapshot per click.
 * Undo remains available after reload because ends are ordered canonical state. */
export function undoThreadHistory(history: ThreadRunHistory): ThreadRunHistory {
  const state = history.present, last = state.runs.at(-1)
  if (last?.endOrder !== null && last?.endOrder !== undefined) {
    return { present: { ...state, runs: [...state.runs.slice(0,-1), {...last,endOrder:null,endAnchor:null}], activeRunId:last.id },
      future: [...history.future,{kind:'end',runId:last.id,order:last.endOrder,anchor:last.endAnchor!}] }
  }
  const undone = undoTopology({ present:state.topology,future:[] }), operation = undone.future[0]
  if (!operation) return history
  if (operation.kind === 'legacy') return { present:{...state,topology:undone.present},future:[...history.future,{kind:'legacy',operation}] }
  if (!last || !activeThreadRun(state)) throw new TypeError('Puncture without an active run')
  const {punctureIds,segmentIds,...run} = last
  const created = punctureIds.length === 1
  if (created && last.startMode === 'visible-side') {
    const previous = undone.present.punctures.at(-1)
    const needleBefore = previous
      ? { side: previous.toSide, position: {...previous.position}, lastPunctureId: previous.id }
      : { side: 'front' as const, position: null, lastPunctureId: null }
    undone.present = {...undone.present, needle: needleBefore}
    operation.needleBefore = needleBefore
  }
  const updated = {...last,punctureIds:punctureIds.slice(0,-1),segmentIds:operation.segment?segmentIds.slice(0,-1):segmentIds,endSide:operation.puncture.fromSide}
  return { present:{ topology:undone.present,runs:created?state.runs.slice(0,-1):[...state.runs.slice(0,-1),updated],activeRunId:created?null:last.id },
    future:[...history.future,{kind:'puncture',operation,run,created}] }
}

export function redoThreadHistory(history: ThreadRunHistory): ThreadRunHistory {
  const delta = history.future.at(-1)
  if (!delta) return history
  const state=history.present, future=history.future.slice(0,-1)
  if(delta.kind==='end'){
    const run=activeThreadRun(state)
    if(!run||run.id!==delta.runId)throw new TypeError('End-thread redo identity mismatch')
    return {present:{topology:{...state.topology,nextOrder:Math.max(state.topology.nextOrder,delta.order+1)},runs:[...state.runs.slice(0,-1),{...run,endOrder:delta.order,endAnchor:delta.anchor}],activeRunId:null},future}
  }
  const topology=redoTopology({present:state.topology,future:[delta.operation]}).present
  if(delta.kind==='legacy')return {present:{...state,topology},future}
  if(delta.operation.kind!=='puncture')throw new TypeError('Invalid run history')
  const old=activeThreadRun(state),op=delta.operation
  const run:ThreadRun={...delta.run,punctureIds:[...(delta.created?[]:old!.punctureIds),op.puncture.id],segmentIds:[...(delta.created?[]:old!.segmentIds),...(op.segment?[op.segment.id]:[])]}
  return {present:{topology,runs:[...(delta.created?state.runs:state.runs.slice(0,-1)),run],activeRunId:run.id},future}
}
