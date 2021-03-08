const f /* files */ = [
  { // f[0]
    path: "/Colorpicker",
    import: () => import("/Users/kevinabergkultalahti/Workspace/Contracting/Budibase/Colorpicker/src/Colorpicker.svench"),
    "id": "pv3lm3",
    "ext": ".svench",
    "dir": "",
    "segment": "Colorpicker",
    "sortKey": "Colorpicker",
    "title": "Colorpicker",
    "canonical": "/Colorpicker",
    "options": {},
    "views": [
      "colorpicker"
    ]
  }
]

const d /* dirs */ = []

for (const g of [f, d])
  for (const x of g) x.children = x.children ? x.children() : []

const routes = [...f, ...d]

const tree = {
  path: "/",
  isRoot: true,
  "id": undefined,
  "ext": undefined,
  "dir": undefined,
  "segment": undefined,
  "sortKey": undefined,
  "title": undefined,
  "canonical": undefined,
  children: [
    f[0]
  ]
}

export { f as files, d as dirs, routes, tree }
