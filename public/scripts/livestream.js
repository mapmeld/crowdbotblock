if(getURLParameter("id") != "null"){
  document.getElementById("wait").style.display = "block";
  document.getElementById("myblockview").href = "/blockly/demos/code/index.html?id=" + getURLParameter("id");
  document.getElementById("myblocktweet").src = "//platform.twitter.com/widgets/tweet_button.html?url=" + encodeURIComponent("http://crowdbotblock.herokuapp.com/livestream?id=" + getURLParameter("id")) + "&text=See%20my%20program%20run%20on%20a%20livestreamed%20Arduino%20robot!%20";
  if(nowid == getURLParameter("id")){
    document.getElementById("wait-inner").innerHTML = "Program is running.";
  }
}
document.getElementById("blocktweet").src = "//platform.twitter.com/widgets/tweet_button.html?url=" + encodeURIComponent("http://crowdbotblock.herokuapp.com/livestream?id=" + nowid) + "&text=Drop%20code%20into%20a%20livestreamed%20Arduino%20robot!%20";

function getURLParameter(name) {
  return decodeURIComponent(
    (location.search.match(RegExp("[?|&]"+name+'=(.+?)(&|$)'))||[,null])[1]
  );  
}

var socket = io.connect(window.location.hostname);
socket.on('newprogram', function(data){
  console.log(data);
  if(getURLParameter("id") != "null"){
    if(data.id == getURLParameter("id")){
      document.getElementById("wait").style.display = "none";
    }
  }
  if(data.js && data.js.length){
    document.getElementById("codecontainer").style.display = "block";
    document.getElementById("wiringcontainer").style.display = "none";    
    document.getElementById("codecontainer").innerHTML = "<pre id='livecode' class='brush: js'>" + data.js + "</pre>";
    document.getElementById("blockview").style.display = "block";
    document.getElementById("blockview").href = "/blockly/demos/code/index.html?id=" + data.id;
  }
  else{
    document.getElementById("codecontainer").style.display = "none";
    document.getElementById("wiringcontainer").style.display = "block";
    document.getElementById("wiringcontainer").innerHTML = "<pre id='livewiring' class='brush: c'>" + data.wiring + "</pre>";
    document.getElementById("blockview").style.display = "none";
  }

  document.getElementById("codename").innerHTML = data.name;
  document.getElementById("blocktweet").src = "//platform.twitter.com/widgets/tweet_button.html?url=" + encodeURIComponent("http://crowdbotblock.herokuapp.com/livestream?id=" + data.id) + "&text=Drop%20code%20into%20a%20livestreamed%20Arduino%20robot!%20";

  setTimeout(function(){
    if(data.js && data.js.length){
      SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
    }
    else{
      SyntaxHighlighter.highlight(document.getElementById("livewiring"),document.getElementById("livewiring"));    
    }
  }, 250);
});
socket.on('newdata', function(data){
  console.log(data.info);
  var line = document.createElement("li");
  line.innerHTML = data.info;
  document.getElementById("livedata").appendChild(line);
});
setTimeout(function(){
  if(document.getElementById("livecode").style.display == "block"){
    SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
    SyntaxHighlighter.highlight(document.getElementById("livecode"),document.getElementById("livecode"));
  }
  else{
    SyntaxHighlighter.highlight(document.getElementById("livewiring"),document.getElementById("livewiring"));
    SyntaxHighlighter.highlight(document.getElementById("livewiring"),document.getElementById("livewiring"));
  }
}, 250);