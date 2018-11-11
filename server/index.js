const express = require('express');
const opn = require('opn');
const bodyParser = require('body-parser')
const { spawn } = require( 'child_process' )

var app = express();
app.use(express.static('dist'));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.post('/alert', function(req, res) {
    alert(req.body.symbol, req.body.value, req.body.hash);
    res.status(200).end();
});

app.listen(3000);
console.log("App started at: localhost:3000");
opn('http://localhost:3000');



function alert(symbol, value, hash) {
    const vbs = spawn( 'cscript.exe', [ './msgBox.vbs', symbol, value, "https://etherscan.io/tx/" + hash ], {detached: true, stdio: 'ignore'});
    vbs.unref();
}
