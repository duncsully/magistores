import { useEffect, useReducer, useState } from "react"

// TODO: Use a createStore function that transforms a store? All method behavior inside that?
// TODO: Track history?
type Updater = () => any

/** A simple map of properties and all updaters subscribed to that property */
type PropertySubscriptions<T> = Record<keyof T, Set<Updater>>

/** A WeakMap associating stores to their subscriptions. */ 
const storeToSubscriptionsMap = new WeakMap<any, PropertySubscriptions<any>>()

/** Wraps a store in a proxy that automatically subscribes all reads to this proxy and calls updater if any subscribed property changes
 * @param store - The object representing a store to wrap
 * @param updater - A function to call whenever a property read by the proxied store changes
 */
const getInstanceProxy = <T extends {}>(store: T, updater: Updater) => {
    /** All property subscriptions for this store. */
    const propertySubscriptions: PropertySubscriptions<T> = storeToSubscriptionsMap.get(store) ?? {}
    storeToSubscriptionsMap.set(store, propertySubscriptions)

    /** Checks all subscribed props before and after calling change and calls all subscribers on any changed props */
    const makeUpdatingChange = (change: () => any) => {
        // Get current values before calling original method
        const currentValues = Object.keys(propertySubscriptions).map(prop => store[prop as keyof T])
        // Do the call as requested (and make sure it's bound to object)
        const returnValue = change()
        // Get the new values 
        const newValues = Object.keys(propertySubscriptions).map(prop => store[prop as keyof T])
        // To not call the same updater more than once, consolidate all updaters into one set
        const toUpdate = Object.values<Set<Updater>>(propertySubscriptions).reduce((toUpdate, subscriptions, i) => {
            const currentValue = currentValues[i]
            const newValue = newValues[i]

            // Shallow compare values, include subscriptions for this key if values differ
            if (currentValue !== newValue) {
                return new Set([...toUpdate, ...subscriptions])
            }
            return toUpdate
        }, new Set<Updater>())

        // Go through all of the updaters that were subscribed to at least one of the changed properties
        toUpdate.forEach(updater => updater())

        return returnValue
    }

    const proxy = new Proxy<T>(store, {
        get: (obj, key) => {
            const prop = key as keyof T
            let value = obj[prop]

            // TODO?: This could technically be its own proxy using the "apply" trap to more elegantly wrap the method without "replacing" it
            // Wrap methods to update appropriate subscribers
            if (value instanceof Function) {
                // Oh TypeScript, sometimes I just can't figure you out
                const method = value as unknown as Function
                return (...args: any[]) => makeUpdatingChange(() => method.call(obj, ...args))
            }

            // Subscribe this instance to the property
            const subscriptions = propertySubscriptions[prop] ??= new Set()
            subscriptions.add(updater)
            return value
        },
        set: (obj, prop, newValue) => {
            makeUpdatingChange(() => {
                obj[prop as keyof T] = newValue
            })
            return true
        }
    })

    const unsubscribe = (updater: Updater) => {
        Object.values<Set<Updater>>(propertySubscriptions).forEach(subscriptions => subscriptions.delete(updater))
    }

    return [proxy, unsubscribe] as const
}

/** A hook for subscribing to simple stores. Any changes to properties used by a component (and only used properties) will rerender the component
 * @param store - An object with which to watch for property changes to rerender
*/
export const useStore = <T extends {}>(store: T) => {
    // TODO: updater is different on first render vs subsequent renders? Doesn't seem to harm anything, but adds more subscribers than needed
    // Triggers rerender when called
    const [, updater] = useReducer(x => x + 1, 0)

    // Proxy for store handles subscribing component to all properties it reads and calling updater when any of those change due to an assignment or method call on the store
    const [[proxy, unsubscribe]] = useState(() => getInstanceProxy(store, updater))

    // Unsubscribe on dismount (function train, choo choo!)
    useEffect(() => () => unsubscribe(updater)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    , [])
    
    return proxy as T
}

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