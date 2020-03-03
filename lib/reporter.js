var color = require( './color' )

class Reporter {

  constructor( options ) {

    options = options || {}

    this.depth = options.depth || 0
    this.indent = options.indent || 2

    this.totalTests = options.totalTests || 0
    this.successfulTests = options.successfulTests || 0
    this.pendingTests = options.pendingTests || 0
    this.failedTests = options.failedTests || 0
    this.failedTasks = []

    this.timing = {
      total: null,
      ok: [ 0, 0 ],
      fail: [ 0, 0 ],
    }

  }

  static log( msg ) {
    process.stdout.write( msg )
  }

  static time( hrtime ) {
    return ( hrtime[0] * 1000 ) + ( hrtime[1] / 1e6 )
  }

  static dt( hrtime ) {
    var ms = Reporter.time( hrtime )
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

  static ms( hrtime ) {
    return `${ Reporter.time( hrtime ).toFixed( 1 ) }ms`
  }

  static formatError( error ) {

    var stack = error.stack
    var match = /^\s+at\s/m.exec( stack )
    var stackFrameStart = match ? match.index : 0

    if( stackFrameStart > 0 ) {
      stack = stack.slice( stackFrameStart )
    }

    return `${ error.name }: ${ error.message }\n` +
      color.gray( stack )

  }

  static printError( task, showContext ) {

    var taskPath = [].concat( task.context.parents, task.context, task )
      .filter( p => p.name ).map( p => p.name ).join( ' – ' )

    Reporter.log( color.brightRed( `\n${ taskPath }:\n` ) )
    Reporter.log( `  ${ Reporter.formatError( task.errors[0] ) }\n` )

  }

  context( context ) {

    if( this.timing.total == null )
      this.timing.total = process.hrtime()

    this.depth = Math.max( 0, context.parents.length - 1 ) + 1

    var indent = ' '.repeat( this.indent * this.depth )

    if( context.name ) {
      Reporter.log( '\n' + indent + color.brightWhite( context.name ) + '\n' )
    }

    this.depth++

  }

  contextEnd( context ) {
    // this.depth--
  }

  test( task ) {
    this.totalTests++
    var indent = ' '.repeat( this.indent * this.depth )
    if( task.errors.length ) {
      this.failedTests++
      this.failedTasks.push( task )
      this.timing.fail[0] += task.time[0]
      this.timing.fail[1] += task.time[1]
      Reporter.log( indent + `${ color.brightRed( '×' ) } ${ task.name } ${ color.gray( `… ${ Reporter.dt( task.time ) }` ) }` + '\n' )
    } else {
      this.successfulTests++
      this.timing.ok[0] += task.time[0]
      this.timing.ok[1] += task.time[1]
      Reporter.log( indent + `${ color.brightGreen( '○' ) } ${ task.name } ${ color.gray( `… ${ Reporter.dt( task.time ) }` ) }` + '\n' )
    }
  }

  skip( task ) {
    this.totalTests++
    this.pendingTests++
    var indent = ' '.repeat( this.indent * this.depth )
    Reporter.log( indent + `${ color.boldGray( '-' ) } ${ task.name }` + '\n' )
  }

  end( error ) {

    this.timing.total = process.hrtime( this.timing.total )

    var padLength = this.totalTests.toString().length
    var pad = ( num ) => num.toString().padStart( padLength )

    this.failedTasks.forEach(( task ) => {
      Reporter.printError( task, false )
    })

    Reporter.log( `\n   ${ pad( this.totalTests ) } tests ${ color.gray( `… ${ Reporter.dt( this.timing.total ) }` ) }\n` )

    if( this.successfulTests ) {
      Reporter.log( color.brightGreen( ` ○ ${ pad( this.successfulTests ) } passing ${ color.gray( `… ${ Reporter.dt( this.timing.ok ) }` ) }\n` ) )
    }

    if( this.failedTests ) {
      Reporter.log( color.brightRed( ` × ${ pad( this.failedTests ) } failing ${ color.gray( `… ${ Reporter.dt( this.timing.fail ) }` ) }\n` ) )
    }

    if( this.pendingTests ) {
      Reporter.log( color.brightCyan( ` - ${ pad( this.pendingTests ) } pending\n` ) )
    }

  }

}

module.exports = new Reporter()
