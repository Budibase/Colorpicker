import { _ } from './util'

const _extras = extras => 'const extras = ' + JSON.stringify(extras, false, 2)

export default options => {
  const extras = {}

  const getId = options.id ? file => file.id : file => file.path

  const add = file => {
    extras[getId(file)] = file.extra
  }

  const update = file => {
    if (_(extras[getId(file)]) === _(file.extra)) return false
    extras[getId(file)] = file.extra
  }

  const remove = file => {
    delete extras[getId(file)]
  }

  const generate = () => _extras(extras)

  return {
    add,
    update,
    remove,

    generate,
  }
}
