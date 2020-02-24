var colors = {
  black: 30,
  red: 31,
  brightRed: 91,
  green: 32,
  brightGreen: 92,
  yellow: 33,
  brightYellow: 93,
  blue: 34,
  brightBlue: 94,
  magenta: 35,
  brightMagenta: 95,
  cyan: 36,
  brightCyan: 96,
  white: 37,
  brightWhite: 97,
  gray: 90,
  boldGray: 90 + 60,
}

for( var name in colors ) {
  const color = colors[ name ]
  module.exports[ name ] = function( msg ) {
    return !process.stdout.isTTY ? msg :
      `\u001b[${ color > 90 ? `1;${ color - 60 }` : color }m${msg}\u001b[0m`
  }
}
