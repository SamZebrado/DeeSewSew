import { expect, test } from 'vitest'
import { emptyThreadRuns, punctureThreadRun } from './thread-runs'
import { createThreadHistory, commitThreadState, endHistoryThread, undoThreadHistory, redoThreadHistory } from './thread-run-history'
import { parseThreadArtwork, serializeThreadArtwork } from './thread-run-storage'
const style={type:'running' as const,color:'#9b4a48'}
test('undo/redo/reload across end and new run never merges and restores exact identities',()=>{
 let h=createThreadHistory(emptyThreadRuns())
 for(const x of [.3,.4])h=commitThreadState(punctureThreadRun(h.present,{x,y:.4},style))
 const before=h.present
 h=endHistoryThread(h)
 const ended=h.present
 h=undoThreadHistory(h);expect(h.present.runs).toEqual(before.runs);expect(h.present.topology.needle).toEqual(before.topology.needle)
 h=redoThreadHistory(h);expect(h.present).toEqual(ended)
 for(const x of [.6,.7])h=commitThreadState(punctureThreadRun(h.present,{x,y:.6},style))
 const finished=h.present
 h=createThreadHistory(parseThreadArtwork(serializeThreadArtwork(h.present)))
 for(let i=0;i<3;i++)h=undoThreadHistory(h)
 expect(h.present.runs).toEqual(before.runs)
 for(let i=0;i<3;i++)h=redoThreadHistory(h)
 expect(h.present).toEqual(finished)
 h=undoThreadHistory(h);h=commitThreadState(punctureThreadRun(h.present,{x:.72,y:.62},style))
 expect(h.future).toEqual([]);expect(redoThreadHistory(h)).toBe(h)
 expect(h.present.runs).toHaveLength(2)
 expect(()=>serializeThreadArtwork(h.present)).not.toThrow()
})
