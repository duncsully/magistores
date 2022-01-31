import React from 'react'
import { DoneList } from './DoneList'
import { TodoList } from './TodoList'

export const TodoApp = () => {
  return (
    <section>
      <TodoList />
      <DoneList />
    </section>
  )
}
