/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3482339971")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.verified = true && @request.body.author = @request.auth.id && @request.body.status = \"pending\" && @request.body.admin_comment:isset = false && @request.body.reviewed_by:isset = false && @request.body.reviewed_at:isset = false"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3482339971")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.body.author = @request.auth.id && @request.body.status = \"pending\" && @request.body.admin_comment:isset = false && @request.body.reviewed_by:isset = false && @request.body.reviewed_at:isset = false"
  }, collection)

  return app.save(collection)
})
