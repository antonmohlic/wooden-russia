/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3482339971")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.verified = true && @request.auth.banned = false && @request.body.author = @request.auth.id && @request.body.status = \"pending\" && @request.body.admin_comment:isset = false && @request.body.reviewed_by:isset = false && @request.body.reviewed_at:isset = false",
    "listRule": "@request.auth.id != \"\" && (author = @request.auth.id || (@request.auth.role = \"admin\" || @request.auth.role = \"moderator\"))",
    "updateRule": "@request.auth.role = \"admin\" || ((@request.auth.role = \"admin\" || @request.auth.role = \"moderator\") && kind != \"delete\")",
    "viewRule": "@request.auth.id != \"\" && (author = @request.auth.id || (@request.auth.role = \"admin\" || @request.auth.role = \"moderator\"))"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3482339971")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.verified = true && @request.body.author = @request.auth.id && @request.body.status = \"pending\" && @request.body.admin_comment:isset = false && @request.body.reviewed_by:isset = false && @request.body.reviewed_at:isset = false",
    "listRule": "@request.auth.id != \"\" && (author = @request.auth.id || @request.auth.role = \"admin\")",
    "updateRule": "@request.auth.role = \"admin\"",
    "viewRule": "@request.auth.id != \"\" && (author = @request.auth.id || @request.auth.role = \"admin\")"
  }, collection)

  return app.save(collection)
})
