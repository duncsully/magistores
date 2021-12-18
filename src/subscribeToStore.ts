// TODO:
// Don't use subscribeToStore; use and export results of createStore?
// Pass Function returning store to createStore vs store object directly for memory optimization?
// Does WeakMap even work if key is used inside of value?

export type Updater = () => any

type SubscribeFunction<T> = (updater: Updater) => readonly [T, () => void]

/**
 * Generates a reactive store and subscribe function for the store
 * @param store The basic object to proxy
 * @returns 1. a proxy that will update any store subscribers when one of their watched values change and 2. a subscribe function
 */
const createStore = <T>(store: T) => {
  /** This ties each key path to a set of updaters all subscribed to that key path. A key path represents a path on the original store object (e.g. 'someState.someProp') */
  const trackedKeysToUpdatersMap: Record<string, Set<Updater>> = {}

  /** For keeping track of all unique updater instances */
  let totalUpdaters = 0

  /** Given a key path, return the value from the nested object */
  const getPathValue = (path: string) => {
    const props = path.split('.')
    let currentVal: any = store
    props.forEach((prop) => (currentVal = currentVal[prop]))
    return currentVal
  }

  /** Given an action to call, will compare all subscribed values before and after the action, calling every updater listening to any of the changed values */
  const doActionAndUpdateSubscribers = (action: () => any) => {
    const paths = Object.keys(trackedKeysToUpdatersMap)
    const beforeValues = paths.map(getPathValue)
    const returnValue = action()
    const afterValues = paths.map(getPathValue)

    let i = 0
    const toUpdate = new Set<Updater>()
    for (const path in trackedKeysToUpdatersMap) {
      // We've already added all updaters, stop checking
      if (totalUpdaters === toUpdate.size) break

      if (beforeValues[i] !== afterValues[i]) {
        trackedKeysToUpdatersMap[path]?.forEach((updater) => {
          toUpdate.add(updater)
        })
      }

      i++
    }

    toUpdate.forEach((updater) => updater())
    return returnValue
  }

  /**
   * Creates a proxy responsible for updating all subscribers when a watched value changes after a setter or method call
   */
  const createUpdaterProxy = (obj: any, parent?: any) =>
    new Proxy(obj, {
      get: (obj, key) => {
        let value = obj[key]

        // Works for nested objects as well as methods that'll end up going through apply trap
        if (value instanceof Object) {
          value = createUpdaterProxy(value, obj)
        }

        return value
      },
      set: (obj, key, newValue) => {
        doActionAndUpdateSubscribers(() => {
          obj[key] = newValue
        })
        return true
      },
      apply: (func, _, args) =>
        // 'This' context will pretty much always be intended to be the method's object and not the calling context
        doActionAndUpdateSubscribers(func.bind(parent, ...args)),
    })

  const updaterProxy = createUpdaterProxy(store)

  /**
   * Subscribes the passed updater to changes to the store this subscribe function originates from
   * @param updater A function to call when a read value changes (only called once per set or method)
   * @returns 1. a proxy that tracks reads to call updater whenever one of these read values changes and 2. an unsubscribe function
   */
  const subscribe: SubscribeFunction<T> = (updater: Updater) => {
    totalUpdaters++
    /**
     * Creates a proxy responsible for tracking all reads by a subscriber
     */
    const createSubscriberProxy = (obj: any, parentPath?: string) =>
      new Proxy(obj, {
        get: (obj, key) => {
          let value = obj[key]
          const prop = String(key)
          const path = parentPath ? `${parentPath}.${prop}` : prop

          if (value instanceof Object) {
            value = createSubscriberProxy(value, path)
          }

          if (key !== 'constructor') {
            // Subscribe this instance to changes to this property
            const trackingKeys = (trackedKeysToUpdatersMap[path] ??= new Set())
            trackingKeys.add(updater)
          }

          return value
        },
      })

    const unsubscribe = () => {
      totalUpdaters--
      Object.values(trackedKeysToUpdatersMap).forEach((updaters) =>
        updaters.delete(updater)
      )
    }
    return [createSubscriberProxy(updaterProxy), unsubscribe] as const
  }

  return [createUpdaterProxy(store) as T, subscribe] as const
}

const stores = new WeakMap<any, ReturnType<typeof createStore>>()

/**
 * Subscribes to changes to a basic store object and calls updater on changes
 * @param store Basic object to track values on and update after setter and method calls
 * @param updater Function to call when a change is detected
 * @returns 1. A proxy that tracks read values and calls updater whenever one of these values changes after a setter or method call. 2. An unsubscribe function
 */
export const subscribeToStore = <T>(store: T, updater: Updater) => {
  const data = stores.get(store) ?? createStore(store)
  stores.set(store, data)
  const [, subscribe] = data
  return (subscribe as SubscribeFunction<T>)(updater)
}
