import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useReplay } from './useReplay'

let root: Root, container: HTMLDivElement
beforeEach(() => {
  vi.useFakeTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})
function Viewer({ total }: { total: number }) {
  const replay = useReplay(total)
  return (
    <>
      <output>
        {replay.cursor === null ? 'latest' : replay.cursor + 1}:
        {replay.playing ? 'playing' : 'paused'}
      </output>
      <button onClick={replay.toggle}>toggle</button>
      <button onClick={() => replay.seek(null)}>latest</button>
      <button onClick={() => replay.seek(0)}>first</button>
      <button onClick={() => replay.speed(500)}>faster</button>
    </>
  )
}
function render(total: number) {
  act(() => root.render(<Viewer total={total} />))
}
function click(text: string) {
  act(() =>
    [...container.querySelectorAll('button')]
      .find((button) => button.textContent === text)!
      .click(),
  )
}
function time(ms: number) {
  act(() => vi.advanceTimersByTime(ms))
}
const position = () => container.querySelector('output')!.textContent

it('plays from the opening, pauses, changes speed, and stops at the recorded final move', () => {
  render(3)
  expect(position()).toBe('latest:paused')
  click('toggle')
  expect(position()).toBe('0:playing')
  time(1000)
  expect(position()).toBe('1:playing')
  click('toggle')
  time(5000)
  expect(position()).toBe('1:paused')
  click('faster')
  click('toggle')
  time(500)
  expect(position()).toBe('2:playing')
  time(500)
  expect(position()).toBe('3:paused')
  time(5000)
  expect(position()).toBe('3:paused')
  click('toggle')
  expect(position()).toBe('0:playing')
  click('first')
  time(1000)
  expect(position()).toBe('1:paused')
})

it('keeps a replay bounded while live moves arrive and cancels its timer when following live', () => {
  render(0)
  click('toggle')
  expect(position()).toBe('latest:paused')
  render(1)
  click('toggle')
  render(2)
  time(1000)
  expect(position()).toBe('1:paused')
  click('latest')
  expect(position()).toBe('latest:paused')
  click('toggle')
  time(1000)
  click('latest')
  time(5000)
  expect(position()).toBe('latest:paused')
})
