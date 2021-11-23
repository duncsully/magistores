import React from 'react'
import { useStore } from './useStore'
import { classStore } from "./exampleStores"

export const OtherComp = () => {
    const store = useStore(classStore)

    return <div>
        <p>Is this synced? {store.test}</p>
        <input value={store.thing} onChange={e => store.thing = e.target.value}/>
        <p>{store.thing}</p>
    </div>
}