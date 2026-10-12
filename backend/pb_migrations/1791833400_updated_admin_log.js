/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2635324712")

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select1204587666",
    "maxSelect": 1,
    "name": "action",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "role",
      "ban",
      "unban",
      "approve",
      "reject",
      "delete_object",
      "edit_object"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2635324712")

  // update field
  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select1204587666",
    "maxSelect": 1,
    "name": "action",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "role",
      "ban",
      "unban",
      "approve",
      "reject",
      "delete_object"
    ]
  }))

  return app.save(collection)
})
