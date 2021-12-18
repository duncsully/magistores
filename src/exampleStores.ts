export const testStore = {
  test: 'dude',
  thing: 'great',
  setTest(newValue: string) {
    this.test = newValue
  },
  setThing(newValue: string) {
    this.thing = newValue
  },
}

export const stateAndActions = {
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
}

let _test = 'Awesome'
let _thing = 'Cool'
export const gettersAndMethodsStore = {
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
}

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
export const classStore = new ClassStore()

export class StaticStore {
  static test = 'Static'
  static thing = 'Shock'
  static setTest = (newTest: string) => {
    StaticStore.test = newTest
  }
  static setThing = (newThing: string) => {
    StaticStore.thing = newThing
  }
}

const defaultState = {
  test: 'Persisted',
  thing: 'State',
}
export const persistedStore = {
  state: JSON.parse(localStorage.getItem('state')!) ?? defaultState,

  setState(state: typeof defaultState) {
    this.state = state
    localStorage.setItem('state', JSON.stringify(this.state))
  },

  get test() {
    return this.state.test
  },

  get thing() {
    return this.state.thing
  },
  set thing(thing: string) {
    this.setState({ ...this.state, thing })
  },

  setTest(test: string) {
    this.setState({ ...this.state, test })
  },

  setThing(thing: string) {
    this.setState({ ...this.state, thing })
  },
}

export abstract class HistoryStore<T> {
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
