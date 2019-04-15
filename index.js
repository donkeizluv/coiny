/* eslint-disable no-console */
const path = require("path");
const express = require("express");
const compression = require("compression");
const bodyParser = require("body-parser");
const url = require("url");
const request = require("request");
const port = process.env.PORT || 3000;

let app = express();
app.use(compression({ filter: shouldCompress }));
app.use(express.static(path.join(__dirname, "/dist")));
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);
app.use("/p", function(req, res) {
  let { query } = req;
  if (!query.hasOwnProperty("url")) {
    res.sendStatus(404);
    return;
  }
  let uri = url.parse(query.url);
  if (!uri.protocol || !uri.host || !uri.path) {
    res.sendStatus(404);
    return;
  }
  console.log(`${new Date()} - Forwarding: ${query.url}`);
  res.removeHeader("Transfer-Encoding");
  res.removeHeader("X-Powered-By");
  res.append("Access-Control-Allow-Origin", ["*"]);
  req.pipe(request(req.query.url)).pipe(res);
});

app.listen(port);
console.log(`${new Date()} - App started on ${port}...`);

function shouldCompress(req, res) {
  if (req.headers["x-no-compression"]) {
    // don't compress responses with this request header
    return false;
  }
  // fallback to standard filter function
  return compression.filter(req, res);
}
