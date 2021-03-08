# Routix

> Low level routes generator with a focus on performance and customizability.

Routix watches some directory for files with some given extensions, and outputs a flat list of routes (files) and/or a nested tree.

- FS is hit only once for listing and stats by the watcher
- the tree is fully constructed from user provided `path`
- all processing is done at compile time
- the flat routes list and the tree references the same runtime objects

## Principles

The file watcher already has to list and stats from the file system; Routix doesn't hit the file system beyond that. During watch, most things are kept in memory, and only the relevant bits are recomputed.

The output is very basic and can easily be customized by providing a `parse` function that receives a file and can change its `path` or augment it with custom properties, and a `format` function that converts the intermediary file objects to the format that will be written into the generated files.

Only files (not directories) are taken into account. The tree hierarchy is fully constructed from the file objects' `path` property that is returned by the `parse` function.

## Installation

```bash
npm install --dev routix
```

## Rollup plugin

```js
import routix from 'routix/rollup'

export default {
  // ...

  plugins: [
    routix({
      dir: 'src/pages',
      extensions: ['.svelte', '.svx'],
      write: { routes: true, tree: true },
      leadingSlash: true,
      parse: file => {
        // . => /
        file.path = file.path.replace(/\./g, '/')

        const segments = file.path.split('/')

        let segment = segments.pop()

        // foo/index => foo
        if (segment === 'index') {
          file.path = segments.join('/') || '/'
          segment = segments[segments.length - 1]
        }

        // foo_bar_baz => "foo bar baz"
        file.title = segment ? segment.replace(/_+/g, ' ') : '/'
      },
      format: ({ title }) => ({ title }),
    }),

    // ...
  ],
}
```

## Node API

```js
import Routix from 'routix'

// init
const routix = Routix({ ...options })

// start reading FS (and watching if watch option is true)
await routix.start()

// wait for a build to finish
await routix.onIdle()

// wait for a change event for at most x ms, then until the build completes
await routix.onIdle(100)

// is the given file is one of our write target (i.e. routes.js or tree.js)?
routix.isWriteTarget(file)

// is the given file watched by Routix (i.e. a "page" file)?
routix.isWatchedFile(file)

// close file watchers
routix.close()
```

## Options

For now, see the [options.js](./src/options.js) file.

## Customizing the output

### `parse`

```js
// with actual files:
parse = async ({ isFile: true, path, extension, absolute }, options) => void

// with "virtual" dirs:
parse = async ({ isFile: false, path }, options) => void
```

The `parse` function is called once with each file (that is, files that are initially present, and then existing files that are updated, and new files that are created).

It is also called for each "directory", although in this case it may be called more than once for each. Note that those directories are not the one from the file system, but the ones that are derived from the returned file `path` when the tree is built -- when `write.tree` is false, then directories are not processed.

The parse function is free to mutate the passed object, however its return value is ignored.

### `format`

```js
format = ({ isFile, path, ... }) => ({ [prop]: any })
```

A `format` function can be passed to add extra props to items in the generated routes file. The function is passed the augmented (by `parse`) intermediary object and must return an object of prop / value pairs that will be added to the output.

The `format` function is called for each file and directory. It must use the `isFile` prop if it want to distinguish between them.
