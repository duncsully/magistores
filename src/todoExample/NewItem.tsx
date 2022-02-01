import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  useState,
} from 'react'
import { UpdatingBorder } from '../UpdatingBorder'
import { useStore } from '../useStore'
import { subscribeToTodoStore } from './todoStore'

export const NewItem = () => {
  const { addItem } = useStore(subscribeToTodoStore)
  const [newValue, setNewValue] = useState<string | undefined>(undefined)
  const handleChange: ChangeEventHandler<HTMLInputElement> = e => {
    setNewValue(e.target.value)
  }
  const handleKeyDown: KeyboardEventHandler = e => {
    if (e.key === 'Enter' && newValue) {
      addItem(newValue)
      setNewValue(undefined)
    }
  }
  return (
    <li>
      <UpdatingBorder>
        {newValue === undefined ? (
          <button
            className="rounded-full w-10 h-10 font-bold text-purple-800 p-0"
            onClick={() => setNewValue('')}
          >
            +
          </button>
        ) : (
          <input
            autoFocus
            value={newValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setNewValue(undefined)}
          />
        )}
      </UpdatingBorder>
    </li>
  )
}
