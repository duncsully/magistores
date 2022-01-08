import { useEffect, useMemo, useReducer } from 'react'
import { SubscribeFunction } from './createStoreSubscriber'

/** A hook for handling subscribing a React component to a store created with createStoreSubscriber
 * @param subscribe - The subscribe function returned from createStoreSubscriber
 */
export const useStore = <T>(subscribe: SubscribeFunction<T>) => {
  // Note that while in React dev mode, you'll see two updaters per subscription. This isn't a problem in production mode.
  // Triggers rerender when called
  const [, updater] = useReducer((x) => x + 1, 0)

  // Proxy for store handles subscribing component to all properties it reads and calling updater when any of those change
  const [storeProxy, unsubscribe] = useMemo(
    () => subscribe(updater),
    [subscribe]
  )

  // Unsubscribe on dismount (or if subscription changes because store changes)
  useEffect(() => unsubscribe, [unsubscribe])

  return storeProxy
}
