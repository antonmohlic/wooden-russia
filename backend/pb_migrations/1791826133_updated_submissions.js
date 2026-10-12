/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3482339971")

  // add field
  collection.fields.addAt(13, new Field({
    "help": "",
    "hidden": false,
    "id": "file229541092",
    "maxSelect": 1,
    "maxSize": 8388608,
    "mimeTypes": [
      "image/jpeg",
      "image/png",
      "image/webp"
    ],
    "name": "photo_file",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [
      "600x0"
    ],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3482339971")

  // remove field
  collection.fields.removeById("file229541092")

  return app.save(collection)
})
