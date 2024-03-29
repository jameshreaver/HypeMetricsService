"use strict"

const express = require('express');
const bodyParser = require('body-parser');
const database = require('nedb');

const portPOST = 80;
const portGET = 4888;

const serverPOST = createServer(portPOST);
const serverGET = createServer(portGET);

const visitTimout = 60; //minutes
const interval = 1000 * 60 * visitTimout;

function createServer(port) {
  var server = express();
  server.use(bodyParser.json());
  server.listen(port, () => {
    console.log(`Listening on port ${port}`)
  });
  return server;
}

var db = new database({
  filename: './db/metrics.db',
  autoload: true
});

var vdb = new database({
  filename: './db/visits.db',
});

vdb.loadDatabase(function (err) {
  setInterval(processVisits, interval);
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
  let metric = req.body;
  if (metric["type"] === "clicksvisit"
   || metric["type"] === "conversion") {
    saveVisit(metric);
  } else {
    saveMetric(metric);
  }
  res.end();
});

function saveMetric(metric) {
  db.findOne({
    "exp-id": metric["exp-id"],
    "type": metric["type"],
    "elem": metric["elem"]
  }).exec(function (err, doc) {
    updateMetric(metric, doc);
  });
  db.persistence.compactDatafile();
}

function updateMetric(metric, doc) {
  let date = new Date(metric["time"])
    .toLocaleDateString('en-US');
  let field = "data." + date +
    "." + metric["vers-id"];
  let value = metric["value"];
  let update = (value === undefined) ? {
    $inc: { [field+".count"]: 1 }
  } : { $inc: {
    [field+".count"]: 1,
    [field+".value"]: (metric["type"] === "conversion")
      ? Math.max(value, 1) : value
  }};
  db.update({
    "exp-id": metric["exp-id"],
    "type": metric["type"],
    "elem": metric["elem"]
  }, update, { upsert:true });
}

function saveVisit(metric) {
  vdb.findOne({
    "visit-id": metric["visit-id"],
    "exp-id": metric["exp-id"],
    "type": metric["type"],
    "elem": metric["elem"],
  }).exec(function (err, visit) {
    if (visit) {
      updateVisit(metric, visit);
    } else {
      insertVisit(metric);
    }
  });
  db.persistence.compactDatafile();
}

function insertVisit(metric) {
  vdb.insert({
    "visit-id": metric["visit-id"],
    "vers-id": metric["vers-id"],
    "exp-id": metric["exp-id"],
    "type": metric["type"],
    "elem": metric["elem"],
    "time": metric["time"],
    "value": 0
  });
}

function updateVisit(metric, visit) {
  vdb.update(visit, {
    $inc: { "value": 1 },
    $max: { "time": metric["time"] }
  }, {}, function () {});
}

function processVisits() {
  console.log("Processing visits");
  vdb.find({}).exec(function(err, visits) {
    visits.forEach(function(visit) {
      processVisit(visit);
    })
  })
  vdb.persistence.compactDatafile();
}

function processVisit(visit) {
  let metric = {
    "vers-id": visit["vers-id"],
    "exp-id": visit["exp-id"],
    "type": visit["type"],
    "elem": visit["elem"],
    "time": visit["time"],
    "value": visit["value"]
  };
  saveMetric(metric);
  vdb.remove(visit, { multi:true });
}
