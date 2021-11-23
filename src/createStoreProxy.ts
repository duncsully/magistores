type Updater = () => any

export interface StoreMetadata<T> {
  parent?: any
  children?: Set<any>
  propertySubscriptions: PropertySubscriptions<T>
  localStorageSubscriptions?: Record<string, Set<keyof T>>
}

/** A simple map of properties and all updaters subscribed to that property */
export type PropertySubscriptions<T> = Record<keyof T, Set<Updater>>

/** A Map associating stores to their metadata. */
export const storeToMetadataMap = new Map<any, StoreMetadata<any>>()

const getAncestorStores = (store: any): any[] => {
  return store
    ? [...getAncestorStores(storeToMetadataMap.get(store)?.parent), store]
    : []
}

const getDescendantStores = (store: any) => {
  const storeMetadata = storeToMetadataMap.get(store)
  const results: any[] = []
  storeMetadata?.children?.forEach((childStore) => {
    results.push(childStore, ...getDescendantStores(childStore))
  })
  return results
}

/** A store's values can affect its ancestors, while its methods can affect its descendants, so get all stores in both directions (ignoring "cousins") */
const getRelatedStores = (store: any) => [
  ...getAncestorStores(store),
  ...getDescendantStores(store),
]

const getSubscribedPropertyValues = (store: any) => {
  const { propertySubscriptions = {} } = storeToMetadataMap.get(store) ?? {}
  return Object.keys(propertySubscriptions).map((prop) => store[prop])
}

/** Updates all subscriptions to any changed properties after making the passed change */
const makeUpdatingChange = (store: any, change: () => any) => {
  // Crawl up to root store and then get all descendant stores
  const storesToCheck = getRelatedStores(store)

  // Get values for comparison before and after change
  const currentValues = storesToCheck.map(getSubscribedPropertyValues)
  const returnValue = change()
  const newValues = storesToCheck.map(getSubscribedPropertyValues)

  const toUpdate: Updater[] = []
  // Check changed values store by store
  storesToCheck.forEach((store, i) => {
    const { propertySubscriptions } = storeToMetadataMap.get(store) ?? {
      propertySubscriptions: {},
    }
    const storeCurrentValues = currentValues[i]
    const storeNewValues = newValues[i]
    // Check each property subscription per store
    Object.values(propertySubscriptions).forEach((updaters, j) => {
      const currentValue = storeCurrentValues[j]
      const newValue = storeNewValues[j]
      // Shallow comparison, add updater if values different
      if (currentValue !== newValue) {
        toUpdate.push(...updaters)
      }
    })
  })
  // Add to set to make sure each updater is only added once, call each updater
  new Set(toUpdate).forEach((updater) => updater())
  return returnValue
}

/** Wraps a store in a proxy that automatically subscribes all reads to this proxy and calls updater if any subscribed property changes
 * @param store - The object representing a store to wrap
 * @param updater - A function to call whenever a property read by the proxied store changes
 * @param [parent] - This store or function's parent store, so that it can update its parent
 */
export const createStoreProxy = <T extends {} | Function>(
  store: T,
  updater: Updater,
  parent?: any
): readonly [T, (updater: Updater) => void] => {
  const storeMetadata: StoreMetadata<T> = storeToMetadataMap.get(store) ?? {
    propertySubscriptions: {} as PropertySubscriptions<T>,
  }
  storeToMetadataMap.set(store, storeMetadata)
  storeMetadata.parent = parent

  const { propertySubscriptions } = storeMetadata

  const proxy = new Proxy<T>(store, {
    get: (obj, key) => {
      const prop = key as keyof T
      let value = obj[prop]

      // This wraps objects and functions:
      // - Objects: Basically turn into sub-stores, so that their nested values can also be watched
      // - Functions: Go through the apply trap so values can be compared after calling
      if (value instanceof Object) {
        storeMetadata.children ??= new Set()
        storeMetadata.children.add(value)
        const [nestedProxy] = createStoreProxy(value, updater, obj)
        value = nestedProxy
      }

      if (prop !== 'constructor') {
        // Subscribe this instance to changes to this property
        const subscriptions = (propertySubscriptions[prop] ??= new Set())
        subscriptions.add(updater)
      }

      return value
    },
    set: (obj, key, newValue) => {
      const prop = key as keyof T
      // Child is getting replaced by a new substore, delete its entry
      if (newValue instanceof Object) {
        storeMetadata.children?.delete(obj[prop])
      }
      makeUpdatingChange(obj, () => {
        obj[prop] = newValue
      })
      return true
    },
    apply: (func, _, args) => {
      return makeUpdatingChange(
        parent,
        (func as Function).bind(parent, ...args)
      )
    },
  })

  const unsubscribe = (updater: Updater) => {
    Object.values<Set<Updater>>(propertySubscriptions).forEach(
      (subscriptions) => subscriptions.delete(updater)
    )
  }

  return [proxy, unsubscribe] as const
}
