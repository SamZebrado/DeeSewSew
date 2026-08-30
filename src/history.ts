export interface HistoryState<T> { present: T[]; future: T[] }

export const createHistory = <T>(present: T[] = []): HistoryState<T> => ({ present, future: [] })
export const commit = <T>(history: HistoryState<T>, item: T): HistoryState<T> => ({ present: [...history.present, item], future: [] })
export const undo = <T>(history: HistoryState<T>): HistoryState<T> => {
  const item = history.present.at(-1)
  return item === undefined ? history : { present: history.present.slice(0, -1), future: [...history.future, item] }
}
export const redo = <T>(history: HistoryState<T>): HistoryState<T> => {
  const item = history.future.at(-1)
  return item === undefined ? history : { present: [...history.present, item], future: history.future.slice(0, -1) }
}
export const clearHistory = <T>(history: HistoryState<T>): HistoryState<T> => ({ present: [], future: [...history.future, ...history.present] })
