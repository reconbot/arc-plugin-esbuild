let parse = require('@architect/parser')
let pkg = require('@architect/package')
let test = require('tape')
let macro = require('..')

let arcfile = `
@app
myapp

@src
dist

@events
foo
`

test('changed foo to dist', t=> {
  t.plan(1)
  let arc = parse(arcfile)
  let cfn = pkg(arc)
  let result = macro(arc, cfn)
  let code = result.Resources.Foo.Properties.CodeUri
  let expected = './dist/events/foo'
  t.ok(code === expected, expected)
  //console.log(JSON.stringify(result, null, 2))
})
