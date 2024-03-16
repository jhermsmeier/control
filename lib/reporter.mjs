import color from './color.mjs'

// TODO:
// - [ ] Handle before/after lifecycle errors
export default class Reporter {

  constructor( control, options ) {

    this.control = control
    this.depth = 0
    this.indent = 2
    this.timing = {
      test: 0,
      total: 0,
    }

    this.testCount = 0
    this.okTestCount = 0
    this.failTestCount = 0
    this.skipTestCount = 0

    this.failedTests = []
    this.libraryPath = options.libraryPath

    this.symbol = {
      ok: '·',
      skip: '-',
      fail: '⤫',
    }

    this.control.on( 'context', this )
    this.control.on( 'setup', this )
    this.control.on( 'test', this )
    this.control.on( 'teardown', this )
    this.control.on( 'context:end', this )
    this.control.on( 'end', this )

  }

  log( msg ) {
    return process.stdout.write( msg )
  }

  handleEvent( eventType, ...argv ) {
    switch( eventType ) {
      case 'start': this.onStart(); break
      case 'context': this.onContext( ...argv ); break
      case 'setup': this.onContextLifeCycle( eventType, ...argv ); break
      case 'teardown': this.onContextLifeCycle( eventType, ...argv ); break
      case 'context:end': this.onContextEnd( ...argv ); break
      case 'test': this.onTest( ...argv ); break
      case 'end': this.onEnd(); break
    }
  }

  formatTime( ms ) {
    return ms.toFixed( 2 ) + 'ms'
  }

  formatError( error, indent = '' ) {

    var stack = error.stack
    var match = /^\s+at\s/m.exec( stack )
    var stackFrameStart = match ? match.index : 0
    var stackIndent = indent + '  '

    if( stackFrameStart > 0 ) {
      stack = stack.slice( stackFrameStart )
      stack = stack.split( '\n' )
      if( this.libraryPath ) {
        stack = stack.filter( line => {
          return !line.includes( this.libraryPath )
        })
      }
      stack = stack.reduce(( stack, line ) => {
        return `${ stack }${ stackIndent }${ line.trim() }\n`
      }, '')
    }

    var title = color.brightRed( `${ error.name }: ${ error.message }` )

    return `${ indent }${ title }\n${ color.gray( stack ) }\n`

  }

  formatInlineError( error ) {

    var message = ( error.message || 'Unknown error' )

    // Truncate error message to first line,
    // and append an ellipsis
    var eol = message.indexOf( '\n' )
    if( eol != -1 ) {
      message = message.substring( 0, eol )
        .replace( /[.,:;]$|$/, ' […]' )
    }

    return color.brightRed( message )

  }

  onStart() {
    this.timing.total = performance.now()
  }

  onContext( context ) {
    this.depth = Math.max( 0, context.parents.length - 1 ) + 1
    if( context.label ) {
      var indent = ' '.repeat( this.indent * this.depth )
      this.log( `\n${ indent }${ color.brightWhite( context.label ) }\n` )
    } else {
      this.log( '\n' )
    }
    this.depth++
  }

  onContextLifeCycle( type, task ) {
    if( task.error ) {
      var indent = ' '.repeat( this.indent * this.depth )
      this.failedTests.push( task )
      this.log( `${ indent }${ color.brightRed( this.symbol.fail ) } ${ task.label || type } ${ this.formatInlineError( task.error ) }\n` )
    }
  }

  onContextEnd( context ) {
    // ...
  }

  onTest( task ) {
    var indent = ' '.repeat( this.indent * this.depth )
    this.testCount++
    this.timing.test += task.timing.total
    if( task.error != null ) {
      this.failTestCount++
      this.failedTests.push( task )
      this.log( `${ indent }${ color.brightRed( this.symbol.fail ) } ${ task.label } ${ this.formatInlineError( task.error ) } ${ color.gray( `…  ${ this.formatTime( task.timing.task ) }` ) }\n` )
    } else if( task.skip ) {
      this.skipTestCount++
      this.log( `${ indent }${ color.cyan( this.symbol.skip ) } ${ color.gray( task.label ) }\n` )
    } else {
      this.okTestCount++
      this.log( `${ indent }${ color.brightGreen( this.symbol.ok ) } ${ task.label } ${ color.gray( `…  ${ this.formatTime( task.timing.task ) }` ) }\n` )
    }
  }

  onEnd() {

    this.timing.total = performance.now() - this.timing.total

    if( this.failedTests.length ) {
      let separator = color.gray( '╌'.repeat( Math.min( process.stdout.columns, 120 ) ) )
      let indent = '  '
      this.log( `\n${separator}\n` )
      for( let task of this.failedTests ) {
        let taskPath = [].concat( task.context.parents, task.context, task )
          .filter( p => p.label ).map( p => p.label ).join( color.gray( ' / ' ) )
        this.log( `\n${ indent }${ taskPath }${ color.gray(':') }\n` )
        this.log( `${ this.formatError( task.error, indent ) }` )
      }
      this.log( `${separator}\n` )
    }

    var padLength = this.testCount.toString().length
    var pad = ( num ) => num.toString().padStart( padLength, ' ' )

    this.log( `\n  ${ pad( this.testCount ) } tests ${ color.gray( `…  ${ this.formatTime( this.timing.test ) }` ) }\n` )

    if( this.okTestCount ) {
      this.log( color.brightGreen( `${ this.symbol.ok } ${ pad( this.okTestCount ) } pass\n` ) )
    }

    if( this.skipTestCount ) {
      this.log( color.brightCyan( `${ this.symbol.skip } ${ pad( this.skipTestCount ) } skip\n` ) )
    }

    if( this.failTestCount ) {
      this.log( color.brightRed( `${ this.symbol.fail } ${ pad( this.failTestCount ) } fail\n` ) )
    }

  }

}
