import React from 'react'
import { useStore, testStore, gettersAndMethodsStore, classStore, StaticStore } from './useStore'

export const TestComp = () => {
    const { test, setTest, setThing } = useStore(StaticStore)
    return <div>
        <p>{test}</p>
        <input value={test} onChange={e => setTest(e.target.value)}/>
        <button onClick={() => setTest('cool')}>Set cool</button>
        <button onClick={() => setThing('wow')}>Set thing to wow</button>
    </div>
}