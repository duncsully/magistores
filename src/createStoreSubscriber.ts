// TODO:
// More debugger logs
// Pass Function returning store to createStore vs store object directly for memory optimization?

export type Updater = () => any

export type SubscribeFunction<T> = (
  updater: Updater
) => readonly [T, () => void]

/**
 * Creates a subscribe function for the given store object
 * @param store The store object to watch for changes on
 * @returns A function that, given an update function, will return both 1. a proxy that tracks reads and changes to values and 2. an unsubscribe function.
 * The passed updated function will be called whenever a value read from the proxy (nested values included) is changed via any proxy returned from this subscriber
 */
export const createStoreSubscriber = <T>(store: T): SubscribeFunction<T> => {
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
        console.debug(
          `Value at path "${paths[i]}" changed from "${beforeValues[i]}" to "${afterValues[i]}"`
        )
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

    const createProxy = (obj: any, parentPath?: string, parent?: any) =>
      Proxy.revocable(obj, {
        get(obj, key) {
          let value = obj[key]
          const prop = String(key)
          const path = parentPath ? `${parentPath}.${prop}` : prop

          // This wraps objects and functions:
          // - Objects: Basically turn into sub-stores, so that their nested values can also be watched
          // - Functions: Go through the apply trap so values can be compared after calling
          if (value instanceof Object) {
            value = createProxy(value, path, obj).proxy
          }

          if (key !== 'constructor') {
            // Subscribe this instance to changes to this property
            const trackingKeys = (trackedKeysToUpdatersMap[path] ??= new Set())
            if (!trackingKeys.has(updater)) {
              trackingKeys.add(updater)
              console.debug(`Adding updater under path: "${path}"`)
            }
          }

          return value
        },
        set(obj, key, newValue) {
          doActionAndUpdateSubscribers(() => {
            obj[key] = newValue
          })
          return true
        },
        apply: (func, _, args) =>
          // 'This' context will pretty much always be intended to be parent object and not the calling context
          doActionAndUpdateSubscribers(func.bind(parent, ...args)),
      })

    const { proxy, revoke } = createProxy(store)

    const unsubscribe = () => {
      revoke()
      totalUpdaters--
      Object.entries(trackedKeysToUpdatersMap).forEach(([key, updaters]) => {
        // Last subscription in the set, remove entry completely
        if (updaters.size === 1) {
          delete trackedKeysToUpdatersMap[key]
        } else {
          updaters.delete(updater)
        }
      })
    }
    return [proxy as T, unsubscribe] as const
  }
}
