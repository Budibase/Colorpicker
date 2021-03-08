export const _ = JSON.stringify

export const addIndex = (x, i) => (x.i = i)

export const indent = (...args) => {
  if (args.length === 2) {
    return (_lines, collapse) => indent(...args, _lines, collapse)
  }
  const [n, glue, _lines, collapse] = args
  const lines = _lines.filter(Boolean)
  const spaces = '  '.repeat(n)
  return collapse && lines.length === 2
    ? spaces + lines.join('')
    : lines.map(x => (/^\s/.test(x) ? x : spaces + x)).join(glue + '\n')
}

indent.collapse = (...args) => indent(...args, true)

export const _ref = x => `${x.isFile ? 'f' : 'd'}[${x.i}]`

export const _props = (props = {}) =>
  Object.entries(props).map(([prop, value]) => `${_(prop)}: ${_(value)}`)
