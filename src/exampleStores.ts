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

/* class PersistedStore {
  @localStorageValue('state', {
    test: 'wow',
    thing: 'neat',
  })
  state = {
    test: 'wow',
    thing: 'neat',
  }

  get test() {
    return this.state.test
  }

  get thing() {
    return this.state.thing
  }
  set thing(newThing: string) {
    this.state.thing = newThing
  }

  setTest = (test: string) => {
    this.state.test = test
  }

  setThing = (thing: string) => {
    this.state.thing = thing
  }
}
export const persistedStore = new PersistedStore() */
