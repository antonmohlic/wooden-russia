/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.body.role:isset = false && @request.body.banned:isset = false && @request.body.ban_reason:isset = false && @request.body.banned_at:isset = false",
    "listRule": "id = @request.auth.id || (@request.auth.role = \"admin\" || @request.auth.role = \"moderator\")",
    "updateRule": "id = @request.auth.id && banned = false && @request.body.role:isset = false && @request.body.banned:isset = false && @request.body.ban_reason:isset = false && @request.body.banned_at:isset = false",
    "viewRule": "id = @request.auth.id || (@request.auth.role = \"admin\" || @request.auth.role = \"moderator\")"
  }, collection)

  // add field
  collection.fields.addAt(11, new Field({
    "help": "",
    "hidden": false,
    "id": "bool2605256118",
    "name": "banned",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(12, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text3875941284",
    "max": 500,
    "min": 0,
    "name": "ban_reason",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(13, new Field({
    "help": "",
    "hidden": false,
    "id": "date3360840220",
    "max": "",
    "min": "",
    "name": "banned_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // update field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "select1466534506",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "user",
      "moderator",
      "admin"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.body.role:isset = false",
    "listRule": "id = @request.auth.id || @request.auth.role = \"admin\"",
    "updateRule": "id = @request.auth.id && @request.body.role:isset = false",
    "viewRule": "id = @request.auth.id || @request.auth.role = \"admin\""
  }, collection)

  // remove field
  collection.fields.removeById("bool2605256118")

  // remove field
  collection.fields.removeById("text3875941284")

  // remove field
  collection.fields.removeById("date3360840220")

  // update field
  collection.fields.addAt(10, new Field({
    "help": "",
    "hidden": false,
    "id": "select1466534506",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "user",
      "admin"
    ]
  }))

  return app.save(collection)
})
