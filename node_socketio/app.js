var express = require('express'),
    app = express();

var redis = require('redis').createClient(3310);

var http = require('http').Server(app);
var io = require('socket.io').listen(http, { path: '/socket.io' });

var Promise = require('promise');

var socket_leave_channel = function(socket) {
  return new Promise(function(resolve, reject) {
    redis.get(socket, function(error, channel) {
      if (channel !== null) {
        socket.leave(channel);
      }
      resolve();
    });
  });
};

var socket_join_channel = function(socket, channel) {
  return new Promise(function(resolve, reject) {
    redis.set(socket, channel);
    socket.join(channel);
    resolve();
  });
};

var socket_remove = function(socket) {
  redis.del(socket);
}

io.on('connection', function(socket){
  socket.on('join', function(channel) {
    // promise to ensure no race conditions
    // leaves the channel that the socket was in
    // joins the new channel (channel is a socket.io namespace)
    socket_leave_channel(socket).then(function(){
      socket_join_channel(socket, channel);
    });

    // currently the 'remote' uses broadcast to communicate
    // with the video player.  This just echos the broadcast to the namespace.
    socket.on('broadcast', function(message) {
      io.to(channel).emit('broadcast', message);
    });
  });
  
  socket.on('disconnect', function() {
    // removes the socket data from redis so we dont use too much memory
    socket_remove(socket);
  });
});

http.listen(3300, function(){
  console.log('listening on *:3300');
});
