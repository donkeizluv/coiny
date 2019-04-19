const express = require("express");
const path = require("path");

module.exports = function(distPath) {
  return express.static(path.join(__dirname, distPath));
};
