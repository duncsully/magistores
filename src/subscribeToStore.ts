export type Updater = () => any

type SubscribeFunction<T> = (updater: Updater) => readonly [T, () => void]

/** Given a store, will return a subscribe function that calls the passed updater callback whenever a read property's value changes */
const createStoreSubscriber = <T>(store: T): SubscribeFunction<T> => {
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

  /** Given an updater, returns a proxy that watches for all read properties (including nested ones) and calls updater when any of the read properties change
   * and a function to unsubscribe the updater
   */
  return (updater: Updater) => {
    totalUpdaters++

    const createProxy = (obj: any, parentPath?: string) =>
      new Proxy(obj, {
        get: (obj, key) => {
          let value = obj[key]
          const prop = String(key)
          const path = parentPath ? `${parentPath}.${prop}` : prop

          // This wraps objects and functions:
          // - Objects: Basically turn into sub-stores, so that their nested values can also be watched
          // - Functions: Go through the apply trap so values can be compared after calling
          if (value instanceof Object) {
            value = createProxy(value, path)
          }

          if (key !== 'constructor') {
            // Subscribe this instance to changes to this property
            const trackingKeys = (trackedKeysToUpdatersMap[path] ??= new Set())
            trackingKeys.add(updater)
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
          // 'This' context will pretty much always be intended to be the store and not the calling context
          doActionAndUpdateSubscribers(func.bind(store, ...args)),
      })

    const unsubscribe = () => {
      totalUpdaters--
      Object.values(trackedKeysToUpdatersMap).forEach((updaters) =>
        updaters.delete(updater)
      )
    }
    return [createProxy(store) as T, unsubscribe] as const
  }
}

const storeSubscribeFunctions = new WeakMap<any, SubscribeFunction<any>>()

/** Given a store and a callback, will return both a proxy that will track read properties and call callback when any of these change, and an unsubscribe function */
export const subscribeToStore = <T>(store: T, updater: Updater) => {
  const subscribe: SubscribeFunction<T> =
    storeSubscribeFunctions.get(store) ?? createStoreSubscriber(store)
  storeSubscribeFunctions.set(store, subscribe)

  return subscribe(updater)
}

// TODO: Combine approaches

const reactiveStoresMap = new WeakMap<any, any>()
/** Always get updated on any change */
const simpleSubscriptionsMap = new WeakMap<any, Set<Updater>>()
export const getReactiveStore = <T>(store: T) => {
  const existingReactiveStore = reactiveStoresMap.get(store)
  if (existingReactiveStore) return existingReactiveStore as T

  const updateAllSimpleSubscriptions = () =>
    simpleSubscriptions.forEach((updater) => updater())

  const createProxy = (obj: any, parent?: any): any =>
    new Proxy(obj, {
      get(obj, key) {
        const value = obj[key]
        if (value instanceof Object) {
          return createProxy(value, obj)
        }
        return value
      },
      set(obj, key, newValue) {
        obj[key] = newValue
        updateAllSimpleSubscriptions()
        return true
      },
      apply(func, _, args) {
        // Assume that we always want a method to use its containing object's context
        func.apply(parent, args)
        updateAllSimpleSubscriptions()
      },
    })

  const reactiveStore = createProxy(store)
  reactiveStoresMap.set(store, reactiveStore)

  const simpleSubscriptions = new Set<Updater>()
  simpleSubscriptionsMap.set(reactiveStore, simpleSubscriptions)

  return reactiveStore as T
}

export const subscribeToReactiveStore = <T>(
  reactiveStore: T,
  updater: Updater
) => {
  const subscriptions = simpleSubscriptionsMap.get(reactiveStore)
  subscriptions?.add(updater)

  return () => void subscriptions?.delete(updater)
}
