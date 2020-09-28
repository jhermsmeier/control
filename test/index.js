'use strict'

var { context, test, before, after, setup, teardown } = require( '..' )

context( 'Control', function() {

  console.log( 'context' )

  setup( 'setup', function() {
    console.log( 'setup' )
  })

  teardown( 'teardown', function() {
    console.log( 'teardown' )
  })

  before( 'before', function() {
    console.log( 'before' )
  })

  test( 'test', function() {
    console.log( 'test' )
  })

  after( 'after', function() {
    console.log( 'after' )
  })

})
