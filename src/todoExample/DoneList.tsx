import React from 'react'
import { UpdatingBorder } from '../UpdatingBorder'
import { useStore } from '../useStore'
import { TodoItem } from './TodoItem'
import { subscribeToTodoStore } from './todoStore'

export const DoneList = () => {
  const { doneList } = useStore(subscribeToTodoStore)

  return (
    <UpdatingBorder>
      Done:
      <ul>
        {doneList.map((item) => (
          <TodoItem item={item} key={item.added.valueOf()} />
        ))}
      </ul>
    </UpdatingBorder>
  )
}
