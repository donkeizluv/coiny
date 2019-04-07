const path = require('path')
const express = require('express');
const compression = require('compression')
const bodyParser = require('body-parser')

var app = express();
app.use(compression({ filter: shouldCompress }))
app.use(express.static(path.join(__dirname, '/dist')));
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

// app.post('/alert', function(req, res) {
//     alert(req.body.symbol, req.body.value, req.body.hash);
//     res.status(200).end();
// });

app.listen(process.env.PORT || 3000);
console.log("App started...");
// opn('http://localhost:3000');


function shouldCompress (req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false
  }

  // fallback to standard filter function
  return compression.filter(req, res)
}
// function alert(symbol, value, hash) {
//     // const vbs = spawn( 'cscript.exe', [ './msgBox.vbs', symbol, value, "https://etherscan.io/tx/" + hash ], {detached: true, stdio: 'ignore'});
//     // vbs.unref();
// }
