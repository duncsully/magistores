// TODO:
// More debugger logs
// Make React dev dependency and optional peer dependency
// Add support for other frameworks: Svelte, Vue, Lit
// Cache nested proxies?
// Pass something to updateHandler (what caused change)?
// Look into useSyncExternalStore - need a way to generate a stable snapshot? Return array of path values?

// Partially modified version of https://www.typescriptlang.org/play?ts=4.1.0-pr-40336-88&ssl=23&ssc=13&pln=14&pc=1#code/FAFwngDgpgBACgQxACwJIFsIBsA8AVAGhgGkowYoAPEKAOwBMBnGAazIHsAzGPAPhgC8wGCTIVqdJjEYgATgEtaAc2EwA-DwDapMAF1xNBswBKUAMbtZ9HDIXKiCWmF6qRGgD4wABgBIA3joAvgB0-ogoGNj42mS6RACilGZYAK70UDhsYFxaOnGsHNyOYJq6vPwAZNJyikqBXq4iMJ6+AWQh-onJaRlZOXgxekR9RU6lldV2dQ1NMABcMLRQAG5QsqoLS6uyANzAoJCw4WiYWABM+PwC8EgnUYQF2dx8zY-9ewfQNyiXgt9351+VEMUlstVeIx46n+kUBLwWkLwH3AX2OADUEKkMg84AZJMxjpcrqpccD8d5-IpOGtRGAOn4qTTTDJ6qoNDo8UY3s9GhpmSBOVJCQM8i5Zm5-hisdE8kR+WLxZsVmtGkrtht4ILmIjeVo4LpVYtlbt9ulkghZLBOClaGYQPJ2LQYEooCB8ERSRIucLygAKdgAIwAVgsHhBbgs4ABKSO3KUpbEe3gfCy0GQwQNB8wC65+VSceSyGQAOQQ6CgCwARAAReRQJTsSsEVRYBAlssVmCVgASCAAXk3VAgXQsAMwABmbIggsnYWbtjAWmkafkWHarpgQLHkICbMFTNQDKRAlkXMAAbAAOGCBKdNVe0dddgDCjpkSCge4PCiPJ6LCwARjOG87wNQIYDbfc3xAD4XRAf1g2zIhKxnOds0YYJKyjHYgA
type PathImpl<T, Key extends keyof T> = Key extends string
  ? T[Key] extends Record<string, any>
    ?
        | `${Key}.${PathImpl<T[Key], Exclude<keyof T[Key], keyof any[]>> &
            string}`
        | `${Key}.${Exclude<keyof T[Key], keyof any[]> & string}`
    : never
  : never

type PathImpl2<T> = PathImpl<T, keyof T> | (keyof T & string)

export type Path<T> = PathImpl2<T> extends string | keyof T
  ? PathImpl2<T>
  : keyof T & string

// Not used currently but keeping in case
/* type PathValue<T, P extends Path<T>> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Path<T[Key]>
      ? PathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never */

export type UpdateHandler = () => any

export type SubscribeFunction<T> = (
  updateHanlder: UpdateHandler
) => readonly [T, (debugStatement?: string) => void]

type StoreCreator<T> = (checkForUpdates: () => number) => T

interface CommonArgs<T> {
  /** A reference to the store object */
  store: T
  /** A representation of the property path for nested values (e.g. "state.someObject.someProperty") */
  path: Path<T>
  /** The target object */
  obj: any
  /** The key for this setter/method */
  key: string | symbol
}

/** When true or false should assert specific behaviors but a nullish value should defer to default behaviors */
type ternary = boolean | undefined | null

interface CreateStoreSubscriptionAdderOptions<T> {
  /**
   * Check if a value should be considered as changed for the purpose of updating subscribers to that value
   * @returns True if should update subscribers, else false
   */
  hasChanged?: (args: {
    /** The previously read value by any subscriber */
    previousValue: any
    /** The current value */
    currentValue: any
    /** A representation of the property path for nested values (e.g. "state.someObject.someProperty") */
    path: Path<T>
    /** A reference to the store object */
    store: T
  }) => ternary
  /**
   * Callback to run during getter
   * @returns false if shouldn't track this path
   */
  onGet?: (args: CommonArgs<T>) => ternary
  /**
   * Callback to run after setter
   * @returns false if shouldn't check for updates
   */
  onSet?: (args: CommonArgs<T>) => ternary
  /**
   * Callback to run after method call
   * @returns false if shouldn't check for updates
   */
  onMethodCall?: (args: CommonArgs<T>) => ternary
  /**
   * Callback to run after last subscriber unsubscribes
   * @returns false to keep the current store for any new subscribers instead of creating a new one
   */
  onCleanup?: (store: T) => ternary
}

/**
 * Creates a function for subscribing to the given store object
 * @param createStore A function that returns a store object to watch for changes on, will be called whenever there is a first subscriber
 * @returns A function that, given an update handler function, will return both 1. a proxy that tracks reads and changes to values and 2. an unsubscribe function.
 * The passed update handler function will be called whenever a value read from the proxy (nested values included) is changed via any proxy returned from this storeSubscriptionAdder
 */
export const createStoreSubscriptionAdder = <T>(
  createStore: StoreCreator<T>,
  options: CreateStoreSubscriptionAdderOptions<T> = {}
) => {
  let store: T | null
  const { hasChanged, onGet, onSet, onMethodCall, onCleanup } = options
  /** This records all tracked key paths and the last read value. A key path represents a path on the original store object (e.g. 'someState.someProp') */
  const previouslyReadValues: Partial<Record<Path<T>, any>> = {}
  /** This records all paths an updateHandler is tracking for changes to */
  const updateHandlerToWatchedPathsMap = new Map<UpdateHandler, Set<Path<T>>>()
  /** For keeping track of all unique updateHandler instances */
  let totalupdateHandlers = 0

  /** Given a key path, return the value from the nested object */
  const getPathValue = (path: Path<T>) => {
    const props = path.split('.')
    let currentVal: any = store
    props.forEach(prop => (currentVal = currentVal[prop]))
    return currentVal
  }

  /** Iterates through all tracked paths, checks for which ones changed, and calls any updateHandler tracking a changed path value */
  const checkForUpdates = () => {
    console.debug('Checking for updates...')
    const updatedPaths = new Set<Path<T>>()
    Object.entries(previouslyReadValues).forEach(
      ([stringPath, previousValue]) => {
        const path = stringPath as Path<T>
        const currentValue = getPathValue(path)
        if (
          (store &&
            hasChanged?.({ previousValue, currentValue, path, store })) ??
          !Object.is(previousValue, currentValue)
        ) {
          console.debug(
            `Path "${path}" changed from`,
            previousValue,
            'to',
            currentValue
          )
          updatedPaths.add(path)
          previouslyReadValues[path] = currentValue
        }
      }
    )
    let updated = 0
    updateHandlerToWatchedPathsMap.forEach((paths, updateHandler) => {
      if (Array.from(paths).some(path => updatedPaths.has(path))) {
        updated++
        updateHandler()
      }
    })
    console.debug(
      'Finished checking for updates. Subscribers updated:',
      updated
    )
    return updated
  }

  /**
   * Given an updateHandler, returns:
   * 1. A proxy that watches for all read properties (including nested ones) and calls updateHandler when any of the read properties change
   * 2. A function to unsubscribe the updateHandler
   */
  const subscribeToStore: SubscribeFunction<T> = updateHandler => {
    if (!store) {
      store = createStore(checkForUpdates)
      if (store !== Object(store)) {
        throw Error('Value returned was not an object')
      }
      console.debug('Created new store', store)
    }

    totalupdateHandlers++
    const watchedPaths = new Set<Path<T>>()
    updateHandlerToWatchedPathsMap.set(updateHandler, watchedPaths)

    const createProxy = (obj: any, parentPath?: Path<T>, parent?: any) =>
      Proxy.revocable(obj, {
        get(obj, key) {
          let value = obj[key]
          const prop = String(key)
          const path = (parentPath ? `${parentPath}.${prop}` : prop) as Path<T>

          if (
            key !== 'constructor' &&
            store &&
            onGet?.({ store, path, key, obj }) !== false
          ) {
            previouslyReadValues[path] = value
            // Subscribe this instance to changes to this property
            watchedPaths.add(path)
          } else {
            delete previouslyReadValues[path]
            watchedPaths.delete(path)
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
          const path = (parentPath ? `${parentPath}.${prop}` : prop) as Path<T>
          if (store && onSet?.({ store, path, key, obj }) !== false) {
            console.debug(
              `Setter at path "${path}" triggered check for updates`
            )
            checkForUpdates()
          }
          return true
        },
        apply(func, _, args) {
          // In order to reach the apply trap, need to have created a proxy from a parent object for this function, so parentPath is certain to exist
          const path = parentPath!
          const dotLastIndex = path.lastIndexOf('.')
          const key = dotLastIndex > -1 ? path.slice(dotLastIndex) : path
          // 'This' context will pretty much always be intended to be parent object and not the calling context
          const returnValue = func.apply(parent, args)
          if (
            store &&
            onMethodCall?.({ store, path, key, obj: parent }) !== false
          ) {
            console.debug(
              `Method call at path "${path}" triggered check for updates`
            )
            checkForUpdates()
          }
          return returnValue
        },
      })

    const { proxy, revoke } = createProxy(store)

    const unsubscribe = () => {
      revoke()
      totalupdateHandlers--
      updateHandlerToWatchedPathsMap.delete(updateHandler)
      if (!totalupdateHandlers && onCleanup?.(store!) !== false) {
        console.debug('Deleting store', store)
        store = null
      }
    }
    return [proxy as T, unsubscribe] as const
  }
  return subscribeToStore
}
