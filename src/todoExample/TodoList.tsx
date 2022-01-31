import React from 'react'
import { UpdatingBorder } from '../UpdatingBorder'
import { useStore } from '../useStore'
import { NewItem } from './NewItem'
import { TodoItem } from './TodoItem'
import { subscribeToTodoStore } from './todoStore'

export const TodoList = () => {
  const { todoList } = useStore(subscribeToTodoStore)

  return (
    <UpdatingBorder>
      TODO:
      <ul>
        {todoList.map((item) => (
          <TodoItem item={item} key={item.added.valueOf()} />
        ))}
        <NewItem />
      </ul>
    </UpdatingBorder>
  )
}
