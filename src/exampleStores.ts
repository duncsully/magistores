import { localStorageValue } from './localStorageValue'

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

  @localStorageValue('thing', 'Sassy')
  thing!: string

  setTest = (test: string) => {
    this.#test = test
  }
  setThing = (thing: string) => {
    this.thing = thing
  }

  #test = 'Classy'
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
