import * as path from 'path'
import { identity, stringHashCode } from './util.js'

const parseItem = ({ dir, extensions }, arg) => {
  if (Array.isArray(arg)) {
    const [relative] = arg
    const ext =
      extensions.find(x => relative.endsWith(x)) || path.extname(relative)
    return {
      isFile: true,
      relative,
      absolute: path.join(dir, relative),
      extension: ext,
      path: ext ? relative.slice(0, -ext.length) : relative,
    }
  }
  return arg
}

const parseFile = options => async (arg, previous) => {
  const { leadingSlash, parse = identity } = options

  const item = parseItem(options, arg)

  item.id = stringHashCode(item.isFile ? item.absolute : `d:${item.path}`)

  if (leadingSlash && item.path[0] !== '/') {
    item.path = '/' + item.path
  }

  const result = await parse(item, previous, options)

  // canceled
  if (result === false) return false

  return item
}

export default parseFile
