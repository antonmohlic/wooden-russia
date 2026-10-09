/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_592032537")

  // add field
  collection.fields.addAt(24, new Field({
    "help": "",
    "hidden": false,
    "id": "date1148429927",
    "max": "",
    "min": "",
    "name": "status_changed_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_592032537")

  // remove field
  collection.fields.removeById("date1148429927")

  return app.save(collection)
})
