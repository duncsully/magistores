import { createStoreSubscriber } from './createStoreSubscriber'

/** Just a noop to read values */
const read = (...args: any[]) => args

describe('createStoreSubscriber', () => {
  it('calls updaters when a read property changes', () => {
    const subscribe = createStoreSubscriber(() => ({
      test: 1,
      thing: 'hello',
      setTest(newTest: number) {
        this.test = newTest
      },
    }))
    const updaterOne = jest.fn()
    const [instanceOne] = subscribe(updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribe(updaterTwo)

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
    const subscribe = createStoreSubscriber(() => ({
      state: {
        test: 1,
      },
      setTest(test: number) {
        this.state = { ...this.state, test }
      },
    }))

    const updaterOne = jest.fn()
    const [instanceOne] = subscribe(updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribe(updaterTwo)

    read(instanceTwo.state.test)

    instanceOne.state.test = 2

    expect(updaterTwo).toHaveBeenCalled()
    updaterTwo.mockReset()

    instanceOne.setTest(3)

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works when a parent store updates child properties', () => {
    const subscribe = createStoreSubscriber(() => ({
      state: {
        test: 1,
      },
      setTest(test: number) {
        this.state.test = test
      },
    }))

    const updaterOne = jest.fn()
    const [instanceOne] = subscribe(updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribe(updaterTwo)

    read(instanceTwo.state.test)

    instanceOne.setTest(2)

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works when parent properties depend on child properties', () => {
    const subscribe = createStoreSubscriber(() => ({
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
    }))

    const updaterOne = jest.fn()
    const [instanceOne] = subscribe(updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribe(updaterTwo)

    read(instanceTwo.thing)

    instanceOne.state.test.thing = 2

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('works with stores accessing outside variables', () => {
    let test = 1
    const subscribe = createStoreSubscriber(() => ({
      get test() {
        return test
      },
      setTest(newTest: number) {
        test = newTest
      },
    }))

    const updaterOne = jest.fn()
    const [instanceOne] = subscribe(updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribe(updaterTwo)

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
    const subscribe = createStoreSubscriber(() => new TestStore())

    const updaterOne = jest.fn()
    const [instanceOne] = subscribe(updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribe(updaterTwo)

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

    const subscribe = createStoreSubscriber(() => TestStore)

    const updaterOne = jest.fn()
    const [instanceOne] = subscribe(updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribe(updaterTwo)

    read(instanceTwo.test)

    instanceOne.setTest(2)

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('initializes a new store on first subscriber', () => {
    const subscribe = createStoreSubscriber(() => ({
      test: 5,
    }))

    const updaterOne = jest.fn()
    const [instance, unsubscribe] = subscribe(updaterOne)

    instance.test = 2

    unsubscribe()

    const [newInstance] = subscribe(updaterOne)

    expect(newInstance.test).toBe(5)
  })

  it('can manually update via the first parameter in the store creator', () => {
    const obj = { test: 3, update: () => {} }
    const subscribe = createStoreSubscriber((update) => {
      obj.update = update
      return obj
    })

    const updater = jest.fn()
    const [instance] = subscribe(updater)

    read(instance.test)
    obj.test = 4

    expect(updater).not.toHaveBeenCalled()

    obj.update()

    expect(updater).toHaveBeenCalled()
  })

  describe('options', () => {
    describe('keepStore', () => {
      it('reuses existing store if set true', () => {
        const subscribe = createStoreSubscriber(
          () => ({
            test: 5,
          }),
          { keepStore: true }
        )

        const updaterOne = jest.fn()
        const [instance, unsubscribe] = subscribe(updaterOne)

        instance.test = 2

        unsubscribe()

        const [newInstance] = subscribe(updaterOne)

        expect(newInstance.test).toBe(2)
      })
    })

    describe('hasChanged', () => {
      it('allows specifying custom check for updating', () => {
        const subscribe = createStoreSubscriber(() => ({ test: [1, 2] }), {
          hasChanged: (prev, current) =>
            prev.some((val: any, i: number) => val !== current[i]),
        })

        const updater = jest.fn()
        const [instance] = subscribe(updater)

        read(instance.test)
        instance.test = [1, 2]

        expect(updater).not.toHaveBeenCalled()

        instance.test = [1, 3]

        expect(updater).toHaveBeenCalled()
      })
    })
  })
})
