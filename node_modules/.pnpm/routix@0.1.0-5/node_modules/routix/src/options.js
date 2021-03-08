import * as path from 'path'
import { identity } from './util.js'
import findup from './util/findup.js'

// we need to find up because we're probably in /dist
let _root
const root = () =>
  _root || (_root = path.dirname(findup(__dirname, 'package.json')))
const defaultRoutesPath = () => path.resolve(root(), 'routes.js')
const defaultTreePath = () => path.resolve(root(), 'tree.js')

const parseExtensions = (extensions = []) => {
  if (!extensions) return extensions
  return extensions.map(ext => (!ext.startsWith('.') ? '.' + ext : ext))
}

const emptyObject = {}

/* eslint-disable no-console */
const wrapConsole = fn => (msg, ...args) =>
  fn(msg.replace(/%s\*/g, '%s', ...msg))
const defaultLogger = {
  log: wrapConsole(console.log).bind(console, '[routix]'),
  info: wrapConsole(console.info).bind(console, '[routix]'),
  error: wrapConsole(console.error).bind(console, '[routix]'),
}
/* eslint-enable no-console */

export const parseOptions = ({
  /**
   * @type {string}
   */
  dir,

  /**
   * @type {string[]}
   */
  extensions = [],

  /**
   * @type {function}
   */
  ignore = path => /(?:^|\/)(?:node_modules|\.git)\//.test(path),

  /**
   * @type {bool | { routes: bool|string, tree: bool|string }}
   *
   *     write: true|false
   *
   *     write: { routes: true|false, tree: true|false }
   *
   *     write: { routes: '/path/to/file', tree: '' }
   */
  write,

  /**
   * @type {bool}
   *
   * Whether to write a single `routes.js` file, or merge routes and tree in the
   * same file.
   */
  merged = true,

  /**
   * @type {bool} Adds an `id` from a hash of absolute path.
   */
  id = true,

  /**
   * @type {bool}
   *
   * Whether to watch FS after initial build.
   *
   * NOTE When used in Rollup, this option is set automatically by the plugin,
   * based on the ROLLUP_WATCH env variable (it can be overridden, but it's
   * probably not what you want).
   */
  watch = null,

  /**
   * @type {int|falsy}
   *
   * Defer Rollup build by this duration (ms); this is needed to ensure that
   * our file watcher has the time to pick file changes (and then holds Rollup
   * until routes.js is generated).
   *
   * NOTE This is only useful when used as a bundler (Rollup) plugin.
   */
  watchDelay = 40,

  /**
   * @type {bool} Prepend paths with a leading slash
   */
  leadingSlash = false,

  /**
   * @type {bool} Import default import
   */
  importDefault = false,

  /**
   * @type {string} Name of the import property in route objects
   */
  importProp = 'import',

  /**
   * @type {function} Resolve an import path in routes.js
   */
  resolve = identity,

  /**
   * Files:
   *
   *     ({ isFile: true, absolute, relative, path, extension }) => item | undefined
   *
   * Directories:
   *
   *     ({ isFile: false, absolute, relative, path }) => item | undefined
   *
   * Virtual directories (when building tree from modified paths):
   *
   *     ({ isVirtual: true, path }) => item | undefined
   */
  parse = identity,

  /**
   * Alternative way to provide parse (allow to preprocess options).
   *
   * @type {options => (item, previous) => parsed}
   */
  parser,

  /**
   * @type {({ isFile: bool, path: string }) => object}
   *
   * item => props
   */
  format = () => emptyObject,

  /**
   * @type {bool} `true` to auto start Routix (only with node API)
   */
  start = false,

  // --- Advanced ---

  /**
   * @type {int} Number of ms to wait for a possible new event before starting
   * the build process.
   */
  buildDebounce = 50,

  /**
   * @type {object} Custom logger (with `console` API)
   */
  log = defaultLogger,

  /**
   * @type {function} Custom file writer: `async (name, contents) => {}`
   */
  writeFile,

  /**
   * @type {function} Custom sorter for files.
   */
  sortFiles = null,
  /**
   * @type {function} Custom sorter for dirs.
   */
  sortDirs = null,
  /**
   * @type {function} Custom sorter for tree children.
   */
  sortChildren = null,

  /**
   * @type {Function} Resolve conflicts between file node with same path.
   */
  resolveConflict,
} = {}) => {
  const options = {
    id,
    watchDelay,
    dir: dir && path.resolve(dir),
    extensions: parseExtensions(extensions),
    ignore,
    watch,
    leadingSlash,
    importDefault,
    importProp,
    resolve,
    parse,
    format,
    merged,
    write: {
      routes:
        !write ||
        write === true ||
        !write.hasOwnProperty('routes') ||
        write.routes === true
          ? defaultRoutesPath()
          : path.resolve(write.routes),
      tree:
        !merged &&
        (!write ||
        write === true ||
        !write.hasOwnProperty('tree') ||
        write.tree === true
          ? defaultTreePath()
          : path.resolve(write.tree)),
      extras: write && write.extras,
    },
    start,
    // internal (for testing)
    writeFile,
    buildDebounce,
    log,
    sortFiles,
    sortDirs,
    sortChildren,
    resolveConflict,
  }

  if (parser) {
    options.parse = parser(options)
  }

  return options
}
