import * as _ from 'lodash'
import { parse, Node } from 'acorn'
import { full } from 'acorn-walk'

const src = `
new Promise((resolve, reject) => { setTimeout(() => resolve(x + 1), 1000) })
`
const window = {
  Promise: 3,
  setTimeout: 3
}

export function findConsumedVariableIds(body: string) {
  const nodes: any[] = []
  full(parse(body, { ecmaVersion: "latest" }), (node, state, type) => {
    nodes.push(node)
  })

  // Find all identifiers
  const all = nodes.filter(n => n.type == "Identifier").map(n => n.name)

  // Find variable declarations
  const varDecl = nodes.filter(n => n.type == "VariableDeclarator").map(n => n.id.name)

  // Find function names
  const funcNames = nodes.filter(n => n.type == "FunctionDeclaration").map(n => n.id.name)

  // Find function params
  const funcParams = _.flatten(nodes.filter(n => n.type == "FunctionDeclaration" || n.type == "ArrowFunctionExpression").map(n => n.params.map((p: any) => p.name)))

  // Find window keys
  const windowKeys = Object.keys(window)

  return _.difference(all, varDecl, funcNames, funcParams, windowKeys)
}

console.log(JSON.stringify(parse(src, { ecmaVersion: "latest" }), null, 2))
console.log(findConsumedVariableIds(src))

// fullAncestor(parse(src, { ecmaVersion: "latest" }), (node, state, ancestors) => {
//   if (node.type == "Identifier") {
//     console.log(`node`)
//     console.log(node)
//     console.log(`state`)
//     console.log(state)
//     console.log(`ancestors`)
//     console.log(ancestors)
//   }
// })