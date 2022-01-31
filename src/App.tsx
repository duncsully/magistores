import React from 'react'
import './App.css'
import { TestComp } from './TestComp'
import { OtherComp } from './OtherComp'
import { TodoApp } from './todoExample/TodoApp'

function App() {
  return (
    <div className="">
      <TestComp />
      <OtherComp />
      <TodoApp />
    </div>
  )
}

export default App
