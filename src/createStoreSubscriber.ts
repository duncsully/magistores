// TODO:
// More debugger logs
// Option to proxy nested values or not?
// Option to use custom comparison for keyPaths?
// Option to not automatically call checkForUpdates in setter and/or methods?

export type Updater = () => any

export type SubscribeFunction<T> = (
  updater: Updater
) => readonly [T, () => void]

interface CreateStoreSubscriberOptions {
  keepStore: boolean
}

const defaultOptions: CreateStoreSubscriberOptions = {
  keepStore: false,
}

/**
 * Creates a subscribe function for the given store object
 * @param createStore A function that returns a store object to watch for changes on, will be called whenever there is a first subscriber
 * @returns A function that, given an update function, will return both 1. a proxy that tracks reads and changes to values and 2. an unsubscribe function.
 * The passed updated function will be called whenever a value read from the proxy (nested values included) is changed via any proxy returned from this subscriber
 */
export const createStoreSubscriber = <
  T extends (checkForUpdates: () => void) => any
>(
  createStore: T,
  options: Partial<CreateStoreSubscriberOptions> = {}
): SubscribeFunction<ReturnType<T>> => {
  let store: ReturnType<T> | null
  const { keepStore } = { ...defaultOptions, ...options }
  /** This records all tracked key paths and the last read value. A key path represents a path on the original store object (e.g. 'someState.someProp') */
  const previouslyReadValues: Record<string, any> = {}
  /** This records all paths an updater is tracking for changes to */
  const updaterToTrackedPathsMap = new Map<Updater, Set<string>>()
  /** For keeping track of all unique updater instances */
  let totalUpdaters = 0

  /** Given a key path, return the value from the nested object */
  const getPathValue = (path: string) => {
    const props = path.split('.')
    let currentVal: any = store
    props.forEach((prop) => (currentVal = currentVal[prop]))
    return currentVal
  }

  /** Iterates through all tracked paths, checks for which ones changed, and calls any updater tracking a changed path value */
  const checkForUpdates = () => {
    const updatedPaths: string[] = []
    Object.entries(previouslyReadValues).forEach(([path, prevValue]) => {
      const currentVal = getPathValue(path)
      if (prevValue !== currentVal) {
        console.debug(
          `Path "${path}" changed from`,
          prevValue,
          'to',
          currentVal
        )
        updatedPaths.push(path)
        previouslyReadValues[path] = currentVal
      }
    })
    updaterToTrackedPathsMap.forEach((paths, updater) => {
      if (Array.from(paths).some((path) => updatedPaths.includes(path))) {
        updater()
      }
    })
  }

  /** Given an updater, returns a proxy that watches for all read properties (including nested ones) and calls updater when any of the read properties change
   * and a function to unsubscribe the updater
   */
  return (updater: Updater) => {
    // If not keepStore and everything has since unsubscribed, reinitialize. Else reuse existing store
    if (!store || (!totalUpdaters && !keepStore)) {
      store = createStore(checkForUpdates)
      console.debug('Created new store', store)
    }

    totalUpdaters++
    const trackedKeys = new Set<string>()
    updaterToTrackedPathsMap.set(updater, trackedKeys)

    const createProxy = (obj: any, parentPath?: string, parent?: any) =>
      Proxy.revocable(obj, {
        get(obj, key) {
          let value = obj[key]
          const prop = String(key)
          const path = parentPath ? `${parentPath}.${prop}` : prop

          if (key !== 'constructor') {
            previouslyReadValues[path] = value
            // Subscribe this instance to changes to this property
            trackedKeys.add(path)
          }

          // This wraps objects and functions:
          // - Objects: Basically turn into sub-stores, so that their nested values can also be watched
          // - Functions: Go through the apply trap so values can be compared after calling
          if (value instanceof Object) {
            value = createProxy(value, path, obj).proxy
          }

          return value
        },
        set(obj, key, newValue) {
          obj[key] = newValue
          checkForUpdates()
          return true
        },
        apply(func, _, args) {
          // 'This' context will pretty much always be intended to be parent object and not the calling context
          const returnValue = func.apply(parent, args)
          checkForUpdates()
          return returnValue
        },
      })

    const { proxy, revoke } = createProxy(store)

    const unsubscribe = () => {
      revoke()
      totalUpdaters--
      updaterToTrackedPathsMap.delete(updater)
    }
    return [proxy as ReturnType<T>, unsubscribe] as const
  }
}
