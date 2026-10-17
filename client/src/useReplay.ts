import { useEffect, useReducer } from 'react'

type State = { cursor: number | null; playing: boolean; delay: number; end: number }
type Action =
  | { type: 'seek'; cursor: number | null }
  | { type: 'toggle'; last: number }
  | { type: 'tick' }
  | { type: 'speed'; delay: number }
function reduce(state: State, action: Action): State {
  if (action.type === 'seek') return { ...state, cursor: action.cursor, playing: false }
  if (action.type === 'speed') return { ...state, delay: action.delay }
  if (action.type === 'toggle') {
    if (state.playing) return { ...state, playing: false }
    if (action.last < 0) return state
    return {
      ...state,
      cursor: state.cursor === null || state.cursor >= action.last ? -1 : state.cursor,
      end: action.last,
      playing: true,
    }
  }
  const next = Math.min((state.cursor ?? -1) + 1, state.end)
  return { ...state, cursor: next, playing: next < state.end }
}
export function useReplay(total: number) {
  const [state, dispatch] = useReducer(reduce, {
    cursor: null,
    playing: false,
    delay: 1000,
    end: -1,
  })
  useEffect(() => {
    if (!state.playing) return
    const timer = setTimeout(() => dispatch({ type: 'tick' }), state.delay)
    return () => clearTimeout(timer)
  }, [state.playing, state.cursor, state.delay])
  return {
    cursor: state.cursor,
    playing: state.playing,
    delay: state.delay,
    toggle: () => dispatch({ type: 'toggle', last: total - 1 }),
    seek: (cursor: number | null) => dispatch({ type: 'seek', cursor }),
    speed: (delay: number) => dispatch({ type: 'speed', delay }),
  }
}
