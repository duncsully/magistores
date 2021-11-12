/** Gets all properties, even ones that aren't enumerable (like getters), up the prototype chain, not including the base object */
export const getAllProperties = <T>(obj: T) => {
    const prototype = Object.getPrototypeOf(obj)
    // base object prototype or Function prototype, ignore its properties
    if (!prototype || (typeof obj === 'function' && !obj.name)) return []
    const props = Object.getOwnPropertyNames(obj) as (keyof T)[]
    const parentProps = getAllProperties(prototype) as (keyof T)[]
    return Array.from(new Set<keyof T>([...props, ...parentProps]))
}