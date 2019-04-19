const express = require("express");
const router = express.Router();
const pwd = "cubu";

router.post("/", function(req, res) {
  if (req.body.pwd === pwd) {
    res.sendStatus(200);
  }
  res.sendStatus(401);
});

module.exports = router;
