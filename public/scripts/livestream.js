var socket = io.connect(window.location.hostname);
socket.on('newprogram', function(data){
  console.log(data.js);
  document.getElementById("livecode").innerHTML = data.js;
});
function replaceAll(src,newr,oldr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}