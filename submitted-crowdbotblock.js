var five = require('johnny-five');
var board = new five.Board();
board.on('ready', function(){


(new five.Led(2)).on();
board.wait(1000, function(){
  (new five.Led(2)).off();
});

});