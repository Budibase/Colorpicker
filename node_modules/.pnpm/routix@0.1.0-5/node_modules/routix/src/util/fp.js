const piper = (x, f) => f(x)

export const pipe = (...fns) => x0 => fns.reduce(piper, x0)

const flower = (x, f) => (f(x), x)

export const flow = (...fns) => x0 => fns.reduce(flower, x0)

// debugging util
export const _log = (...prefix) => x => {
  // eslint-disable-next-line no-console
  console.log(...prefix, x)
  return x
}

export const map = (mapper, o) => {
  const fn = x => {
    if (x.map) return x.map(mapper)
    const result = []
    let i = 0
    for (const item of x) {
      result.push(mapper(item, i++, x))
    }
    return result
  }
  if (o) return fn(o)
  return o
}
