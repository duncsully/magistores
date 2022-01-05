// TODO:
// More debugger logs
// Make React dev dependency and optional peer dependency
// Add support for other frameworks: Svelte, Vue, Lit
// Cache nested proxies?

export type Updater = () => any

export type SubscribeFunction<T> = (
  updater: Updater
) => readonly [T, (debugStatement?: string) => void]

interface CommonArgs<T, K> {
  /** A reference to the store object */
  store: T
  /** A representation of the property path for nested values (e.g. "state.someObject.someProperty") */
  path: string
  /** The target object */
  obj: K
  /** The key for this setter/method */
  key: keyof K
}

interface CreateStoreSubscriberOptions {
  // TODO: Add more robust typing
  /**
   * Check if a value should be considered as changed for the purpose of updating subscribers to that value
   * @returns True if should update subscribers, else false
   */
  hasChanged?: <T>(args: {
    /** The previously read value by any subscriber */
    previousValue: any
    /** The current value */
    currentValue: any
    /** A representation of the property path for nested values (e.g. "state.someObject.someProperty") */
    path: string
    /** A reference to the store object */
    store: T
  }) => boolean
  /**
   * Callback to run after setter
   * @returns false if shouldn't check for updates
   */
  onSet?: <T, K>(args: CommonArgs<T, K>) => boolean | undefined | void
  /**
   * Callback to run after method call
   * @returns false if shouldn't check for updates
   */
  onMethodCall?: <T, K>(args: CommonArgs<T, K>) => boolean | undefined | void
  /**
   * Callback to run after last subscriber unsubscribes
   * @returns false to keep the current store for any new subscribers instead of creating a new one
   */
  onCleanup?: <T>(store: T) => boolean | undefined | void
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
  options: CreateStoreSubscriberOptions = {}
): SubscribeFunction<ReturnType<T>> => {
  let store: ReturnType<T> | null
  const {
    hasChanged = ({ previousValue, currentValue }) =>
      previousValue !== currentValue,
    onSet = () => true,
    onMethodCall = () => true,
    onCleanup = () => true,
  } = options
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
  const checkForUpdates = (debugStatement?: string) => {
    console.debug(debugStatement ?? 'Manual call triggered check for updates')
    const updatedPaths: string[] = []
    Object.entries(previouslyReadValues).forEach(([path, previousValue]) => {
      const currentValue = getPathValue(path)
      if (hasChanged({ previousValue, currentValue, path, store })) {
        console.debug(
          `Path "${path}" changed from`,
          previousValue,
          'to',
          currentValue
        )
        updatedPaths.push(path)
        previouslyReadValues[path] = currentValue
      }
    })
    updaterToTrackedPathsMap.forEach((paths, updater) => {
      if (Array.from(paths).some((path) => updatedPaths.includes(path))) {
        updater()
      }
    })
    console.debug('Finished checking for updates')
  }

  /** Given an updater, returns a proxy that watches for all read properties (including nested ones) and calls updater when any of the read properties change
   * and a function to unsubscribe the updater
   */
  return (updater: Updater) => {
    if (!store) {
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
          const prop = String(key)
          const path = parentPath ? `${parentPath}.${prop}` : prop
          if (onSet({ store, path, key, obj }) ?? true) {
            checkForUpdates(
              `Setter at path "${path}" triggered check for updates`
            )
          }
          return true
        },
        apply(func, _, args) {
          const path = parentPath ?? ''
          const dotLastIndex = path.lastIndexOf('.')
          const key = dotLastIndex > -1 ? path?.slice(dotLastIndex) : path
          // 'This' context will pretty much always be intended to be parent object and not the calling context
          const returnValue = func.apply(parent, args)
          if (onMethodCall({ store, path, key, obj: parent }) ?? true) {
            checkForUpdates(
              `Method call at path "${path}" triggered check for updates`
            )
          }
          return returnValue
        },
      })

    const { proxy, revoke } = createProxy(store)

    const unsubscribe = () => {
      revoke()
      totalUpdaters--
      updaterToTrackedPathsMap.delete(updater)
      if (!totalUpdaters && (onCleanup(store!) ?? true)) {
        console.debug('Deleting store', store)
        store = null
      }
    }
    return [proxy as ReturnType<T>, unsubscribe] as const
  }
}
