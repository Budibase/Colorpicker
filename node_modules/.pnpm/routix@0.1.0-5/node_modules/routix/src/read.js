import CheapWatch from 'cheap-watch'

import { map } from './util/fp.js'

export default (
  { log, dir, extensions, watch: _watch = false, ignore },
  build
) => {
  const isWatchedFile = path => extensions.some(x => path.endsWith(x))

  const filter = ({ path, stats }) =>
    (stats.isDirectory() || isWatchedFile(path)) && !(ignore && ignore(path))

  let watcher

  const start = ({ watch = _watch } = {}) => {
    watcher = new CheapWatch({ dir, watch, filter })

    log.info(
      '%s %s*/**/*.(%s)',
      watch ? 'Watching' : 'Reading',
      dir,
      extensions.map(x => x.slice(1)).join('|')
    )

    if (watch) {
      watcher.on('+', ({ path, stats, isNew }) => {
        if (isNew) {
          build.add([path, stats])
        } else {
          build.update([path, stats])
        }
      })

      watcher.on('-', ({ path, stats }) => build.remove([path, stats]))
    }

    return watcher
      .init()
      .then(() => map(build.add, watcher.paths))
      .then(build.start)
  }

  let initPromise

  const init = (...args) => initPromise || (initPromise = start(...args))

  const close = async () => {
    await initPromise
    watcher.close()
  }

  return { init, close, isWatchedFile }
}
