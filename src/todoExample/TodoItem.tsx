import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  useState,
} from 'react'
import { UpdatingBorder } from '../UpdatingBorder'
import { useStore } from '../useStore'
import { ITodoItem, subscribeToTodoStore } from './todoStore'

export const TodoItem: React.FC<{ item: ITodoItem }> = ({ item }) => {
  const store = useStore(subscribeToTodoStore)
  const {
    editItem,
    removeTodoItem,
    removeDoneItem,
    setComplete,
    setIncomplete,
  } = store

  const [editing, setEditing] = useState(false)

  const [localValue, setLocalValue] = useState(item.text)
  const handleChange: ChangeEventHandler<HTMLInputElement> = e => {
    setLocalValue(e.target.value)
  }
  const handleKeyDown: KeyboardEventHandler = e => {
    if (e.key === 'Enter') {
      editItem(item, localValue)
      setEditing(false)
    }
  }
  const handleBlur = () => {
    setLocalValue(item.text)
    setEditing(false)
  }
  return (
    <li>
      <UpdatingBorder>
        <input
          type="checkbox"
          checked={!!item.completed}
          onChange={() =>
            item.completed ? setIncomplete(item) : setComplete(item)
          }
        />
        {editing ? (
          <span onBlur={handleBlur}>
            <input
              autoFocus
              value={localValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
            <button
              // Need mouseDown because click lets onBlur trigger first
              onMouseDown={() =>
                item.completed ? removeDoneItem(item) : removeTodoItem(item)
              }
            >
              X
            </button>
          </span>
        ) : (
          <span
            className={`text-gray-300 decoration-gray-300 ${
              item.completed ? 'line-through' : ''
            }`}
            onClick={() => setEditing(true)}
          >
            {item.text}
          </span>
        )}
      </UpdatingBorder>
    </li>
  )
}
