import { useEffect, useMemo, useReducer } from 'react'
import { SubscribeFunction } from './createStoreSubscriptionAdder'

/**
 * A hook for handling subscribing a React component to a store created with @see {@link createStoreSubscriptionAdder}
 * @param subscribe - The subscribe function returned from @see {@link createStoreSubscriptionAdder}
 * @returns - An instance of the store that will track reads and automatically rerender if any read value changes
 */
export const useStore = <T>(subscribe: SubscribeFunction<T>) => {
  // Note that while in React dev mode, you'll see two rerender functions per subscription. This isn't a problem in production mode.
  const [, rerender] = useReducer(x => x + 1, 0)

  // Proxy for store handles subscribing component to all properties it reads and calling updateHandler when any of those change
  const [storeProxy, unsubscribe] = useMemo(
    () => subscribe(rerender),
    [subscribe]
  )

  // Unsubscribe on dismount (or if subscription changes because store changes)
  useEffect(() => unsubscribe, [unsubscribe])

  return storeProxy
}
