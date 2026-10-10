/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_592032537")

  // add field
  collection.fields.addAt(27, new Field({
    "help": "",
    "hidden": false,
    "id": "bool2866838492",
    "name": "worth_visit",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(28, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text303074908",
    "max": 500,
    "min": 0,
    "name": "visit_why",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(29, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text349293717",
    "max": 2000,
    "min": 0,
    "name": "visit_info",
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
  collection.fields.removeById("bool2866838492")

  // remove field
  collection.fields.removeById("text303074908")

  // remove field
  collection.fields.removeById("text349293717")

  return app.save(collection)
})
