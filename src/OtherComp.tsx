import React from 'react'
import { useStore, testStore } from './useStore'

export const OtherComp = () => {
    const store = useStore(testStore)

    return <div>
        <p>Is this synced? {store.test}</p>
        <input value={store.thing} onChange={e => store.thing = e.target.value}/>
        <p>{store.thing}</p>
    </div>
}