import React, { useEffect, useReducer, useState } from "react"

// TODO: Wrap methods to get current state, make action, and see what state changed, then push updates? Would let objects that reference outside variables and their getters work. Need to not trash with state setter-based updates. Rebind to object?
// TODO: Figure out how to let class instances work with private fields and getters. Would ^ fix it?
type Updater = React.DispatchWithoutAction

/** A WeakMap associating stores to their subscriptions. */ 
const storeToSubscriptionsMap = new WeakMap<any, PropertySubscriptions<any>>()

/** A simple map of properties and all updaters subscribed to that property */
type PropertySubscriptions<T> = Record<keyof T, Set<Updater>>

/** A hook for subscribing to simple stores. Any changes to properties used by a component (and only used properties) will rerender the component
 * @param store - An object with which to watch for property changes to rerender
*/
export const useStore = <T>(store: T) => {
    /** All property subscriptions for this store. */
    const propertySubscriptions: PropertySubscriptions<T> = storeToSubscriptionsMap.get(store) ?? {}
    storeToSubscriptionsMap.set(store, propertySubscriptions)
    
    // TODO: updater is different on first render vs subsequent renders? Doesn't seem to harm anything, but adds more subscribers than needed
    // Triggers rerender when called
    const [, updater] = useReducer(x => x + 1, 0)

    // Proxy for store
    const [proxy] = useState(() => {
        let addSubscribers = true
        return new Proxy(store as any, {
            // Binds methods to proxy (so "this" values route through proxy) and adds updater to property subscriptions
            get: (obj, prop) => {
                let value = obj[prop]
                // Only check native properties
                if (obj.hasOwnProperty(prop)) {
                    // Make sure methods go through proxy for "this" values
                    if (value instanceof Function) {
                        value = value.bind(proxy)
                    // Put primitive properties that are read into the subscription watch list
                    } else if (addSubscribers) {
                        const subscriptions = propertySubscriptions[prop as keyof T] ?? new Set()
                        propertySubscriptions[prop as keyof T] = subscriptions
                        subscriptions.add(updater)
                    }
                }
                
                return value
            },
            // Alerts subscriptions for this property
            set: (obj, prop, value) => {
                const currentValue = obj[prop]
                obj[prop] = value
                // Don't trigger rerenders if the value didn't change (shallow comparison)
                if (currentValue !== value) {
                    const subscriptions = propertySubscriptions[prop as keyof T]
                    subscriptions.forEach(updater => updater())
                }
                return true
            }
        })
    })

    // Unsubscribe on dismount
    useEffect(() => () => { Object.values<Set<Updater>>(propertySubscriptions).forEach(subscriptions => subscriptions.delete(updater)) }
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
  
    setTest(test: string) {
        this.#test = test
    }
    setThing(thing: string) {
      this.#thing = thing
    }
  
    #test = "Classy"
    #thing = 'Sassy'
  }
  export const classStore = new ClassStore();