import { useEffect, useReducer, useState } from 'react'
import { createStoreProxy } from './createStoreProxy'

/** A hook for subscribing to simple stores. Any changes to properties used by a component (and only used properties) will rerender the component
 * @param store - An object with which to watch for property changes to rerender
 */
export const useStore = <T extends {}>(store: T) => {
  // TODO: updater is different on first render vs subsequent renders? Doesn't seem to harm anything, but adds more subscribers than needed
  // Triggers rerender when called
  const [, updater] = useReducer((x) => x + 1, 0)

  // Proxy for store handles subscribing component to all properties it reads and calling updater when any of those change due to an assignment or method call on the store
  const [[proxy, unsubscribe]] = useState(() =>
    createStoreProxy(store, updater)
  )

  // Unsubscribe on dismount (function train, choo choo!)
  useEffect(
    () => () => unsubscribe(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return proxy as T
}
