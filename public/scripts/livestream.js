if(getURLParameter("id") != "null"){
  document.getElementById("myblockview").href = "/blockly/demos/code/index.html?id=" + getURLParameter("id");
  if(nowid != getURLParameter("id")){
    document.getElementById("wait").style.display = "block";
  }
}

function getURLParameter(name) {
  return decodeURIComponent(
    (location.search.match(RegExp("[?|&]"+name+'=(.+?)(&|$)'))||[,null])[1]
  );  
}

var socket = io.connect(window.location.hostname);
socket.on('newprogram', function(data){
  //console.log(data.js);
  if(getURLParameter("id") != "null"){
    if(data.id == getURLParameter("id")){
      document.getElementById("wait").style.display = "none";
    }
  }
  document.getElementById("codecontainer").innerHTML = "<pre id='livecode' class='brush: js'>" + data.js + "</pre>";
  setTimeout(function(){
    SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
  }, 250);
});
socket.on('newdata', function(data){
  console.log(data.info);
  var line = document.createElement("li");
  line.innerHTML = data.info;
  document.getElementById("livedata").appendChild(line);
});
setTimeout(function(){
  SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
  SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
}, 250);