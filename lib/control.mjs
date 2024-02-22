const GeneratorFunction = (function*() {}).constructor
const AsyncFunction = (async function() {}).constructor
const AsyncGeneratorFunction = (async function*() {}).constructor

function isFunction( value ) {
  return value instanceof Function ||
    value instanceof AsyncFunction ||
    value instanceof GeneratorFunction ||
    value instanceof AsyncGeneratorFunction
}

class Context {

  constructor( label ) {
    // Meta
    this.label = label || ''
    this.skip = false
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
    // Context lifecycle error (setup/teardown)
    this.error = null
    // Performance
    this.timing = {
      setup: 0,
      tasks: 0,
      teardown: 0,
      total: 0,
    }
  }

  get hasTasks() {
    return this.tasks.length > 0 ||
      this.only.length > 0
  }

  runTask( task ) {
    return new Promise( async function runTask( resolve, reject ) {
      let done = function done( error ) { error ? reject( error ) : resolve() }
      try {
        let retval = task.fn( done )
        if( retval instanceof Promise ) {
          await retval; resolve()
        } else if( task.fn.length == 0 ) {
          resolve()
        }
      } catch( error ) {
        reject( error )
      }
    })
  }

  async runLifeCycle( type ) {
    let tasks = Array.isArray( this[ type ] ) ? this[ type ] : []
    for( let task of tasks ) {
      let taskTime = performance.now()
      try {
        await this.runTask( task )
      } catch( error ) {
        task.error = error
        throw error
      } finally {
        task.timing.task = performance.now() - taskTime
        task.timing.total = task.timing.task
        Control.emit( type, task )
      }
    }
  }

  async runTests() {
    var tasks = this.only.length ? this.only : this.tasks
    for( let task of tasks ) {

      task.skip = task.skip || task.context.skip

      if( task.skip ) {
        Control.emit( 'test', task )
        continue
      }

      let beforeTime = performance.now()
      await this.runLifeCycle( 'before' )
      task.timing.before = performance.now() - beforeTime
      let taskTime = performance.now()

      try {
        await this.runTask( task )
      } catch( error ) {
        task.error = error
      } finally {
        task.timing.task = performance.now() - taskTime
        let afterTime = performance.now()
        await this.runLifeCycle( 'after' )
        task.timing.after = performance.now() - afterTime
        task.timing.total = task.timing.before + task.timing.task + task.timing.after
        Control.emit( 'test', task )
      }

    }
  }

  async run() {

    Control.emit( 'context', this )

    var contextTime = performance.now()

    if( !this.skip && this.setup.length ) {
      let setupTime = performance.now()
      try {
        await this.runLifeCycle( 'setup' )
      } catch( error ) {
        this.error = error
      }
      this.timing.setup = performance.now() - setupTime
    }

    if( this.error != null ) {
      this.timing.total = performance.now() - contextTime
      Control.emit( 'context:end', this )
      return
    }

    var taskTime = performance.now()
    await this.runTests()
    this.timing.tasks = performance.now() - taskTime

    if( !this.skip && this.teardown.length ) {
      let teardownTime = performance.now()
      try {
        await this.runLifeCycle( 'teardown' )
      } catch( error ) {
        this.error = error
      }
      this.timing.teardown = performance.now() - teardownTime
    }

    this.timing.total = performance.now() - contextTime

    Control.emit( 'context:end', this )

    if( this.error != null ) { return }

    if( this.children.length ) {
      this.children.sort( Control.sortContexts )
      for( let context of this.children ) {
        await context.run()
      }
    }

  }

}

class Task {

  constructor( context, label, fn ) {
    this.context = context
    this.label = label || ''
    this.fn = fn
    this.skip = false
    this.error = null
    this.timing = {
      before: 0,
      task: 0,
      after: 0,
      total: 0,
    }
  }

}

class Control {

  static rootContext = new Context()
  static currentContext = this.rootContext

  static Context = Context
  static Task = Task

  static _listeners = new Map()

  static on( eventType, handler ) {
    this._listeners.has( eventType )
      ? this._listeners.get( eventType ).push( handler )
      : this._listeners.set( eventType, [ handler ] )
  }

  static emit( eventType, ...argv ) {
    var listeners = this._listeners.get( eventType )
    if( listeners ) {
      for( let i = 0; i < listeners.length; i++ ) {
        let handler = listeners[i]
        if( isFunction( handler ) ) {
          handler.apply( this, argv )
        } else if( isFunction( handler.handleEvent ) ) {
          handler.handleEvent( eventType, ...argv )
        }
      }
    }
  }

  static collator = new Intl.Collator( 'en', {
    usage: 'sort',
    numeric: true,
  })

  static sortContexts( a, b ) {
    return Control.collator.compare( a.label, b.label )
  }

  static context( label, fn ) {

    if( isFunction( label ) ) { fn = label; label = fn.name }
    var context = new Context( label )

    context.skip = this.currentContext.skip
    context.parent = this.currentContext
    context.parents = [].concat(
      this.currentContext.parents,
      this.currentContext
    )

    this.currentContext.children.push( context )
    this.currentContext = context

    fn.call( this.currentContext )

    this.currentContext = context.parent

  }

  static skipContext( label, fn ) {

    if( isFunction( label ) ) { fn = label; label = fn.name }
    var context = new Context( label )

    context.skip = true

    context.parent = this.currentContext
    context.parents = [].concat(
      this.currentContext.parents,
      this.currentContext
    )

    this.currentContext.children.push( context )
    this.currentContext = context

    fn.call( this.currentContext )

    this.currentContext = context.parent

  }

  static setup( label, fn ) {
    if( isFunction( label ) ) { fn = label; label = fn.name }
    var task = new Task( this.currentContext, label, fn )
    this.currentContext.setup.push( task )
  }

  static before( label, fn ) {
    if( isFunction( label ) ) { fn = label; label = fn.name }
    var task = new Task( this.currentContext, label, fn )
    this.currentContext.before.push( task )
  }

  static after( label, fn ) {
    if( isFunction( label ) ) { fn = label; label = fn.name }
    var task = new Task( this.currentContext, label, fn )
    this.currentContext.after.push( task )
  }

  static test( label, fn ) {
    if( isFunction( label ) ) { fn = label; label = fn.name }
    var task = new Task( this.currentContext, label, fn )
    this.currentContext.tasks.push( task )
  }

  static skip( label, fn ) {
    if( isFunction( label ) ) { fn = label; label = fn.name }
    var task = new Task( this.currentContext, label, fn )
    task.skip = true
    this.currentContext.tasks.push( task )
  }

  static only( label, fn ) {
    if( isFunction( label ) ) { fn = label; label = fn.name }
    var task = new Task( this.currentContext, label, fn )
    this.currentContext.only.push( task )
  }

  static teardown( label, fn ) {
    if( isFunction( label ) ) { fn = label; label = fn.name }
    var task = new Task( this.currentContext, label, fn )
    this.currentContext.teardown.push( task )
  }

  static async run() {
    this.emit( 'start' )
    await this.rootContext.run()
    this.emit( 'end' )
  }

}

export default Control
