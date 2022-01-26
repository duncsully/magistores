import { createStoreSubscriptionAdder } from './createStoreSubscriptionAdder'

/** Just a noop to read values */
const read = (...args: any[]) => args

describe('createStoreSubscriptionAdder', () => {
  it('calls updaters when a read property changes', () => {
    const subscribe = createStoreSubscriptionAdder(() => ({
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
    const subscribe = createStoreSubscriptionAdder(() => ({
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
    const subscribe = createStoreSubscriptionAdder(() => ({
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
    const subscribe = createStoreSubscriptionAdder(() => ({
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
    const subscribe = createStoreSubscriptionAdder(() => ({
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
    const subscribe = createStoreSubscriptionAdder(() => new TestStore())

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

    const subscribe = createStoreSubscriptionAdder(() => TestStore)

    const updaterOne = jest.fn()
    const [instanceOne] = subscribe(updaterOne)

    const updaterTwo = jest.fn()
    const [instanceTwo] = subscribe(updaterTwo)

    read(instanceTwo.test)

    instanceOne.setTest(2)

    expect(updaterTwo).toHaveBeenCalled()
  })

  it('initializes a new store on first subscriber', () => {
    const subscribe = createStoreSubscriptionAdder(() => ({
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
    const subscribe = createStoreSubscriptionAdder(
      update => ({
        test: 3,
        update,
      }),
      {
        onSet: () => false,
        onMethodCall: () => false,
      }
    )

    const updater = jest.fn()
    const [instance] = subscribe(updater)

    read(instance.test)
    instance.test = 4

    expect(updater).not.toHaveBeenCalled()

    instance.update()

    expect(updater).toHaveBeenCalled()
  })

  it('returns the number of subscribers updated from checkForUpdate argument', () => {
    const subscribe = createStoreSubscriptionAdder(
      update => ({
        test: 3,
        update,
      }),
      {
        onSet: () => false,
        onMethodCall: () => false,
      }
    )

    const [instanceOne] = subscribe(jest.fn())
    const [instanceTwo] = subscribe(jest.fn())
    const [instanceThree] = subscribe(jest.fn())

    read(instanceOne.test, instanceThree.test)
    instanceTwo.test = 2

    expect(instanceTwo.update()).toBe(2)
  })

  describe('options', () => {
    describe('onCleanup', () => {
      it('reuses existing store if returning false', () => {
        const subscribe = createStoreSubscriptionAdder(
          () => ({
            test: 5,
          }),
          { onCleanup: () => false }
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
        const subscribe = createStoreSubscriptionAdder(
          () => ({ test: [1, 2] }),
          {
            hasChanged: ({ previousValue, currentValue }) =>
              previousValue.some(
                (val: any, i: number) => val !== currentValue[i]
              ),
          }
        )

        const updater = jest.fn()
        const [instance] = subscribe(updater)

        read(instance.test)
        instance.test = [1, 2]

        expect(updater).not.toHaveBeenCalled()

        instance.test = [1, 3]

        expect(updater).toHaveBeenCalled()
      })
    })

    describe('onGet', () => {
      it('does not track path if returning false', () => {
        const subscribe = createStoreSubscriptionAdder(
          () => ({
            test: 'hi',
          }),
          {
            onGet: ({ key }) => key !== 'test',
          }
        )
        const updater = jest.fn()
        const [instance] = subscribe(updater)

        read(instance.test)
        instance.test = 'useless'

        expect(updater).not.toHaveBeenCalled()
      })

      it('stops tracking a previously tracked path if returning false', () => {
        let i = 0
        const subscribe = createStoreSubscriptionAdder(
          () => ({
            test: 'hi',
          }),
          {
            onGet: () => i++ < 1,
          }
        )
        const updater = jest.fn()
        const [instance] = subscribe(updater)

        read(instance.test)
        instance.test = 'still works'

        expect(updater).toHaveBeenCalled()

        read(instance.test)
        instance.test = 'borked'

        expect(updater).not.toHaveBeenCalledTimes(2)
      })
    })

    describe('onSet', () => {
      it('does not check for updates if returning false', () => {
        const subscribe = createStoreSubscriptionAdder(
          () => ({
            test: 'hi',
            state: {
              nested: 'hello',
            },
          }),
          {
            onSet: ({ path }) => path.indexOf('.') === -1,
          }
        )
        const updater = jest.fn()
        const [instance] = subscribe(updater)

        read(instance.test, instance.state.nested)
        instance.state.nested = 'bye'

        expect(updater).not.toHaveBeenCalled()

        instance.test = 'Oi'

        expect(updater).toHaveBeenCalled()
      })
    })

    describe('onMethodCall', () => {
      it('does not check for updates if returning false', () => {
        const subscribe = createStoreSubscriptionAdder(
          () => ({
            test: {
              nested: 'hi',
              update() {
                this.nested = 'hoi'
              },
            },
            doThing() {
              this.test.nested = 'great'
            },
          }),
          {
            onMethodCall: ({ obj, store }) => obj === store,
          }
        )

        const updater = jest.fn()
        const [instance] = subscribe(updater)

        read(instance.test.nested)
        instance.test.update()

        expect(updater).not.toHaveBeenCalled()

        instance.doThing()

        expect(updater).toHaveBeenCalled()
      })
    })
  })
})
