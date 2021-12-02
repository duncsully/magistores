import { subscribeToStore } from './subscribeToStore'

/** Just a noop to read values */
const read = (...args: any[]) => args

describe('subscribeToStore', () => {
  it('calls updaters when a read property changes', () => {
    const testStore = {
      test: 1,
      thing: 'hello',
      setTest(newTest: number) {
        this.test = newTest
      },
    }
    const updaterOne = jest.fn()
    const [instanceOne] = subscribeToStore(testStore, updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribeToStore(testStore, updaterTwo)

    read(instanceOne.thing, instanceTwo.thing, instanceTwo.test)

    instanceOne.thing = 'world'

    expect(updaterOne).toHaveBeenCalled()
    expect(updaterTwo).toHaveBeenCalled()

    updaterOne.mockReset()
    updaterTwo.mockReset()

    instanceOne.setTest(2)

    expect(updaterOne).not.toHaveBeenCalled()
    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works with nested objects', () => {
    const testStore = {
      state: {
        test: 1,
      },
      setTest(test: number) {
        this.state = { ...this.state, test }
      },
    }

    const updaterOne = jest.fn()
    const [instanceOne] = subscribeToStore(testStore, updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribeToStore(testStore, updaterTwo)

    read(instanceTwo.state.test)

    instanceOne.state.test = 2

    expect(updaterTwo).toHaveBeenCalled()
    updaterTwo.mockReset()

    instanceOne.setTest(3)

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works when a parent store updates child properties', () => {
    const testStore = {
      state: {
        test: 1,
      },
      setTest(test: number) {
        this.state.test = test
      },
    }

    const updaterOne = jest.fn()
    const [instanceOne] = subscribeToStore(testStore, updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribeToStore(testStore, updaterTwo)

    read(instanceTwo.state.test)

    instanceOne.setTest(2)

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works when parent properties depend on child properties', () => {
    const testStore = {
      state: {
        test: {
          thing: 1,
        },
        get thing() {
          return this.test.thing
        },
      },
      get thing() {
        return this.state.thing
      },
    }

    const updaterOne = jest.fn()
    const [instanceOne] = subscribeToStore(testStore, updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribeToStore(testStore, updaterTwo)

    read(instanceTwo.thing)

    instanceOne.state.test.thing = 2

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works with stores accessing outside variables', () => {
    let test = 1
    const testStore = {
      get test() {
        return test
      },
      setTest(newTest: number) {
        test = newTest
      },
    }

    const updaterOne = jest.fn()
    const [instanceOne] = subscribeToStore(testStore, updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribeToStore(testStore, updaterTwo)

    read(instanceTwo.test)

    instanceOne.setTest(2)

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works with classes, inheritance, and private properties', () => {
    class BaseStore {
      static staticProperty = true
      get test() {
        return this._test
      }

      get private() {
        return this.#private
      }
      set private(newPrivate: string) {
        this.#private = newPrivate
      }

      protected _test = 1
      #private = 'private'
    }
    class TestStore extends BaseStore {
      setTest = (newTest: number) => {
        this._test = newTest
      }
    }
    const testStore = new TestStore()

    const updaterOne = jest.fn()
    const [instanceOne] = subscribeToStore(testStore, updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribeToStore(testStore, updaterTwo)

    read(
      instanceOne.private,
      instanceTwo.test,
      (instanceTwo.constructor as typeof TestStore).staticProperty
    )

    instanceTwo.private = 'not so private'

    expect(updaterOne).toHaveBeenCalled()

    instanceOne.setTest(2)

    expect(updaterTwo).toHaveBeenCalled()
    updaterTwo.mockReset()
    ;(instanceOne.constructor as typeof TestStore).staticProperty = false

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works with static values when passing the class', () => {
    class BaseStore {
      static test = 1
    }
    class TestStore extends BaseStore {
      static setTest = (newTest: number) => {
        BaseStore.test = newTest
      }
    }

    const updaterOne = jest.fn()
    const [instanceOne] = subscribeToStore(TestStore, updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribeToStore(TestStore, updaterTwo)

    read(instanceTwo.test)

    instanceOne.setTest(2)

    expect(updaterTwo).toHaveBeenCalled()
  })
})
