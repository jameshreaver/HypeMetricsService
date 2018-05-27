"use strict"

const express = require('express');
const bodyParser = require('body-parser');
const nedb = require('nedb');

const portPOST = 80;
const portGET = 4888;

const serverPOST = createServer(portPOST);
const serverGET = createServer(portGET);

function createServer(port) {
  var server = express();
  server.use(bodyParser.json());
  server.listen(port, () => {
    console.log(`Listening on port ${port}`)
  });
  return server;
}

var db = new nedb({
  filename: './db/metrics.db',
  autoload: true
});

serverGET.get('/', (req, res) => {
  res.end();
});

serverGET.get('/:id', (req, res) => {
  db.find({"exp-id":req.params.id}, {_id: 0})
    .exec(function (err, docs) {
    res.send(docs);
  });
});

serverPOST.post('/', (req, res) => {
  db.findOne({
    "exp-id": req.body["exp-id"],
    "type": req.body["type"],
    "elem": req.body["elem"],
  }).exec(function (err, doc) {
    var date = new Date(req.body["time"]).toLocaleDateString('en-GB');
    if (doc) {
      var field = "data." + date + "." + req.body["vers-id"];
      db.update(doc, { $inc: { [field]: 1 } }, {}, function () {});
    } else {
      var vers = req.body["vers-id"];
      db.insert({
        "exp-id": req.body["exp-id"],
        "type": req.body["type"],
        "elem": req.body["elem"],
        "data": {[date]: {[vers]: 1}}
      });
    }
  });
  res.end();
  db.persistence.compactDatafile();
});
