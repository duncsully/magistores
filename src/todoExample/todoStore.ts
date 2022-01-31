import { createStoreSubscriptionAdder } from '../createStoreSubscriptionAdder'

export interface ITodoItem {
  text: string
  completed: Date | false
  added: Date
}
class TodoStore {
  todoList: ITodoItem[] = []

  doneList: ITodoItem[] = []

  addItem(text: string) {
    this.todoList = [
      ...this.todoList,
      { text, completed: false, added: new Date() },
    ]
  }

  editItem(item: ITodoItem, text: string) {
    item.text = text
  }

  removeTodoItem(itemToRemove: ITodoItem) {
    this.todoList = this.todoList.filter(item => item !== itemToRemove)
  }

  removeDoneItem(itemToRemove: ITodoItem) {
    this.doneList = this.doneList.filter(item => item !== itemToRemove)
  }

  setComplete(item: ITodoItem) {
    item.completed = new Date()
    this.removeTodoItem(item)
    this.doneList = [...this.doneList, item]
  }

  setIncomplete(item: ITodoItem) {
    item.completed = false
    this.removeDoneItem(item)
    this.todoList = [...this.todoList, item]
  }
}
export const subscribeToTodoStore = createStoreSubscriptionAdder(
  () => new TodoStore()
)
