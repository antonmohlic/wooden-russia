/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\" && @request.auth.verified = true && @request.body.author = @request.auth.id && @request.body.status = \"pending\" && @request.body.admin_comment:isset = false && @request.body.reviewed_by:isset = false && @request.body.reviewed_at:isset = false",
    "deleteRule": "(author = @request.auth.id && status = \"pending\") || @request.auth.role = \"admin\"",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_592032537",
        "help": "",
        "hidden": false,
        "id": "relation2829954028",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "object",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": true,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation3182418120",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "author",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3133994713",
        "max": 255,
        "min": 0,
        "name": "author_name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date2386997271",
        "max": "",
        "min": "",
        "name": "visited_on",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select3184953411",
        "maxSelect": 1,
        "name": "condition",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "хорошее",
          "удовлетворительное",
          "плохое",
          "аварийное",
          "руины"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text999008199",
        "max": 3000,
        "min": 0,
        "name": "text",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "file142008537",
        "maxSelect": 5,
        "maxSize": 8388608,
        "mimeTypes": [
          "image/jpeg",
          "image/png",
          "image/webp"
        ],
        "name": "photos",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [
          "600x0",
          "240x240"
        ],
        "type": "file"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "pending",
          "approved",
          "rejected"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1346949349",
        "max": 2000,
        "min": 0,
        "name": "admin_comment",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation2245524295",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "reviewed_by",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date3494630457",
        "max": "",
        "min": "",
        "name": "reviewed_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3965263790",
    "indexes": [],
    "listRule": "status = \"approved\" || (@request.auth.id != \"\" && (author = @request.auth.id || @request.auth.role = \"admin\"))",
    "name": "observations",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.role = \"admin\"",
    "viewRule": "status = \"approved\" || (@request.auth.id != \"\" && (author = @request.auth.id || @request.auth.role = \"admin\"))"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3965263790");

  return app.delete(collection);
})
