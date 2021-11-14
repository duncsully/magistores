import { useEffect, useReducer, useState } from "react"
import { getProxyInstance } from "./getProxyInstance"

/** A hook for subscribing to simple stores. Any changes to properties used by a component (and only used properties) will rerender the component
 * @param store - An object with which to watch for property changes to rerender
*/
export const useStore = <T extends {}>(store: T) => {
    // TODO: updater is different on first render vs subsequent renders? Doesn't seem to harm anything, but adds more subscribers than needed
    // Triggers rerender when called
    const [, updater] = useReducer(x => x + 1, 0)

    // Proxy for store handles subscribing component to all properties it reads and calling updater when any of those change due to an assignment or method call on the store
    const [[proxy, unsubscribe]] = useState(() => getProxyInstance(store, updater))

    // Unsubscribe on dismount (function train, choo choo!)
    useEffect(() => () => unsubscribe(updater)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    , [])
    
    return proxy as T
}

// TODO: Move examples into another file and comment
export const testStore = {
    test: 'dude',
    thing: 'great',
    setTest(newValue: string) {
        this.test = newValue
    },
    setThing(newValue: string) {
        this.thing = newValue
    }
}

export const stateAndActions = {
    state: {
        test: 'dude',
        thing: 'great',
    },
    
    setTest(test: string) {
        this.state = {...this.state, test }
    },
    setThing(thing: string) {
        this.state = {...this.state, thing}
    }
  };
  
  let _test = "Awesome";
  let _thing = 'Cool';
  export const gettersAndMethodsStore = {
    get test() {
        return _test
    },
    get thing() {
        return _thing
    },
    set thing(thing: string) {
        _thing = thing
    },
    setTest(test: string) {
        _test = test
    },
    setThing(thing: string) {
        _thing = thing
    }
  };
  
  class ClassStore {
    get test() {
      return this.#test
    }
    get thing() {
      return this.#thing
    }
    set thing(thing: string) {
        this.#thing = thing
    }
  
    setTest = (test: string) => {
        this.#test = test
    }
    setThing = (thing: string) => {
        this.#thing = thing
    }
  
    #test = "Classy"
    #thing = 'Sassy'
  }
  export const classStore = new ClassStore();

  export class StaticStore {
      static test = 'Static'
      static thing = 'Shock'
      static setTest = (newTest: string) => {
          StaticStore.test = newTest
      }
      static setThing = (newThing: string) => {
          StaticStore.thing = newThing
      }
  }

  
  class StoreWithAsync {

    get asyncValue() {
        if (this.#asyncValue) {
            return this.#asyncValue
        } 

        this.loading = true
        this.promise = new Promise<number>(res => {
            setTimeout(() => {
                res(5)
            }, 1000)
        })
        this.promise.then((value) => {
            this.#asyncValue = value
            this.loading = false
        })
        
        return undefined
    }

    loading = false

    promise: Promise<number> | undefined
      
    #asyncValue: number | undefined
  }
export const asyncStore = new StoreWithAsync()