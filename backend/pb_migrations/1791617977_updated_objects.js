/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_592032537")

  // add field
  collection.fields.addAt(25, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3662516253",
    "max": 100,
    "min": 0,
    "name": "heritage_category",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text525459381",
    "max": 30,
    "min": 0,
    "name": "heritage_number",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_592032537")

  // remove field
  collection.fields.removeById("text3662516253")

  // remove field
  collection.fields.removeById("text525459381")

  return app.save(collection)
})
