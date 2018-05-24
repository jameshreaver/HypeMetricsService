"use strict"

const express = require('express');
const bodyParser = require('body-parser');
const nedb = require('nedb');

const app = express();
const port = process.env.PORT || 80;
app.use(bodyParser.json())

var db = new nedb({
  filename: './db/metrics.db',
  autoload: true
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
});

app.get('/', (req, res) => {
  db.find({}).exec(function (err, docs) {
    res.send(docs);
  });
});

app.post('/', (req, res) => {
  res.end();
  db.insert(req.body);
  db.persistence.compactDatafile();
});
