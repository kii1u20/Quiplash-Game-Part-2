'use strict';

//Set up express
const express = require('express');
const https = require('https');
const app = express();

//Setup socket.io
const server = require('http').Server(app);
const io = require('socket.io')(server);

//Setup static page handling
app.set('view engine', 'ejs');
app.use('/static', express.static('public'));

//Handle client interface on /
app.get('/', (req, res) => {
  res.render('client');
}); 
//Handle display interface on /display
app.get('/display', (req, res) => {
  res.render('display');
});

let nextPlayerNum = 0;
let connected_clients = new Map();
let players = new Map();
let audience = new Map();
let clientToSockets = new Map();
let socketsToClients = new Map();
let state = {state: 0};

const requestOptions = {
  method: 'POST',
  host: "coursework1-kii1u20.azurewebsites.net",
  headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=UTF-8',
      'x-functions-key': "l43IHsv5a70IUB5iOIOPrCzXrQ9X-BHBtq_YJeuyBh3kAzFu78KTHA=="
  }
};

function registerPlayer(requestData) {
  const playerOptions = requestOptions;
  playerOptions.path = "/api/player/register"

  return new Promise((resolve, reject) => {
      const request = https.request(playerOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => {
              data += chunk;
          })

          res.on('close', () => {
              resolve(JSON.parse(data))
          })

          res.on('error', (error) => {
              reject(error)
          })
      });

      request.write(JSON.stringify(requestData));
      request.end()
  });
}

//Start the server
function startServer() {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

//Chat message
function handleChat(message) {
    console.log('Handling chat: ' + message); 
    io.emit('chat',message);
}

function handleRegister(user, pass, socket) {
  console.log("Handle register: " + socket);

  const promise = registerPlayer({username: user, password: pass})
  promise.then((res) => {
      console.log(res)
      if (res.result == true) {
        nextPlayerNum++;
        connected_clients.set(nextPlayerNum, {name: user, score: 0});
        clientToSockets.set(nextPlayerNum, socket);
        socketsToClients.set(socket, nextPlayerNum);
        if (connected_clients.size <= 8) {
          players.set(nextPlayerNum , {name: user, score: 0});
        }
        console.log("register successfull!");
        console.log(connected_clients);
        console.log(clientToSockets);
        console.log(socketsToClients);
        console.log(players);
      }
  })

}

//Handle new connection
io.on('connection', socket => { 
  console.log('New connection');

  //Handle on chat message received
  socket.on('chat', message => {
    handleChat(message);
  });

  //Handle disconnection
  socket.on('disconnect', () => {
    console.log('Dropped connection');
  });

  socket.on('register', info => {
    handleRegister(info.username, info.password, socket);
  });
});

//Start server
if (module === require.main) {
  startServer();
  
  handleRegister("test", "test1234", null);

}

module.exports = server;
