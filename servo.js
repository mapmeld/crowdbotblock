var five = require('johnny-five');
var board = new five.Board();
board.on('ready', function(){
 
 
console.log('Move Servo');
var servo9 = new five.Servo(9);
board.repl.inject({servo: servo9});
servo9.move(90);
board.wait(1500, function(){
  servo9.move(1);
});
 
});

