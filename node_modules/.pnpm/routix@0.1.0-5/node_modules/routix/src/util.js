export const pipe = (...fns) => x0 => fns.reduce((x, f) => f(x), x0)

export const identity = x => x

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
export const escapeRe = string =>
  string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')

export const noop = () => {}

export const split = (predicate, items) => {
  const yes = []
  const no = []
  for (const item of items) {
    const target = predicate(item) ? yes : no
    target.push(item)
  }
  return [yes, no]
}

export const Deferred = () => {
  let resolve, reject
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { promise, resolve, reject }
}

export const stringHashCode = str => {
  let hash = 5381
  let i = str.length
  while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i)
  return (hash >>> 0).toString(36)
}
