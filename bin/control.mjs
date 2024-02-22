#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'
import control from '../lib/control.mjs'
import color from '../lib/color.mjs'
import Reporter from '../lib/Reporter.mjs'

const argv = process.argv.slice( 2 )

const __filename = url.fileURLToPath( import.meta.url )
const __dirname = path.dirname( __filename )

if( argv.includes( '-h' ) || argv.includes( '--help' ) ) {
  process.stdout.write(`
  ${ color.brightWhite( 'Usage' ) }: control ${ color.gray( '[options] [paths...]' ) }

  ${ color.brightWhite( 'Options' ) }:
    -h, --help ${ color.gray('╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌')} Show this help
    -v, --version ${ color.gray('╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌')} Print version number
    --no-color ${ color.gray('╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌')} Disable color output
`)
  process.exit( 0 )
}

if( argv.includes( '-v' ) || argv.includes( '--version' ) ) {
  let json = await fs.readFile( path.join( __dirname, '..', 'package.json' ), 'utf8' )
  let pkg = JSON.parse( json )
  process.stdout.write( pkg.version + '\n' )
  process.exit( 0 )
}

if( argv.includes( '--no-color' ) || argv.includes( '--no-colors' ) ) {
  process.env.NO_COLOR = '1'
}

global.context = ( label, fn ) => control.context( label, fn )
global.context.skip = ( label, fn ) => control.skipContext( label, fn )
global.setup = ( label, fn ) => control.setup( label, fn )
global.teardown = ( label, fn ) => control.teardown( label, fn )
global.before = ( label, fn ) => control.before( label, fn )
global.after = ( label, fn ) => control.after( label, fn )
global.test = ( label, fn ) => control.test( label, fn )
global.skip = ( label, fn ) => control.skip( label, fn )
global.only = ( label, fn ) => control.only( label, fn )

// Aliases
global.beforeEach = global.before
global.afterEach = global.after
global.test.skip = global.skip
global.test.only = global.only

const files = argv.slice().filter(( arg ) => {
  return !arg.startsWith( '-' )
})

// Default to files in `test` directory
if( files.length == 0 ) files.push( 'test' )

async function load( files ) {
  for( let filename of files ) {
    let stats = await fs.stat( filename )
    if( stats.isDirectory() ) {
      await loadDir( filename )
    } else if( stats.isFile() ) {
      if( /\.(js|mjs|cjs)$/.test( filename ) ) {
        await import( filename )
      }
    }
  }
}

async function loadDir( dirname ) {
  let dir = await fs.opendir( dirname, { recursive: true })
  for await( let dirent of dir ) {
    let filename = path.join( dirname, dirent.name )
    if( dirent.isFile() ) {
      filename = path.join( process.cwd(), filename )
      if( /\.(js|mjs|cjs)$/.test( filename ) ) {
        await import( filename )
      }
    }
  }
}

const reporter = new Reporter( control, {
  libraryPath: path.join( path.dirname( process.argv[1] ), '..' ),
})

load( files )
  .then(() => control.run())
  .catch(( error ) => {
    console.error( error )
    process.exit( 1 )
  })
