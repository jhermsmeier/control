var color = require( './color' )
var reporter = module.exports

var log = ( msg ) => {
  process.stdout.write( msg )
}

function time( hrtime ) {
  return ( hrtime[0] * 1000 ) + ( hrtime[1] / 1e6 )
}

function dt( hrtime ) {
  var ms = time( hrtime )
  if( ms < 1000 ) {
    return ms < 1e-2 ?
      `${ ( ms * 1e6 ).toFixed( 0 ) }ns` :
      `${ +ms.toFixed( 2 ) }ms`
  } else {
    return ms > ( 60 * 1000 ) ?
      `${ ( ms / 60e3 ).toFixed( 0 ) }m${ (( ms % 60e3 ) / 1000 ).toFixed( 0 ) }s` :
      `${ +( ms / 1000 ).toFixed( 2 ) }s`
  }
}

function ms( hrtime ) {
  return `${ time( hrtime ).toFixed( 1 ) }ms`
}

reporter.depth = 0
reporter.indent = 2

reporter.totalTests = 0
reporter.successfulTests = 0
reporter.pendingTests = 0
reporter.failedTests = 0

reporter.timing = {
  total: null,
  ok: [ 0, 0 ],
  fail: [ 0, 0 ],
}

reporter.failedTasks = []

reporter.context = function( context ) {

  if( reporter.timing.total == null )
    reporter.timing.total = process.hrtime()

  reporter.depth = Math.max( 0, context.parents.length - 1 ) + 1

  var indent = ' '.repeat( reporter.indent * reporter.depth )

  if( context.name ) {
    log( '\n' + indent + color.brightWhite( context.name ) + '\n' )
  }

  reporter.depth++

}

reporter.contextEnd = function( context ) {
  // reporter.depth--
}

reporter.test = function( task ) {
  reporter.totalTests++
  var indent = ' '.repeat( reporter.indent * reporter.depth )
  if( task.errors.length ) {
    reporter.failedTests++
    reporter.failedTasks.push( task )
    reporter.timing.fail[0] += task.time[0]
    reporter.timing.fail[1] += task.time[1]
    log( indent + `${ color.brightRed( '×' ) } ${ task.name } ${ color.gray( `… ${ dt( task.time ) }` ) }` + '\n' )
    // printFail( task )
  } else {
    reporter.successfulTests++
    reporter.timing.ok[0] += task.time[0]
    reporter.timing.ok[1] += task.time[1]
    log( indent + `${ color.brightGreen( '○' ) } ${ task.name } ${ color.gray( `… ${ dt( task.time ) }` ) }` + '\n' )
  }
}

reporter.skip = function( task ) {
  reporter.totalTests++
  reporter.pendingTests++
  var indent = ' '.repeat( reporter.indent * reporter.depth )
  log( indent + `${ color.boldGray( '-' ) } ${ task.name }` + '\n' )
}

function formatError( error ) {

  var stack = error.stack
  var match = /^\s+at\s/m.exec( stack )
  var stackFrameStart = match ? match.index : 0

  if( stackFrameStart > 0 ) {
    stack = stack.slice( stackFrameStart )
  }

  return `${ error.name }: ${ error.message }\n` +
    color.gray( stack )

}

function printError( task, showContext ) {

  var taskPath = [].concat( task.context.parents, task.context, task )
    .filter( p => p.name ).map( p => p.name ).join( ' – ' )

  log( color.brightRed( `\n${ taskPath }:\n` ) )
  log( `  ${ formatError( task.errors[0] ) }\n` )

}

reporter.end = function( error ) {

  reporter.timing.total = process.hrtime( reporter.timing.total )

  var padLength = reporter.totalTests.toString().length
  var pad = ( num ) => num.toString().padStart( padLength )

  reporter.failedTasks.forEach(( task ) => {
    printError( task, false )
  })

  log( `\n   ${ pad( reporter.totalTests ) } tests ${ color.gray( `… ${ dt( reporter.timing.total ) }` ) }\n` )

  if( reporter.successfulTests ) {
    log( color.brightGreen( ` ○ ${ pad( reporter.successfulTests ) } passing ${ color.gray( `… ${ dt( reporter.timing.ok ) }` ) }\n` ) )
  }

  if( reporter.failedTests ) {
    log( color.brightRed( ` × ${ pad( reporter.failedTests ) } failing ${ color.gray( `… ${ dt( reporter.timing.fail ) }` ) }\n` ) )
  }

  if( reporter.pendingTests ) {
    log( color.brightCyan( ` - ${ pad( reporter.pendingTests ) } pending\n` ) )
  }

}
