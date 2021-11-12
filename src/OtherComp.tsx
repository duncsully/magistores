import React from 'react'
import { useStore, testStore, gettersAndMethodsStore, classStore, StaticStore } from './useStore'

export const OtherComp = () => {
    const store = useStore(StaticStore)

    return <div>
        <p>Is this synced? {store.test}</p>
        <input value={store.thing} onChange={e => store.thing = e.target.value}/>
        <p>{store.thing}</p>
    </div>
}