import reader from './read.js'
import builder from './build.js'
import { parseOptions } from './options.js'

const IS_ROUTIX = Symbol('IS_ROUTIX')

const createRoutix = arg => {
  if (arg[IS_ROUTIX]) return arg

  const options = parseOptions(arg)

  const { log, write, start } = options

  const build = builder(options)

  const read = reader(options, build)

  const writeTargets = Object.values(write).filter(Boolean)

  const isWriteTarget = id => writeTargets.some(x => x === id)

  const { onIdle, get } = build
  const { init, isWatchedFile, close } = read

  if (start) {
    setTimeout(() => {
      read.init().catch(err => log.error(err))
    })
  }

  return {
    [IS_ROUTIX]: true,
    options,
    start: init,
    onIdle,
    get,
    isWriteTarget,
    isWatchedFile,
    close,
  }
}

export default createRoutix
