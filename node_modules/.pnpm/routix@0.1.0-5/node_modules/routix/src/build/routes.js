import { identity, noop } from '../util.js'
import { notEmpty } from '../model.js'

import { indent, _ref } from './util.js'

const _ = JSON.stringify

const _props = (props = {}) =>
  // Object.entries(props).map(([prop, value]) => `${_(prop)}: ${_(value)}`)
  Object.entries(props).flatMap(([prop, value]) => {
    const json = JSON.stringify(value, false, 2) || 'undefined'
    const lines = json.split('\n')
    const first = lines.shift()
    return [`${_(prop)}: ${first}`, ...lines.map(x => '    ' + x)].join('\n')
  })

const _children = children =>
  // NOTE children not here when tree:false
  children && `children: () => [${children.map(_ref).join(', ')}]`

const _file = (
  props,
  { id: withId, importDefault, importProp, resolve },
  { i, id, absolute, path, children }
) =>
  indent(1, '', [
    `{ // f[${i}]`,
    indent(2, ',', [
      withId && `id: ${_(id)}`,
      `path: ${_(path)}`,
      `${importProp}: () => import(${_(
        resolve ? resolve(absolute) : absolute
      )})${importDefault ? '.then(dft)' : ''}`,
      ..._props(props),
      children && children.length > 0 && _children(children),
    ]),
    '}',
  ])

const _dir = (props, { id: withId }, { i, id, path, children }) =>
  indent(1, '', [
    `{ // d[${i}]`,
    indent(2, ',', [
      withId && `id: ${_(id)}`,
      `path: ${_(path)}`,
      ..._props(props),
      _children(children),
    ]),
    '}',
  ])

const _generate = (
  { id, format, importDefault, importProp, resolve },
  files,
  dirs
) =>
  indent(0, '\n', [
    importDefault && `const dft = m => m.default`,

    indent.collapse(0, '', [
      'const f /* files */ = [',
      indent(
        1,
        ','
      )(
        files.map(x =>
          _file(format(x), { id, importDefault, importProp, resolve }, x)
        )
      ),
      ']',
    ]),

    dirs &&
      indent.collapse(0, '', [
        'const d /* dirs */ = [',
        indent(1, ',')(dirs.map(x => _dir(format(x), { id }, x))),
        ']',
      ]),

    dirs &&
      indent(0, '', [
        'for (const g of [f, d])',
        indent(1, '', [
          'for (const x of g) x.children = x.children ? x.children() : []',
        ]),
      ]),

    dirs ? 'const routes = [...f, ...d]' : 'const routes = files',
  ])

const addIndex = (x, i) => (x.i = i)

export default ({
  format = noop,
  keepEmpty,
  importDefault = false,
  importProp = 'import',
  resolve,
  sortFiles,
  sortDirs,
}) => {
  const routes = {}

  const add = file => {
    routes[file.path] = file
  }

  const update = (file, previous) => {
    delete routes[previous.path]
    routes[file.path] = file
  }

  const remove = ({ path }) => {
    if (!routes[path]) return
    delete routes[path]
  }

  const filter = keepEmpty ? identity : x => x.filter(notEmpty)

  const generate = (dirs = []) => {
    const files = filter(Object.values(routes))

    if (sortFiles) files.sort(sortFiles)
    if (sortDirs) dirs.sort(sortDirs)

    files.forEach(addIndex)
    if (dirs) dirs.forEach(addIndex)

    return _generate(
      { format, importDefault, importProp, resolve },
      files,
      dirs
    )
  }

  return {
    add,
    update,
    remove,

    generate,
  }
}
