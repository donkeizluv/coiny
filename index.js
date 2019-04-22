/* eslint-disable no-console */
const express = require("express");
const bodyParser = require("body-parser");
const port = process.env.PORT || 3000;
const path = require("path");

let app = express();
// add middlewares and stuff
app.use(require("./middlewares/compression"));
app.use(require("./middlewares/cors"));
app.use(require("./middlewares/static")(path.join(__dirname, "/dist")));
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);

// add routes
app.use("/auth", require("./controllers/auth"));
app.use("/p", require("./controllers/proxy"));
//start
app.listen(port);
console.log(`${new Date()} - App started on ${port}...`);
