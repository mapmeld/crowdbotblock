var console = {
  log: function(info){
    var querystring = require("querystring");
    var post_data = querystring.stringify({
      info: info
    });
    var options = {
      host: "crowdbotblock.herokuapp.com",
      port: 80,
      path: '/speak',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
      }
    };
    var http = require("http");
    var req = http.request(options, null);
    req.write(post_data);
    req.end();
  }
};
setTimeout(function(){
  process.exit(code=0);
}, 60000);
var fs = null;
var process = null;
var prompt = null;
var util = null;
var http = null;
var child_process = null;

var five = require('johnny-five');
var board = new five.Board();
board.on('ready', function(){


(new five.Led(5)).strobe();

});