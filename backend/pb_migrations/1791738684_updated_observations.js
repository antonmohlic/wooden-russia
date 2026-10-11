/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3965263790")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.verified = true && @request.auth.banned = false && @request.body.author = @request.auth.id && @request.body.status = \"pending\" && @request.body.admin_comment:isset = false && @request.body.reviewed_by:isset = false && @request.body.reviewed_at:isset = false",
    "listRule": "status = \"approved\" || (@request.auth.id != \"\" && (author = @request.auth.id || (@request.auth.role = \"admin\" || @request.auth.role = \"moderator\")))",
    "updateRule": "(@request.auth.role = \"admin\" || @request.auth.role = \"moderator\")",
    "viewRule": "status = \"approved\" || (@request.auth.id != \"\" && (author = @request.auth.id || (@request.auth.role = \"admin\" || @request.auth.role = \"moderator\")))"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3965263790")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.verified = true && @request.body.author = @request.auth.id && @request.body.status = \"pending\" && @request.body.admin_comment:isset = false && @request.body.reviewed_by:isset = false && @request.body.reviewed_at:isset = false",
    "listRule": "status = \"approved\" || (@request.auth.id != \"\" && (author = @request.auth.id || @request.auth.role = \"admin\"))",
    "updateRule": "@request.auth.role = \"admin\"",
    "viewRule": "status = \"approved\" || (@request.auth.id != \"\" && (author = @request.auth.id || @request.auth.role = \"admin\"))"
  }, collection)

  return app.save(collection)
})
