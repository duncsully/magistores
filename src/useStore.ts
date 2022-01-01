import { useEffect, useMemo, useReducer } from 'react'
import { SubscribeFunction } from './createStoreSubscriber'

/** A hook for subscribing to stores. Any changes to properties used by a component (and only used properties) will rerender the component
 * @param subscribe - The subscribe function returned from createStoreSubscriber
 * @param storeArgs - All arguments to pass to createStore function passed for the subscribe function. Note: Generally only need to pass these for the first element responsible for initializing the store
 */
export const useStore = <T>(subscribe: SubscribeFunction<T>) => {
  // Note that while in React dev mode, you'll see two updaters per subscription. This isn't a problem in production mode.
  // Triggers rerender when called
  const [, updater] = useReducer((x) => x + 1, 0)

  // Proxy for store handles subscribing component to all properties it reads and calling updater when any of those change
  const [storeProxy, unsubscribe] = useMemo(
    () => subscribe(updater),
    // storeArgs shouldn't be changed after first hook call, but it will probably be a new array each time, so don't track it
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subscribe]
  )

  // Unsubscribe on dismount (or if subscription changes because store changes)
  useEffect(() => unsubscribe, [unsubscribe])

  return storeProxy
}
