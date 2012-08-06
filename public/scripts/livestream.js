var socket = io.connect('http://crowdbotblock.herokuapp.com');
socket.on('newprogram', function(data){
  console.log(data);
  document.getElementById("livecode").innerHTML = escape(data.js);
});