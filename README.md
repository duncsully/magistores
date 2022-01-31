# Magistores

Yet another state management solution, but the easiest one to use yet! Unopinionated and powerful, it lets you spend less time both setting up your store AND using it.

## How it works

Pass in a store creation function to `createStoreSubscriptionAdder` to get back a function for subscribing to your store. Calling this subscribe function with an updateHandler callback will give you:

1. A proxy to your store
2. An unsubscribe function

This proxy will automatically track reads wherever it is used (e.g. in a component). It also intercepts setters and method calls (nested ones included), checking what values change. Every updateHandler callback listening to a
changed value will be called. This means you don't have to specify any state selectors in your components nor call some update function in your store. It all just works.

## Getting started

The aim is to be unopinionated, so you can create a store however you like as long as it's an object.

At its simplest, you can make a store that's just an object literal with properties. These properties have reactive setters, updating all subscriptions.

```typescript
export default createStoreSubscriptionAdder(() => ({
  name: 'world',
}))
```

Of course you can do things like use a state object and methods if you'd like.

```typescript
export default createStoreSubscriptionAdder(() => ({
  state: {
    name: 'world',
  },
  setName(newName: string) {
    this.state.name = newName
  },
}))
```

Object literals work fine, but you might reach a point where you'd like to start using classes. This is especially useful if you'd like to define common
store behaviors to inherit for all of your stores, such as requiring a readonly state object, or tracking history, or even persisting state to localStorage

```typescript
abstract class HistoryStore<T> {
  protected abstract _state: T

  #history: T[] = []
  #forward: T[] = []

  get state() {
    return Object.freeze(this._state)
  }

  setState(changes: Partial<T>) {
    this.#history.push({ ...this._state })
    this.#forward = []
    this._state = { ...this._state, ...changes }
  }

  back() {
    if (!this.#history.length) return
    this.#forward.push({ ...this._state })
    this._state = this.#history.pop() as T
  }

  forward() {
    if (!this.#forward.length) return
    this.#history.push({ ...this._state })
    this._state = this.#forward.pop() as T
  }
}

class MyStore extends HistoryStore<{ firstName: string; lastName: string }> {
  protected _state: {
    firstName: 'The'
    lastName: 'world'
  }

  get fullName() {
    return `${this.state.firstName} ${this.state.lastName}`.trim()
  }

  setFirstName(firstName: string) {
    this.setState({ firstName })
  }

  setLastName(lastName: string) {
    this.setState({ lastName })
  }
}

export default createStoreSubscriptionAdder(() => new MyStore())
```

## Manually check for updates

Usually all updates will be automatically checked for you on setter and method calls. However, especially for asynchronous actions, you might need to manually trigger an update check. For debugging purposes, you can optionally pass a message to the update checking function to log to the console.

```typescript
export default createStoreSubscriptionAdder(checkForUpdates => {
  const store = {
    data: undefined,
    loading: true,
  }
  fetch('www.somesite.com')
    .then(response => response.json())
    .then(data => {
      store.data = data
      store.loading = false
      // With this, anything subscribed to 'data' or 'loading' will be updated after this fetch completes
      checkForUpdates()
    })
  return store
})
```

## Unsubscribing

It's important that when your subscribed code no longer needs to watch for changes (e.g. your component dismounts) that it unsubscribes. This prevents needless checks and update calls (that, depending on your framework, may cause bugs) and allows
a store to be garbage collected if there are no longer any subscribers.

## Options

The default configuration is designed to be convenient and powerful. However, you can customize behaviors via a handful of options.

### onCleanup

By default, when the last subscriber to your store unsubscribes, the store gets deleted to free up memory. You can optionally run any code you need to before this happens by passing a function to the `onCleanup` option. If you return false from the function, the store won't be deleted and will remain available for new subscribers, maintaining its current state.

### hasChanged

By default, `Object.is()` is used to check if a value changed. This means that objects (including arrays and functions) won't be equal if they aren't the same reference, even if they hold the same values. You can pass your own
`hasChanged` function for comparing values. A single argument object containing all of the arguments will be passed:

- `previousValue`: the last read value
- `currentValue`: the current value
- `path`: a string representing the property path to this property from the store object
- `store`: the store object

Return true if there should be an update, false to not update, or undefined/null to defer to the default behavior. For example, if you'd like to compare array values shallowly, you could do something like:

```typescript
{
  hasChanged: ({ previousValue, currentValue }) =>
    Array.isArray(previousValue)
      ? previousValue.some((val: any, i: number) => val !== currentValue[i])
      : undefined
}
```

Note that this depends on the reference still changing, otherwise previousValue will still point to the same array reference and always return false. If you'd like to compare the same array reference to previous values, you would need to implement your own previous value tracking functionality like:

```typescript
// Using a WeakMap to make sure previousArrayValues arrays don't stick around
const previousArrayValues = new WeakMap<any[], any[]>()

// ...
{
  hasChanged: ({ currentValue }) => {
    if (Array.isArray(currentValue)) {
      const previousValue = previousArrayValues.get(currentValue)
      const changed = previousValue.some(
        (val: any, i: number) => val !== currentValue[i]
      )
      previousArrayValues.set(currentValue, [...currentValue])
      return changed
    }
  }
}
```

A similar approach would work for objects as well.

### onGet

By default, any read property path is added to the list of watched property paths, compared for changes, and will cause a handleUpdate call if changed. You can optionally run any code you need before the path is added to the list by passing a function to `onGet` option. A single argument object containing all of the arguments will be passed:

- `obj`: the object the property is being read from
- `key`: the key for the property
- `path`: a string representing the property path to the property from the store object
- `store`: the store object

If you return false from the function, the property path won't be added to the list of watched property paths. For example, you can ignore reads to anything that isn't in the state object with something like:

```typescript
{
  onGet: ({ path }) => path.startsWith('state.')
}
```

### onSet and onMethodCall

By default, updates are checked for after each setter and method call, nested ones included. You can optionally run any code you need after the new value is set or method is called by passing a function to `onSet` and/or `onMethodCall` options. A single argument object containing all of the arguments will be passed:

- `obj`: the object the setter or method resides on
- `key`: the key for the setter or method
- `path`: a string representing the property path to the setter or method from the store object
- `store`: the store object

If you return false from the function, there won't be a check for updates afterward. For example, you can opt out of all automatic updates for setters
and only check for updates on top-level method calls with something like:

```typescript
{
  onSet: () => false,
  onMethodCall: ({ obj, store }) => obj === store
}
```
