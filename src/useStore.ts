import { useEffect, useMemo, useReducer } from 'react'
import { subscribeToStore } from './subscribeToStore'

/** A hook for subscribing to stores. Any changes to properties used by a component (and only used properties) will rerender the component
 * @param store - An object with which to watch for property changes to rerender
 */
export const useStore = <T>(store: T) => {
  // Note that while in React dev mode, you'll see two updaters per subscription. This isn't a problem in production mode.
  // Triggers rerender when called
  const [, updater] = useReducer((x) => x + 1, 0)

  // Proxy for store handles subscribing component to all properties it reads and calling updater when any of those change
  const [storeProxy, unsubscribe] = useMemo(
    () => subscribeToStore(store, updater),
    [store]
  )

  // Unsubscribe on dismount (or if subscription changes because store changes)
  useEffect(() => unsubscribe, [unsubscribe])

  return storeProxy
}
