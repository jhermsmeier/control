'use strict'

// var { context, test, before, after, setup, teardown } = require( '..' )

context( 'Control', function() {

  // console.log( 'context' )

  setup( 'setup', function() {
    // console.log( 'setup' )
  })

  teardown( 'teardown', function() {
    // console.log( 'teardown' )
  })

  before( 'before', function() {
    // console.log( 'before' )
  })

  test( 'test', function() {
    // console.log( 'test' )
  })

  test( 'test.error', function() {
    throw new Error( 'It is supposed to fail' )
  })

  skip( 'test.skip', function() {
    // console.log( 'skip' )
  })

  after( 'after', function() {
    // console.log( 'after' )
  })

  context( 'Nested Context', () => {
    test( 'native async', async () => {})
    test( 'native async error', async () => { throw new Error( 'Expected Failure' ) })
    test( 'callback', ( done ) => { done() })
    test( 'callback error', ( done ) => { done( new Error( 'Callback Error' ) ) })
    test.skip( 'nested skip' )
  })

  context(() => {
    test( 'anonymous context test', () => {})
  })

  context.skip( 'Skipped context', () => {
    test( 'should not run', () => {})
    context( 'Context in skipped context should also be skipped', () => {
      test( 'should not run', () => {})
      test( 'should not run either', () => {})
    })
  })

})

context( 'Lifecycle Setup Error', () => {
  setup( 'setup should fail', () => { throw new Error( 'Setup Error' ) })
  test( 'this should not run', () => {})
  teardown( 'teardown should not run', () => { throw new Error( 'Teardown Error' ) })
})

context( 'Lifecycle Teardown Error', () => {
  test( 'test should run', () => {})
  teardown( 'teardown should fail', () => { throw new Error( 'Teardown Error' ) })
})

context( 'Native errors', () => {
  test( 'TypeError', () => {
    if( undefined.whateverest == 1 ) return true
  })
  test( 'ReferenceError', () => {
    if( whateverest == 1 ) return true
  })
  // test( 'SyntaxError', () => {
  //   if whateverest == 1 return true
  // })
})
