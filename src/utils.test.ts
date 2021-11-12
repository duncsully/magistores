import { getAllProperties } from "./utils"

describe('utils', () => {
    describe('getAllProperties', () => {
        it('gets all properties up the prototype chain including getters and statics', () => {
            class BaseClass {
                get getterProp() {
                    return 'getter'
                }
                baseProp = 'base'
            }

            class ChildClass extends BaseClass {
                childProp = 'child'
            }

            class GrandchildClass extends ChildClass {
                static staticProp = 'static'

                grandchildProp = 'grandchild'
            }

            expect(getAllProperties(new GrandchildClass()).sort()).toEqual(['grandchildProp', 'staticProp', 'childProp', 'baseProp', 'getterProp', 'constructor', 'prototype', 'name', 'length'].sort())
        })
    })
})