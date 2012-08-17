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
var fs = null;
//var process = null;
var prompt = null;
//var util = null;
var http = null;
var child_process = null;

var five = require('johnny-five');
var board = new five.Board();
board.on('ready', function(){


var bumper0 = new five.Button(0);
bumper0.on("hit", function(){
  (new five.Led(2)).on();
  (new five.Led(3)).off();
}).on("release", function(){
  (new five.Led(3)).on();
  (new five.Led(2)).off();

});(new five.Led(13)).strobe();

});