var async = require( './async' )
var reporter = require( './reporter' )

class Context {
  constructor( name ) {
    // Meta
    this.name = name || ''
    // Structure
    this.parent = null
    this.parents = []
    this.children = []
    // Before/after once
    this.setup = []
    this.teardown = []
    // Before/after each
    this.before = []
    this.after = []
    // Tests
    this.tasks = []
    this.only = []
    // Performance
    this.time = [ 0, 0 ]
  }
}

class Task {
  constructor( name, fn ) {
    this.name = name || ''
    this.fn = fn
    this.skip = false
    this.errors = []
    this.time = null
  }
}

function control( name, fn ) {

  var context = new Context( name )

  context.parent = control.currentContext
  context.parents = [].concat( control.currentContext.parents, control.currentContext )
  control.currentContext.children.push( context )
  control.currentContext = context

  fn.call( control.currentContext )

  control.currentContext = context.parent

}

control.reporter = reporter
control.currentContext = new Context()
control.rootContext = control.currentContext

control.context = control

control.setup = function( name, fn ) {
  var task = new Task( name, fn )
  task.context = control.currentContext
  control.currentContext.setup.push( task )
}

control.teardown = function( name, fn ) {
  var task = new Task( name, fn )
  task.context = control.currentContext
  control.currentContext.teardown.push( task )
}

control.before = function( name, fn ) {
  var task = new Task( name, fn )
  task.context = control.currentContext
  control.currentContext.before.push( task )
}

control.after = function( name, fn ) {
  var task = new Task( name, fn )
  task.context = control.currentContext
  control.currentContext.after.push( task )
}

control.test = function( name, fn ) {
  var task = new Task( name, fn )
  task.context = control.currentContext
  control.currentContext.tasks.push( task )
}

control.skip = control.test.skip = function( name, fn ) {
  var task = new Task( name, fn )
  task.context = control.currentContext
  task.skip = true
  control.currentContext.tasks.push( task )
}

control.only = control.test.only = function( name, fn ) {
  var task = new Task( name, fn )
  task.context = control.currentContext
  control.currentContext.only.push( task )
}

control.runTasks = function( context, tasks, eventName, callback ) {

  if( !tasks || !tasks.length ) {
    return void callback()
  }

  async.forEach( tasks, ( task, next ) => {

    if( task instanceof Context ) {
      return control.runContext( task, next )
    }

    if( task.skip ) {
      if( control.reporter.skip ) {
        control.reporter.skip( task )
      }
      return setImmediate( next )
    }

    var time = process.hrtime()
    var completed = false
    var isAsync = false
    var returnValue = undefined
    var error = null

    var done = ( error ) => {
      if( error ) {
        task.errors.push( error )
      }
      if( !completed ) {
        task.time = process.hrtime( time )
        completed = true
        if( control.reporter[ eventName ] ) {
          control.reporter[ eventName ]( task )
        }
        setImmediate( next )
      }
    }

    try {
      returnValue = task.fn( done )
      isAsync = returnValue instanceof Promise
      if( isAsync ) {
        returnValue.catch( done ).then(() => done())
      }
    } catch( err ) {
      error = err
    }

    if( error || ( !task.fn.length && !isAsync ) ) {
      done( error )
    }

  }, ( error ) => {

    for( var i = 0; i < tasks.length; i++ ) {
      let task = tasks[i]
      if( task.time ) {
        context.time[0] += task.time[0]
        context.time[1] += task.time[1]
      }
    }

    callback( error )

  })

}

control.runContext = function( context, callback ) {

  if( control.reporter.context ) {
    control.reporter.context( context )
  }

  async.series([
    ( next ) => {
      context.setup.length ?
        control.runTasks( context, context.setup, 'setup', next ) :
        next()
    },
    ( next ) => {

      var tasks = context.only.length ?
        context.only : context.tasks

      control.runTasks( context, tasks, 'test', ( error ) => {
        if( error ) return next( error )
        if( context.children.length ) {
          async.forEach( context.children, control.runContext, next )
        } else {
          next()
        }
      })

    },
    ( next ) => {
      context.teardown.length ?
        control.runTasks( context, context.teardown, 'teardown', next ) :
        next()
    }
  ], ( error ) => {

    if( control.reporter.contextEnd ) {
      control.reporter.contextEnd( context )
    }

    callback( error )

  })

}

control.run = function( callback ) {
  control.runContext( control.rootContext, ( error ) => {
    if( control.reporter.end ) {
      control.reporter.end( error )
    }
  })
}

control.Context = Context
control.Task = Task

module.exports = control
