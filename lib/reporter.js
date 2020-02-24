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
  } else {
    log( '\n' )
  }

  reporter.depth++

}

reporter.contextEnd = function( context ) {
  // log( `\n${ color.gray( dt( context.time ) ) }\n` )
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

// function parseError( error ) {

//   var name = error.name || error.constructor.name
//   var message = error.message
//   var title = message.split( /\n/ ).shift()
//   var stack = error.stack.split( /\n/g )

//   var stackFrameStart = stack.findIndex(( line ) => {
//     return /^\s+at\s/.test( line )
//   })

//   if( stackFrameStart >= 0 ) {
//     stack = stack.slice( stackFrameStart )
//   }

//   var frames = stack.map(( line ) => {

//     var frame = {
//       ref: null,
//       path: null,
//       line: -1,
//       column: -1,
//     }

//     var refPattern = /^\s+at\s+([^\(]+\s+)?((["']?|\()([^\(]+)(:\d+)(:\d+)(\3|\)))/
//     var match = refPattern.exec( line )

//     if( match ) {
//       frame.ref = match[1] && match[1].trim()
//       frame.path = match[4]
//       frame.line = match[5] ? +match[5].slice( 1 ) : -1
//       frame.column = match[6] ? +match[6].slice( 1 ) : -1
//     }

//     return frame

//   })

//   return {
//     name,
//     title,
//     message,
//     stackFrameStart,
//     stack,
//     frames
//   }

// }

// function formatError( error, showContext = true ) {

//   var path = require( 'path' )
//   var fs = require( 'fs' )

//   var origin = error.frames.find(( frame ) => {
//     var isDependency = frame.path && frame.path.includes( 'node_modules/' )
//     var isInternal = frame.path && frame.path.startsWith( 'internal' )
//     var isAppCode = !isInternal && !isDependency
//     var isTestCode = !isInternal && !isDependency && frame.path.includes( 'test' )
//     return !isInternal && !isDependency && !isTestCode
//   }) || error.frames.find(( frame ) => {
//     var isDependency = frame.path && frame.path.includes( 'node_modules/' )
//     var isInternal = frame.path && frame.path.startsWith( 'internal' )
//     return !isInternal && !isDependency
//   })

//   var contextLines = 1
//   var lineNoPad = ( origin.line + contextLines ).toString().length
//   var width = process.stdout.columns || 80
//   var sep = ( ' ' + '─'.repeat( width - 2 ) + ' ' ) + '\n'

//   var context = showContext != true ? '' :
//     fs.readFileSync( origin.path, 'utf8' )
//       .split( /\r?\n/g )
//       .slice( origin.line - contextLines - 1, origin.line + contextLines )
//       .map(( line, i ) => {
//         var code = i == contextLines ?
//           color.white( line ) :
//           color.gray( line )
//         var lineno = ( origin.line - contextLines + i ).toString().padStart( lineNoPad, ' ' )
//         return color.gray( `  ${lineno}:  ` ) + code
//       })
//       .join( '\n' ) + '\n'

//   // var stack = error.frames.map(( frame, i ) => {

//   //   var isDependency = frame.path && frame.path.includes( 'node_modules/' )
//   //   var isInternal = frame.path && frame.path.startsWith( 'internal' )
//   //   var isAppCode = !isInternal && !isDependency
//   //   var isTestCode = isAppCode && frame.path.includes( 'test' )

//   //   var line = ' '.repeat( 4 ) + 'at ' +
//   //     `${ frame.ref ? `${frame.ref} ` : '' }` + ( frame.ref ? '(' : '' ) +
//   //     `${ path.relative( process.cwd(), frame.path ) }:${ frame.line }:${ frame.column }` +
//   //     ( frame.ref ? ')\n' : '\n' )

//   //   // if( frame == origin ) {
//   //   //   return ( showContext ? `${sep}${ context }${sep}` : '' ) + color.yellow( line )
//   //   // } else if( isAppCode && !isTestCode ) {
//   //   //   return color.white( line )
//   //   // } else if( isAppCode ) {
//   //   //   return color.white( line ) // color.gray( line )
//   //   // } else if( isDependency ) {
//   //   //   return color.gray( line )
//   //   // } else if( isInternal ) {
//   //   //   return color.gray( line )
//   //   // } else {
//   //   //   return color.gray( line )
//   //   // }

//   //   return line

//   // }).join( '' )

//   return color.brightRed( `${ error.name }: ${ error.message }\n` ) +
//     color.gray( error.stack.join( '  \n' ) )

// }

function formatError( error ) {

  var stack = error.stack
  var match = /^\s+at\s/m.exec( stack )
  var stackFrameStart = match ? match.index : 0

  if( stackFrameStart > 0 ) {
    stack = stack.slice( stackFrameStart )
  }

  return color.brightRed( `${ error.name }: ${ error.message }\n` ) +
    color.gray( stack )

}

function printFail( task, showContext ) {

  // var error = parseError( task.errors[0] )
  var taskPath = [].concat( task.context.parents, task.context, task )
    .filter( p => p.name ).map( p => p.name ).join( ' – ' )

  log( `\n ${ color.brightWhite( taskPath ) }:` )
  log( `\n ${ formatError( task.errors[0] ) }\n` )

}

reporter.end = function( error ) {

  reporter.timing.total = process.hrtime( reporter.timing.total )

  // var padLength = Math.max(
  //   reporter.successfulTests,
  //   reporter.pendingTests,
  //   reporter.failedTests
  // ).toString().length

  var padLength = reporter.totalTests.toString().length
  var pad = ( num ) => num.toString().padStart( padLength )

  reporter.failedTasks.forEach(( task ) => {
    printFail( task, false )
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
