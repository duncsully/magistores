import React, { useRef, useEffect } from 'react'

/** Wrap your component's elements in this component to show when your component has rerendered */
export const UpdatingBorder: React.FC = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.borderColor = 'red'
      const timeout = setTimeout(() => {
        ref.current!.style.borderColor = 'black'
      }, 1000)
      return () => clearTimeout(timeout)
    }
  })
  return (
    <div ref={ref} className="border-2 rounded-md border-black p-4 my-2">
      {children}
    </div>
  )
}
