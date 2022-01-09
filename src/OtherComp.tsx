import React from 'react'
import { subscribeToPersistedStore } from './exampleStores'
import { UpdatingBorder } from './UpdatingBorder'
import { useStore } from './useStore'

export const OtherComp = () => {
  const store = useStore(subscribeToPersistedStore)

  return (
    <UpdatingBorder>
      <p>Is this synced? {store.test}</p>
      <input
        value={store.thing}
        onChange={e => (store.thing = e.target.value)}
      />
      <p>{store.thing}</p>
    </UpdatingBorder>
  )
}
