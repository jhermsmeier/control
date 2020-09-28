'use strict'

var assert = require( 'assert' )
var { context, setup, teardown, test } = require( '..' )

test( 'sum', function() {
  assert.equal( 1 + 1, 2 )
})

test( 'fail', function() {
  assert.ok( false )
})

context( 'context', function() {

  test( 'context.ok', () => {})

  test.skip( '.skip', function() {
    throw new Error( 'Should not appear' )
  })

  test( 'context.fail', () => {
    throw new Error( 'Nope' )
  })

  context( 'nested context', function() {

    test( 'nested.ok', () => {})

    test.skip( 'nested.skip', function() {
      throw new Error( 'Should not appear' )
    })

    for( var i = 0; i < 4; i++ ) {
      test( `nested.async(${ i + 1 })`, function( done ) {
        setTimeout( done, 0 )
      })
    }

    context( 'level 2', function() {

      test( 'l2.ok', () => {})
      test.skip( 'l2.skip', () => {})
      test( 'l2.fail', () => {
        throw new Error( 'Nope' )
      })

    })

    test( 'nested.fail', () => {
      throw new Error( 'Nope' )
    })

  })

  context( 'sibling', function() {

    test( 'sibling.ok', () => {})
    test.skip( 'sibling.skip', () => {})
    test( 'sibling.fail', () => {
      throw new Error( 'Nope' )
    })

  })

  context( 'selective sibling', function() {

    test( 'selective.ok', () => {})
    test.only( 'selective.only', () => {})
    test( 'selective.fail', () => {
      throw new Error( 'Nope' )
    })

  })

})

context.run(( error, test ) => {
  // console.log( control.context.tasks )
})
