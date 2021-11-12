import { renderHook } from '@testing-library/react-hooks'
import { act } from 'react-dom/test-utils'
import { useStore } from './useStore'

describe('useStore', () => {
    it('can be used with simple stores', () => {
        const testStore = {
            test: 1,
            setTest(newTest: number) {
                this.test = newTest
            }
        }

        const { result: resultOne } = renderHook(() => useStore(testStore))
        const { result: resultTwo } = renderHook(() => useStore(testStore))

        act(() => {
            resultOne.current.test += 1
        })

        expect(resultTwo.current.test).toBe(2)

        act(() => {
            resultTwo.current.setTest(3)
        })

        expect(resultOne.current.test).toBe(3)
    })

    it('can be used with stores using outside variables', () => {
        let test = 1
        const testStore = {
            get test() {
                return test
            },
            setTest(newTest: number) {
                test = newTest
            }
        }

        const { result: resultOne } = renderHook(() => useStore(testStore))
        const { result: resultTwo } = renderHook(() => useStore(testStore))

        act(() => {
            resultOne.current.setTest(2)
        })

        expect(resultTwo.current.test).toBe(2)
    })

    it('can be used with class instances with private variables, getters, and inheritance', () => {
        class BaseStore {
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

        const { result: resultOne } = renderHook(() => useStore(testStore))
        const { result: resultTwo } = renderHook(() => useStore(testStore))

        act(() => {
            resultOne.current.private = 'neat'
        })

        expect(resultTwo.current.private).toBe('neat')

        act(() => {
            resultTwo.current.setTest(2)
        })

        expect(resultOne.current.test).toBe(2)
    })

    it('can be used with static classes for some reason', () => {
        class BaseStore {
            static test = 1
        }
        class TestStore extends BaseStore {
            static setTest = (newTest: number) => {
                BaseStore.test = newTest
            }
        }
        
        const { result: resultOne } = renderHook(() => useStore(TestStore))
        const { result: resultTwo } = renderHook(() => useStore(TestStore))

        act(() => {
            resultOne.current.setTest(2)
        })

        expect(resultTwo.current.test).toBe(2)
    })
})