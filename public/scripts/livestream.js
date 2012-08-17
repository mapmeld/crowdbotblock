if(getURLParameter("id") != "null"){
  document.getElementById("wait").style.display = "block";
  document.getElementById("myblockview").href = "/blockly/demos/code/index.html?id=" + getURLParameter("id");
  document.getElementById("myblocktweet").src = "//platform.twitter.com/widgets/tweet_button.html?url=" + encodeURIComponent("http://crowdbotblock.herokuapp.com/livestream?id=" + getURLParameter("id")) + "&text=Tweet%20Your%20Program";
  if(nowid != getURLParameter("id")){
    document.getElementById("wait-inner").innerHTML = "Program is loaded.";
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
  document.getElementById("codename").innerHTML = data.name;
  document.getElementById("codecontainer").innerHTML = "<pre id='livecode' class='brush: js'>" + data.js + "</pre>";
  document.getElementById("blockview").href = "/blockly/demos/code/index.html?id=" + data.id;
  document.getElementById("blocktweet").src = "//platform.twitter.com/widgets/tweet_button.html?url=" + encodeURIComponent("http://crowdbotblock.herokuapp.com/livestream?id=" + getURLParameter("id")) + "&text=Tweet%20this%20Program";

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