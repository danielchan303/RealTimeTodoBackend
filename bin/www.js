#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('backend:server');
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3001');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

var io = require('socket.io')(server);
var TodoList = require("../models/TodoList");

const authenticate = async function (socket, data, callback) {
  console.log("A user connect to the server");
  //get credentials sent by the client
  admin.auth().verifyIdToken(data.token).then(payload => {
    console.log("client authenticated");
    socket.payload = payload;
    return callback(null, true);
  }).catch(error => {
    console.log("wrong token");
    return callback(new Error("Expired or invalid token"));
  });
};

const postAuthenticate = async (socket, data) => {
  // join the room of its own
  const userId = socket.payload.sub;
  socket.join(userId);
  
  // disconnect the the token expire
  const expireIn = socket.payload.exp * 1000 - Date.now();
  setTimeout(() => {
    socket.disconnect(true);
  }, expireIn);

  // when client disconnect
  socket.on('disconnect', (reason) => {
    console.log("client disconnect, reason: ", reason);
  });

  // send the todo lists to client
  const todoLists = await TodoList.findTodoListByOwnerId(userId);
  if (todoLists) {
    socket.emit('GET_TODO_LISTS', todoLists);
  }

  // create Todo list
  socket.on('CREATE_TODO_LIST', async (listId, name) => {
    console.log(listId);
    const newList = await TodoList.createTodoList(userId, listId, name);
    if (newList) {
      // Inform clients the change
      socket.to(userId).emit('CREATE_TODO_LIST', newList);
    }
  });

  // delete Todo List
  socket.on('DELETE_TODO_LIST', async (listId) => {
    console.log('delete', listId);
    const deleteList = await TodoList.deleteTodoList(listId, userId);
    if (deleteList) {
      socket.to(userId).emit('DELETE_TODO_LIST', listId);
    }
  });

  // change list title
  socket.on('CHANGE_TODO_LIST_NAME', async (listId, name) => {
    clearTimeout(socket.saveTimeout);
    socket.saveTimeout = setTimeout(async () => {
      await TodoList.changeTodoListName(listId, name, userId);
    }, 3000);
    socket.to(userId).emit('CHANGE_TODO_LIST_NAME', listId, name);
  });

  // add list item
  socket.on('CREATE_LIST_ITEM', async (listId, itemId, text) => {
    const newListItem = await TodoList.newListItem(listId, itemId, text, userId);
    socket.to(userId).emit('CREATE_LIST_ITEM', { listId, itemId, item: newListItem });
  });

  // delete list item
  socket.on('DELETE_LIST_ITEM', async (listId, itemId) => {
    await TodoList.deleteListItem(listId, itemId, userId);
    socket.to(userId).emit('DELETE_LIST_ITEM', { listId: listId, itemId: itemId });
  });

  // change list item checked state
  socket.on('CHANGE_LIST_ITEM_CHECKED', async (listId, itemId, checked) => {
    await TodoList.changeListItemChecked(listId, itemId, checked, userId);
    socket.to(userId).emit('CHANGE_LIST_ITEM_CHECKED', { listId, itemId, checked });
  });

  // change list item text
  socket.on('CHANGE_LIST_ITEM_TEXT', async (listId, itemId, text) => {
    clearTimeout(socket.saveItemTextTimeout);
    socket.saveItemTextTimeout = setTimeout(async () => {
      await TodoList.changeListItemText(listId, itemId, text, userId);
    }, 3000);
    socket.to(userId).emit('CHANGE_LIST_ITEM_TEXT', { listId, itemId, text });
  });
};

io.on('connect', (socket) => {
  io.clients((error, clients) => {
    console.log('clients' , clients);
  });
});

var admin = require('../firebase');
// set authorization for socket.io
require('socketio-auth')(io, {
  authenticate: authenticate,
  postAuthenticate: postAuthenticate
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
