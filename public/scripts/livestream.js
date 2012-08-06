var socket = io.connect('http://crowdbotblock.herokuapp.com');
socket.on('code', function (data) {
  console.log(data);
  socket.emit('special', { my: 'data' });
});