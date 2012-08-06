var socket = io.connect(window.location.hostname);
socket.on('newprogram', function(data){
  //console.log(data.js);
  document.getElementById("codecontainer").innerHTML = "<pre id='livecode' class='brush: js'>" + data.js + "</pre>";
  setTimeout(SyntaxHighlighter.all, 250);
});
SyntaxHighlighter.all();