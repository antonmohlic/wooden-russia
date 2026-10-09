/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_987692768")

  // update collection data
  unmarshal({
    "listRule": "draft = false || @request.auth.role = \"admin\"",
    "viewRule": "draft = false || @request.auth.role = \"admin\""
  }, collection)

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "bool1182570132",
    "name": "draft",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_987692768")

  // update collection data
  unmarshal({
    "listRule": "",
    "viewRule": ""
  }, collection)

  // remove field
  collection.fields.removeById("bool1182570132")

  return app.save(collection)
})
