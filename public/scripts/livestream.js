var socket = io.connect('http://crowdbotblock.herokuapp.com:8080');
socket.on('newprogram', function(data){
  console.log(data);
  document.getElementById("livecode").innerHTML = data.js;
});