import {
  StoreMetadata,
  storeToMetadataMap,
  PropertySubscriptions,
} from './createStoreProxy'

// TODO: Debounce?
/** A decorator for making a property go through localStorage, and subscribing
 * for changes from other windows
 */
export function localStorageValue(key: string, defaultValue?: string): any {
  return function (_: any, property: PropertyKey) {
    let subscribed = false
    return {
      get() {
        if (!subscribed) {
          subscribeToLocalStorageChange(this as any, property, key)
          subscribed = true
        }

        return localStorage.getItem(key) ?? defaultValue
      },
      set(newValue: string) {
        localStorage.setItem(key, newValue)
      },
      configurable: true,
      enumerable: true,
    }
  }
}

const subscribeToLocalStorageChange = <T>(
  store: T,
  property: keyof T,
  localStorageKey: string
) => {
  const storeMetadata: StoreMetadata<T> = storeToMetadataMap.get(store) ?? {
    propertySubscriptions: {} as PropertySubscriptions<T>,
  }
  storeToMetadataMap.set(store, storeMetadata)
  const localStorageSubscriptions = (storeMetadata.localStorageSubscriptions ??=
    {})
  const keySubscriptions = (localStorageSubscriptions[localStorageKey] ??=
    new Set())
  keySubscriptions.add(property)
}

// TODO: Support objects?
window.addEventListener('storage', (e: StorageEvent) => {
  if (e.newValue !== e.oldValue) {
    storeToMetadataMap.forEach((storeMetadata) => {
      storeMetadata.localStorageSubscriptions?.[e.key ?? '']?.forEach(
        (property) => {
          storeMetadata.propertySubscriptions[property].forEach((updater) =>
            updater()
          )
        }
      )
    })
  }
})
