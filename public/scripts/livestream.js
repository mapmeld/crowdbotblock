var socket = io.connect(window.location.hostname);
socket.on('newprogram', function(data){
  //console.log(data.js);
  document.getElementById("livecode").innerHTML = data.js;
  SyntaxHighlighter.all();
});
SyntaxHighlighter.all();