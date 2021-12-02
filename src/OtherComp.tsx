import React from 'react'
import { classStore } from './exampleStores'
import { UpdatingBorder } from './UpdatingBorder'
import { useStore } from './useStore'

export const OtherComp = () => {
  const store = useStore(classStore)

  return (
    <UpdatingBorder>
      <p>Is this synced? {store.test}</p>
      <input
        value={store.thing}
        onChange={(e) => (store.thing = e.target.value)}
      />
      <p>{store.thing}</p>
    </UpdatingBorder>
  )
}
