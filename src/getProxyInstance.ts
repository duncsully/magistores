
type Updater = () => any;

/** A simple map of properties and all updaters subscribed to that property */
type PropertySubscriptions<T> = Record<keyof T, Set<Updater>>;

/** A WeakMap associating stores to their subscriptions. */
const storeToSubscriptionsMap = new WeakMap<any, PropertySubscriptions<any>>();

/** Wraps a store in a proxy that automatically subscribes all reads to this proxy and calls updater if any subscribed property changes
 * @param store - The object representing a store to wrap
 * @param updater - A function to call whenever a property read by the proxied store changes
 */
export const getProxyInstance = <T extends {}>(store: T, updater: Updater): readonly [T, (updater: Updater) => void] => {
    /** All property subscriptions for this store. */
    const propertySubscriptions: PropertySubscriptions<T> = storeToSubscriptionsMap.get(store) ?? {};
    storeToSubscriptionsMap.set(store, propertySubscriptions);

    /** Checks all subscribed props before and after calling change and calls all subscribers on any changed props */
    const makeUpdatingChange = (change: () => any) => {
        // Get current values before calling original method
        const currentValues = Object.keys(propertySubscriptions).map(prop => store[prop as keyof T]);
        // Do the call as requested (and make sure it's bound to object)
        const returnValue = change();
        // Get the new values 
        const newValues = Object.keys(propertySubscriptions).map(prop => store[prop as keyof T]);
        // To not call the same updater more than once, consolidate all updaters into one set
        const toUpdate = Object.values<Set<Updater>>(propertySubscriptions).reduce((toUpdate, subscriptions, i) => {
            const currentValue = currentValues[i];
            const newValue = newValues[i];

            // Shallow compare values, include subscriptions for this key if values differ
            if (currentValue !== newValue) {
                return new Set([...toUpdate, ...subscriptions]);
            }
            return toUpdate;
        }, new Set<Updater>());

        // Go through all of the updaters that were subscribed to at least one of the changed properties
        toUpdate.forEach(updater => updater());

        return returnValue;
    };

    const proxy = new Proxy<T>(store, {
        get: (obj, key) => {
            const prop = key as keyof T;
            let value = obj[prop];

            // TODO?: This could technically be its own proxy using the "apply" trap to more elegantly wrap the method without "replacing" it
            // Wrap methods to update appropriate subscribers (except the constructor, which for static properties should be treated as an object)
            if (value instanceof Function && prop !== 'constructor') {
                // Oh TypeScript, sometimes I just can't figure you out
                const method = value as unknown as Function;
                return (...args: any[]) => makeUpdatingChange(() => method.call(obj, ...args));
            } else if (value instanceof Object) {
                const [nestedProxy] = getProxyInstance(value, updater);
                value = nestedProxy;
            }

            if (prop !== 'constructor') {
                // Subscribe this instance to the property
                const subscriptions = propertySubscriptions[prop] ??= new Set();
                subscriptions.add(updater);
            }

            return value;
        },
        set: (obj, prop, newValue) => {
            makeUpdatingChange(() => {
                obj[prop as keyof T] = newValue;
            });
            return true;
        }
    });

    const unsubscribe = (updater: Updater) => {
        Object.values<Set<Updater>>(propertySubscriptions).forEach(subscriptions => subscriptions.delete(updater));
    };

    return [proxy, unsubscribe] as const;
};
