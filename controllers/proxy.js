const express = require("express");
const router = express.Router();
const url = require("url");
const request = require("request");

router.get("/", function(req, res) {
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
  // console.log(`${new Date()} - Forwarding: ${query.url}`);
  try {
    res.removeHeader("Transfer-Encoding");
    res.removeHeader("X-Powered-By");
    req.pipe(request(req.query.url)).pipe(res);
  } catch (error) {
    // console.log(error);
  }
});

module.exports = router;
