import React, { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import { useStore } from './useStore'
import userEvent from '@testing-library/user-event'
import { createStoreSubscriber } from './createStoreSubscriber'

describe('useStore', () => {
  it('can be used with simple stores', () => {
    const testStore = createStoreSubscriber(() => ({
      test: 'hi',
      setTest(newTest: string) {
        this.test = newTest
      },
    }))

    const TestComponentOne = () => {
      const { test, setTest } = useStore(testStore)
      return <input value={test} onChange={(e) => setTest(e.target.value)} />
    }

    let rerendered = 0
    const TestComponentTwo = () => {
      useEffect(() => {
        rerendered += 1
      })
      const { setTest } = useStore(testStore)
      return <button onClick={() => setTest('hello')}>Set test</button>
    }

    render(
      <div>
        <TestComponentOne />
        <TestComponentTwo />
      </div>
    )

    const input = screen.getByRole('textbox')
    const button = screen.getByRole('button')

    const beforeAction = rerendered
    userEvent.click(button)
    const afterAction = rerendered

    expect(input).toHaveValue('hello')
    expect(beforeAction).toBe(afterAction)
  })
})
