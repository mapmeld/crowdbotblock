var socket = io.connect(window.location.hostname);
socket.on('newprogram', function(data){
  console.log(data);
  document.getElementById("livecode").innerHTML = replaceAll(replaceAll(replaceAll(data.js, "\n", "<br/>"), "<", "&lt;"), ">", "&gt;");
});
function replaceAll(src,newr,oldr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}