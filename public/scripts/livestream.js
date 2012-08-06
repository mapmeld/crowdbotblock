var socket = io.connect(window.location.hostname);
socket.on('newprogram', function(data){
  //console.log(data.js);
  document.getElementById("codecontainer").innerHTML = "<pre id='livecode' class='brush: js'>" + data.js + "</pre>";
  setTimeout(function(){
    SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
  }, 250);
});
socket.on('newdata', function(data){
  console.log(data.info);
  var line = document.createElement("li");
  line.innerHTML = data.info.info;
  document.getElementById("livedata").appendChild(line);
});
setTimeout(function(){
  SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
  SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
}, 250);