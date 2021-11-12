import React, { useEffect, useReducer, useState } from "react"
import { getAllProperties } from "./utils"

// TODO: Use a createStore function that transforms a store? All method behavior inside that?
// TODO: Tests
type Updater = React.DispatchWithoutAction

/** A simple map of properties and all updaters subscribed to that property */
type PropertySubscriptions<T> = Record<keyof T, Set<Updater>>

/** A WeakMap associating stores to their subscriptions. */ 
const storeToSubscriptionsMap = new WeakMap<any, PropertySubscriptions<any>>()


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
    const [proxy] = useState(() => 
        new Proxy<any>(store, {
            get: (obj, prop) => {
                let value = obj[prop]
                const allProps = getAllProperties(obj)
                if (allProps.includes(prop)) {
                    // Methods
                    if (value instanceof Function) {
                        // Wrap method
                        return (...args: any[]) => {
                            // Get current entries before calling original method
                            const currentValues = Array.from(allProps).map(prop => obj[prop])
                            // Do the call as requested (and make sure it's bound to object)
                            value.call(obj, ...args)
                            // Get the new values (-should- be in same order, fix if this ever changes)
                            const newValues = allProps.map(prop => obj[prop])
                            // To not call the same updater more than once, consolidate all updaters as we get them
                            let toUpdate = new Set<Updater>()

                            // Check every entry
                            allProps.forEach((key, i) => {
                                const currentValue = currentValues[i]
                                const newValue = newValues[i]
                                // If a value changed, throw any subscriptions for that property into the update bucket
                                if (currentValue !== newValue) {
                                    const subscriptions = propertySubscriptions[key as keyof T] ?? []
                                    toUpdate = new Set([...toUpdate, ...subscriptions])
                                }
                            })
                            // Go through all of the updaters that were subscribed to at least one of the changed properties
                            toUpdate.forEach(updater => updater())
                        } 
                    // Put primitive properties that are read into the subscription watch list
                    } else {
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
                // TODO: Check for native or class property?
                // Don't trigger rerenders if the value didn't change (shallow comparison)
                if (currentValue !== value) {
                    const subscriptions = propertySubscriptions[prop as keyof T]
                    // Not every property is going to be read for sure, so it might not have any subscriptions
                    subscriptions?.forEach(updater => updater())
                }
                return true
            }
        })
    )

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