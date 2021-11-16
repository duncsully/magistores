// TODO: Support when parent changes child properties?
/* e.g.
{
    state: {
        value: 1
    }
    setValue(value: number) {
        this.state.value = value
    }
}
*/

type Updater = () => any;

interface StoreSubscriptions<T> {
    parent?: any,
    propertySubscriptions: PropertySubscriptions<T>
}

/** A simple map of properties and all updaters subscribed to that property */
type PropertySubscriptions<T> = Record<keyof T, Set<Updater>>;

/** A WeakMap associating stores to their subscriptions. */
const storeToSubscriptionsMap = new WeakMap<any, StoreSubscriptions<any>>();

/** Compares values before and after calling change CB and calls all updaters on subscribers on changed properties */
const makeUpdatingChange = <T>(store: T, change: () => any, allUpdaters?: Updater[]): any => {
    const toUpdate = allUpdaters ?? []
    const storeSubscriptions: StoreSubscriptions<T> = storeToSubscriptionsMap.get(store) ?? { propertySubscriptions: {} }
    storeToSubscriptionsMap.set(store, storeSubscriptions)

    const { parent, propertySubscriptions } = storeSubscriptions

    // Get current values before calling original method
    const currentValues = Object.keys(propertySubscriptions).map(prop => store[prop as keyof T]);
    // If parent, recurse to get changes to parent's subscriptions, else do the call as requested
    const returnValue = parent ? makeUpdatingChange(parent, change, toUpdate) : change()
    // Get the new values
    const newValues = Object.keys(propertySubscriptions).map(prop => store[prop as keyof T]);

    // Add all updaters from this store's subscriptions to changed properties
    Object.values<Set<Updater>>(propertySubscriptions).forEach((updaters, i) => {
        const currentValue = currentValues[i]
        const newValue = newValues[i]
        // Shallow compare values, include updaters for this key if values differ
        if (currentValue !== newValue) {
            toUpdate.push(...updaters)
        }
    })

    // Original call
    if (!allUpdaters) {
        // Consolidate accumulated updaters so they don't get called more than once
        const allUpdatersSet = new Set(toUpdate)
        // Call each unique updater
        allUpdatersSet.forEach(updater => updater())
    }

    return returnValue
}

/** Wraps a store in a proxy that automatically subscribes all reads to this proxy and calls updater if any subscribed property changes
 * @param store - The object representing a store to wrap
 * @param updater - A function to call whenever a property read by the proxied store changes
 * @param [parent] - This store or function's parent store, so that it can update its parent
 */
export const getProxyInstance = <T extends {} | Function>(store: T, updater: Updater, parent?: any, root: any = store): readonly [T, (updater: Updater) => void] => {
    const storeSubscriptions: StoreSubscriptions<T> = storeToSubscriptionsMap.get(store) ?? { propertySubscriptions: {} as PropertySubscriptions<T>, parent }
    storeToSubscriptionsMap.set(store, storeSubscriptions);

    const { propertySubscriptions } = storeSubscriptions

    const proxy = new Proxy<T>(store, {
        get: (obj, key) => {
            const prop = key as keyof T;
            let value = obj[prop];

            // This wraps objects and functions:
            // - Objects: Basically turn into sub-stores, so that their nested values can also be watched
            // - Functions: Go through the apply trap so values can be compared after calling
            if (value instanceof Object) {
                const [nestedProxy] = getProxyInstance(value, updater, obj, root);
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
            makeUpdatingChange(obj, () => {
                obj[prop as keyof T] = newValue;
            });
            return true;
        },
        apply: (func, _, args) => {
            return makeUpdatingChange(parent, (func as Function).bind(parent, ...args))
        }
    });

    const unsubscribe = (updater: Updater) => {
        Object.values<Set<Updater>>(propertySubscriptions).forEach(subscriptions => subscriptions.delete(updater));
    };

    return [proxy, unsubscribe] as const;
};
