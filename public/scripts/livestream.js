var socket = io.connect(window.location.hostname);
socket.on('newprogram', function(data){
  console.log(data);
  document.getElementById("livecode").innerHTML = data.js;
});