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

var five = require('johnny-five');
var board = new five.Board();
board.on('ready', function(){


console.log('LightShow');
(new five.Led(2)).on();
board.wait(750, function(){
  (new five.Led(4)).on();
  board.wait(750, function(){
    (new five.Led(6)).on();
    board.wait(750, function(){
      (new five.Led(8)).on();
      board.wait(750, function(){
        (new five.Led(10)).on();
        board.wait(750, function(){
          (new five.Led(8)).off();
        });
      });
    });
  });
});

});