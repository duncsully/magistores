import React from 'react'
import { useStore } from './useStore'
import { classStore } from "./exampleStores"

export const TestComp = () => {
    const { test, setTest, setThing } = useStore(classStore)
    return <div>
        <p>{test}</p>
        <input value={test} onChange={e => setTest(e.target.value)}/>
        <button onClick={() => setTest('cool')}>Set cool</button>
        <button onClick={() => setThing('wow')}>Set thing to wow</button>
    </div>
}