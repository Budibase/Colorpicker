import * as fs from 'fs'
import * as path from 'path'
import parser from './parse.js'
import { Deferred, noop } from './util.js'
import Tree from './build/tree'
import Routes from './build/routes'
import Extras from './build/extras'
import { indent } from './build/util'

const now = Date.now

const resolved = Promise.resolve()

const wait = delay => new Promise(resolve => setTimeout(resolve, delay))

const posixify = x => x.replace(/\\/g, '/')

export default (options = {}) => {
  const {
    dir,
    write: { routes: writeRoutes, tree: writeTree, extras: writeExtras } = {},
    merged = false,
    buildDebounce = 50,
    writeFile: _writeFile = (path, contents, encoding = 'utf8') =>
      fs.promises.writeFile(path, contents, encoding),
    log = console,
  } = options

  const files = {}

  const parse = parser(options)
  let errors = []

  const hasRoutes = writeRoutes || merged
  const hasTree = writeTree || merged
  const hasExtras = !!writeExtras

  const api = {
    // add: file => builders.forEach(x => x.add(file)),
    add: (...args) => doAdd(...args),
    // update: (file, previous) => builders.forEach(x => x.update(file, previous)),
    update: (...args) => doUpdate(...args),
    // remove: file => builders.forEach(x => x.remove(file)),
    remove: (...args) => doRemove(...args),
  }

  const tree = hasTree && Tree(options, { parse, build: api })
  const routes = (hasRoutes || hasTree) && Routes(options)
  const extras = hasExtras && Extras(options)

  const builders = [routes, tree].filter(Boolean)

  let started = false
  let timeout = null
  let scheduled = false
  let running = false
  // NOTE start invalidated to ensure everything will be built on first run,
  // even if there are no target files
  const invalidated = { build: true, extras: true }
  const startDeferred = Deferred()
  let buildPromise = Promise.resolve()
  // a promise that resolves when we arrive to a point when we might be
  // idle (but not sure, because another volley of changes may have happened
  // since we started processing the one for which this promise was created)
  let idlePromise = Promise.resolve()
  let startTime = now()
  let latches = 0
  let lastInvalidateTime = null

  const isIdle = () =>
    errors.length > 0 ||
    (started && timeout === null && !scheduled && !running && latches === 0)

  const logBuildSuccess = args => {
    const targets = args.flat().filter(Boolean)
    if (!targets.length) {
      log.info('Nothing changed')
      return
    }
    const duration = now() - startTime
    startTime = null
    log.info(
      `Written: ${targets.map(() => '%s*')} (%sms)`,
      ...targets.map(target => path.resolve(target)),
      duration
    )
  }

  const writeFile = (...args) =>
    Promise.resolve(_writeFile(...args)).then(() => args[0])

  const build = async () => {
    if (!routes && !tree) return

    running = true

    const dirs = tree ? await tree.prepare() : null

    const _routes = routes.generate(dirs)

    const _tree = hasTree && tree.generate()

    const promises = []

    if (merged) {
      const contents = indent(0, '\n', [
        _routes,
        _tree,
        `export { f as files, d as dirs, routes, tree }\n`,
      ])
      promises.push(writeFile(writeRoutes, contents))
    } else {
      if (writeRoutes) {
        const contents = indent(0, '\n', [
          _routes,
          `export { f as files,${dirs ? ` d as dirs,` : ''} routes }\n`,
        ])
        promises.push(writeFile(writeRoutes, contents))
      }
      if (writeTree) {
        // const prefix = writeRoutes
        //   ? `import f from '${writeRoutes}'\n\nconst d = f.dirs`
        //   : _routes
        // const contents = prefix + '\n\n' + _tree
        const contents = indent(0, '\n', [
          writeRoutes
            ? `import { files as f, dirs as d } from '${writeRoutes}'`
            : _routes,
          _tree,
          'export default tree',
        ])
        promises.push(writeFile(writeTree, contents))
      }
    }

    return Promise.all(promises)
  }

  const buildExtras = async () => {
    if (!extras) return

    const _extras = extras.generate()

    const contents = indent(0, '\n', [
      //
      _extras,
      'export default extras',
    ])

    return writeFile(writeExtras, contents)
  }

  const schedule = () => {
    timeout = null
    if (scheduled) return
    scheduled = true
    buildPromise = buildPromise
      .then(() => {
        scheduled = false
        const { build: rebuild, extras: rebuildExtras } = invalidated
        invalidated.build = invalidated.extras = false
        return Promise.all([rebuild && build(), rebuildExtras && buildExtras()])
      })
      .then(logBuildSuccess)
      .catch(err => {
        errors.push(err)
      })
      .finally(() => {
        running = false
      })
    return buildPromise
  }

  let _resolveIdlePromise = noop

  const invalidate = (debounce = buildDebounce) => {
    if (!started) return

    if (timeout !== null) {
      clearTimeout(timeout)
    }

    // NOTE we still need to resolve the previous idlePromise, or _onIdle will
    // hang on it (especially if we've just cancelled an active timeout just
    // above)
    const resolvePrevious = _resolveIdlePromise

    idlePromise = new Promise(resolve => {
      _resolveIdlePromise = resolve
      const doSchedule = () => {
        if (latches > 0) {
          resolve()
          return
        }
        schedule().finally(resolve)
      }
      timeout = setTimeout(doSchedule, debounce)
      notifyChange() // must happen once timeout is non null (for idle state)
    })

    resolvePrevious()
  }

  const release = (canceled = false) => {
    latches--
    if (canceled) {
      log.info('Bailing out')
      return
    }
    if (started && latches === 0) {
      invalidate(Math.max(0, buildDebounce - (Date.now() - lastInvalidateTime)))
    }
  }

  // invalidates (i.e. make busy/non idle, and wait to see if more changes are
  // coming for the debounce duration) right when the call is made, then wait
  // for at least the debounce delay (hene lastInvalidateTime), and wait even
  // longer if the given promise has not resolved at this point
  const invalidateUntil = promise => {
    lastInvalidateTime = Date.now()
    latches++
    return promise.finally(release)
  }

  const input = () => {
    if (startTime === null) {
      startTime = now()
      latches = 0
      errors = []
    }
  }

  const pushError = err => {
    errors.push(err)
  }

  const start = () => {
    input()
    started = true
    invalidate(0)
    startDeferred.resolve()
  }

  // NOTE parse is async, but we need add/update to be sync
  const _parse = async (pathStats, previous) => {
    const file = await parse(pathStats, previous)
    // canceled
    if (file === false) return false
    return file
  }

  const doAdd = file => {
    files[file.relative] = file
    if (file === false) return false
    if (extras && extras.add(file) !== false) {
      invalidated.extras = true
    }
    invalidated.build = true
    builders.forEach(x => x.add(file))
  }

  const add = pathStats => {
    input()
    const [, stats] = pathStats
    if (stats.isDirectory()) return
    invalidateUntil(
      _parse(pathStats)
        .then(doAdd)
        .catch(pushError)
    )
  }

  const doUpdate = (file, previous) => {
    files[file.relative] = file

    if (file === false) return false

    if (
      extras &&
      file.rebuildExtras !== false &&
      extras.update(file, previous) !== false
    ) {
      invalidated.extras = true
    }

    if (file.rebuild === false) return false

    invalidated.build = true

    builders.forEach(x => x.update(file, previous))
  }

  const update = pathStats => {
    input()
    const [path, stats] = pathStats
    if (stats.isDirectory()) return
    const previous = files[path]
    invalidateUntil(
      _parse(pathStats, previous)
        .then(file => doUpdate(file, previous))
        .catch(pushError)
    )
  }

  const doRemove = file => {
    delete files[file.relative]
    if (extras && extras.remove(file) !== false) invalidated.extras = true
    invalidated.build = true
    builders.forEach(x => x.remove(file))
    invalidate()
  }

  const remove = ([path, stats]) => {
    try {
      input()
      if (stats.isDirectory()) return
      const file = files[path]
      if (!file) return

      delete files[path]

      if (extras && extras.remove(file) !== false) {
        invalidated.extras = true
      }

      invalidated.build = true
      api.remove(file)

      invalidate()
    } catch (err) {
      pushError(err)
    }
  }

  const _onIdle = () =>
    isIdle() ? resolved : Promise.all([idlePromise, buildPromise]).then(_onIdle)

  const onIdle = async (changeTimeout = 0) => {
    await startDeferred.promise

    if (changeTimeout) {
      // we stop waiting early if Routix has caught the change (waitChange)
      // -- this ensures optimal waiting time but, unfortunately, in the
      // marginal case of when user deletes/renames a Routix page file;
      // we're still degenerate (i.e. wait full delay) for any other source
      // watched by Rollup only...
      await Promise.race([wait(changeTimeout), onChange()])
    }

    await _onIdle()

    if (errors.length > 0) {
      // throw errors[0]
      if (errors.length === 1) {
        throw errors[0]
      }
      const err = new Error(
        `Build errors (${errors.length})\n1. ${errors[0].stack}`
      )
      err.name = 'RoutixBuildError'
      err.errors = errors
      errors = []
      throw err
    }
  }

  let changeListeners = []

  const notifyChange = () => {
    for (const f of changeListeners) f()
    changeListeners = []
  }

  const onChange = () => new Promise(resolve => changeListeners.push(resolve))

  // NOTE for some reason, CheapWatch seems to give posix path on Windows
  const get = filename => files[posixify(path.relative(dir, filename))]

  return { start, add, update, remove, onChange, onIdle, get }
}
