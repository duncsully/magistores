import { createStoreSubscriptionAdder } from './createStoreSubscriptionAdder'

export const subscribeToTestStore = createStoreSubscriptionAdder(() => ({
  test: 'dude',
  thing: 'great',
  setTest(newValue: string) {
    this.test = newValue
  },
  setThing(newValue: string) {
    this.thing = newValue
  },
}))

export const subscribeToStateAndActionsStore = createStoreSubscriptionAdder(
  () => ({
    state: {
      test: 'dude',
      thing: 'great',
    },

    setTest(test: string) {
      this.state = { ...this.state, test }
    },
    setThing(thing: string) {
      this.state = { ...this.state, thing }
    },
  })
)

let _test = 'Awesome'
let _thing = 'Cool'
export const subscribeToGettersAndMethodsStore = createStoreSubscriptionAdder(
  () => ({
    get test() {
      return _test
    },
    get thing() {
      return _thing
    },
    set thing(thing: string) {
      _thing = thing
    },
    setTest(test: string) {
      _test = test
    },
    setThing(thing: string) {
      _thing = thing
    },
  })
)

class ClassStore {
  get test() {
    return this.#test
  }

  get thing() {
    return this.#thing
  }
  set thing(newThing: string) {
    this.#thing = newThing
  }

  setTest = (test: string) => {
    this.#test = test
  }
  setThing = (thing: string) => {
    this.#thing = thing
  }

  #test = 'Classy'
  #thing = 'Sassy'
}
export const subscribeToClassStore = createStoreSubscriptionAdder(
  () => new ClassStore()
)

class StaticStore {
  static test = 'Static'
  static thing = 'Shock'
  static setTest = (newTest: string) => {
    StaticStore.test = newTest
  }
  static setThing = (newThing: string) => {
    StaticStore.thing = newThing
  }
}

export const subscribeToStaticStore = createStoreSubscriptionAdder(
  () => StaticStore
)

export class PersistedStore<T> {
  constructor(private _key: string, defaultState: T) {
    const localStorageState = JSON.parse(localStorage.getItem(_key)!) as T
    this._state = localStorageState ?? defaultState
  }

  get state() {
    return this._state
  }

  setState(stateChanges: Partial<T>) {
    this._state = { ...this._state, ...stateChanges }
    localStorage.setItem(this._key, JSON.stringify(this._state))
  }

  protected _state: T
}

class PersistedStoreExample extends PersistedStore<{
  test: string
  thing: string
}> {
  constructor() {
    super('state', {
      test: 'Persisted',
      thing: 'State',
    })
  }
  get test() {
    return this.state.test
  }

  get thing() {
    return this.state.thing
  }
  set thing(thing: string) {
    this.setState({ thing })
  }

  setTest(test: string) {
    this.setState({ test })
  }

  setThing(thing: string) {
    this.setState({ thing })
  }
}

export const subscribeToPersistedStore = createStoreSubscriptionAdder(
  () => new PersistedStoreExample()
)

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

class TestHistoryStore extends HistoryStore<{ test: string; thing: string }> {
  protected _state = { test: 'history', thing: 'state' }

  get test() {
    return this.state.test
  }

  get thing() {
    return this.state.thing
  }
  set thing(thing: string) {
    this.setState({ thing })
  }

  setTest(test: string) {
    this.setState({ test })
  }

  setThing(thing: string) {
    this.setState({ thing })
  }
}

export const subscribeToHistoryStore = createStoreSubscriptionAdder(
  () => new TestHistoryStore()
)
