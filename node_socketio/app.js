var express = require('express'),
    app = express();

var redis = require('redis').createClient(3010);

var http = require('http').Server(app);
var io = require('socket.io')(http);

var Promise = require('promise');
var crypto = require('crypto');

app.get('/', function(req, res){
  res.sendfile('index.html');
});

var createToken = function(length) {
  return crypto.randomBytes(Math.floor(length / 2)).toString('hex')
};

var create_new_socket_id = function() {
  return createToken(10);
};

var socket_leave_channel = function(socket) {
  return new Promise(function(resolve, reject) {
    redis.get(socket, function(error, channel) {
      if (channel !== null) {
        console.log('leaving channel ' + channel);
        socket.leave(channel);
      }
      resolve();
    });
  });
};

var socket_join_channel = function(socket, channel) {
  return new Promise(function(resolve, reject) {
    redis.set(socket, channel);
    console.log('joining channel ' + channel);
    socket.join(channel);
    resolve();
  });
};

var add_socket_to_redis = function(socket, id) {
  redis.get(id, function(error, data) {
    redis.set(id, socket);
  });

  redis.set(socket, id);
};

var remove_socket_from_redis = function(socket) {
  redis.get(socket, function(error, id) {
    if (id !== null) {
      console.log('removing id from redis');
      redis.del(id);
    }
    console.log('removing socket from redis');
    redis.del(socket);
  });
};

var is_registered = function(socket) {

};

io.on('connection', function(socket){
  console.log('a socket connected');
  /*socket.on('register', function(message) {
    console.log('register');
    socket_id = create_new_socket_id();
    add_socket_to_redis(socket_id, socket)
    socket.emit('newId', socket_id);
  });*/
  socket.on('join', function(channel) {
    socket_leave_channel(socket).then(function(){
      console.log('left channel');
      socket_join_channel(socket, channel);
    });

    socket.on('broadcast', function(message) {
      console.log('broadcast');
      io.to(channel).emit('broadcast', message);
    });
  });
  socket.on('foo', function() {
    socket.emit('bar');
  });
  socket.on('disconnect', function() {
    //remove_socket_from_redis(socket);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});