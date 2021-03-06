import React from 'react'
import { useStore } from './useStore'
import { subscribeToPersistedStore } from './exampleStores'
import { UpdatingBorder } from './UpdatingBorder'

export const TestComp = () => {
  const { test, setTest, setThing } = useStore(subscribeToPersistedStore)
  return (
    <UpdatingBorder>
      <p>{test}</p>
      <input value={test} onChange={e => setTest(e.target.value)} />
      <button onClick={() => setTest('cool')}>Set cool</button>
      <button onClick={() => setThing('wow')}>Set thing to wow</button>
    </UpdatingBorder>
  )
}
