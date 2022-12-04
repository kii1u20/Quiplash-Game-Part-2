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

let connected_clients = new Map();
const players = [];
const audience = [];
let clientToSockets = new Map();
let socketsToClients = new Map();
let activePrompts = new Map();
let cloudPrompts = [];
let answersReceived = new Map();
let votesReceived = new Map();
let currentPrompt;
let state = {state: 0};
// let state = {state: 0, players: players, audience: audience, activePrompts: activePrompts, answersReceived: answersReceived, 
            // votesReceived: votesReceived, currentPrompt: currentPrompt};
let admin;

const requestOptions = {
  method: 'POST',
  host: "coursework1-kii1u20.azurewebsites.net",
  headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=UTF-8',
      'x-functions-key': "l43IHsv5a70IUB5iOIOPrCzXrQ9X-BHBtq_YJeuyBh3kAzFu78KTHA=="
  }
};

function azureConnection(requestData, functionToCall) {
  const playerOptions = requestOptions;
  playerOptions.path = "/api/" + functionToCall;

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

function updateAll() {
  console.log("Updating all players");
  for (let [user, socket] of clientToSockets) {
    updatePlayer(user, socket);
  }
}

function updatePlayer(user, socket) {
  console.log("Updating player: " + user);
  const thePlayer = connected_clients.get(user);
  const data = {state: state, me: thePlayer, players: players};
  socket.emit('state', data);
}

function error(socket, message, halt) {
  console.log("Error: " + message);
  socket.emit('fail', message);
  if (halt) {
    socket.disconnect();
  }
}

function handleRegister(user, pass, socket) {
  console.log("Handle register: " + socket);

  const promise = azureConnection({username: user, password: pass}, "/player/register");
  promise.then((res) => {
      console.log(res)
      if (res.result == true) {
        handleGameJoin(user, socket);
      } else {
        error(socket, res.msg, false);
      }
  })
}

function handleLogin(user, pass, socket) {
  console.log("Handle login: " + socket);

  const promise = azureConnection({username: user, password: pass}, "/player/login");
  promise.then((res) => {
      console.log(res)
      if (res.result == true) {
        handleGameJoin(user, socket);
      } else {
        error(socket, res.msg, false);
      }
  })
}

function handleGameJoin(user, socket) {
  if (clientToSockets.has(user) == false) {
    connected_clients.set(user, {name: user, score: 0, state: 0});
    clientToSockets.set(user, socket);
    socketsToClients.set(socket, user);
    if (connected_clients.size <= 8 && state.state == 0) {
      if (players.length == 0) {
        socket.emit('setAdmin');
        admin = socket;
      }
      players.push(user);
      socket.emit('joinedGame');
      updateAll();
    } else {
      audience.push(user);
      socket.emit('joinedGame');
      updateAll();
    }
  } else {
    error(socket, "ERROR: PLAYER IS ALREADY IN THE GAME!", true);
  }
}

function handlePrompt(prompt, password, socket) {
  const promise = azureConnection({username: socketsToClients.get(socket), password: password, text: prompt}, "/prompt/create");
  promise.then((res) => {
      console.log(res)
      if (res.result == true) {
        // if (activePrompts.get(socket) == undefined) {
        //   const list = [];
        //   list.push(prompt);
        //   activePrompts.set(socket, list);
        // } else {
        //   const list = activePrompts.get(socket);
        //   list.push(prompt);
        //   activePrompts.set(socket, list);
        // }
        connected_clients.get(socketsToClients.get(socket)).state = 1;
        updatePlayer(socketsToClients.get(socket), socket);
        console.log(activePrompts.values());
      } else {
        error(socket, res.msg, false);
      }
  })
}
function startPrompt() {

}
function endPrompt() {
  players.forEach(element => {
    connected_clients.get(element).state = 0;
  });
  updateAll();
}

function handleAnswer(info) {
  console.log(info);
}
function startAnswer() {
  console.log("answer started");
  let promise;
  if (players.length % 2 == 0) {
    promise = azureConnection({"prompts": players.length / 2}, "/prompts/get");
  } else {
    promise = azureConnection({"prompts": players.length}, "/prompts/get");
  }
  promise.then((res) => {
      if (res.length > 0) {
        res.forEach(element => {
          cloudPrompts.push(element);
          cloudPrompts.push(element);
        });
        console.log(cloudPrompts.length);
        if (players.length % 2 == 0) {
          for (let i = 0; i < players.length; i++) {
            clientToSockets.get(players[i]).emit('prompt', cloudPrompts[i].text);
          }
        } else {
          var i, j;
          for (i = 0, j = 0; i < players.length; i++, j++) {
            console.log("i: " + i + " " + "j: " + j);
            clientToSockets.get(players[i]).emit('prompt', cloudPrompts[j].text);
            if (i == players.length - 1) {
              console.log("resseting i " + i);
              i = -1;
            }
            if (j == cloudPrompts.length - 1) {
              break;
            }
          }
        }
      } else {
        // error(socket, res.msg, false); //Something else, not at error. Maybe just prompts from the local game?
      }
  })
}
function endAnswer() {

}

function handleVote() {

}
function startVote() {

}
function endVote() {

}

function startResult() {

}
function endResult() {

}

function startScore() {

}
function endScore() {

}

function gameOver() {

}

function handleNext() {
  state.state += 1;
  if (state.state == 1) {
    startPrompt();
  } else if (state.state == 2){
    endPrompt();
    startAnswer();
  } else if (state.state == 3){
    endAnswer();
    startVote();
  } else if (state.state == 4){
    endVote();
    startResult();
  } else if (state.state == 5){
    endResult();
    startScore();
  } else if (state.state == 6){
    endScore();
    gameOver();
  }

  updateAll();
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
    const player = socketsToClients.get(socket);
    const index = players.indexOf(player);
    if (index > -1) {
      players.splice(index, 1);
    } else {
      audience.splice(index, 1);
    }
    clientToSockets.delete(player);
    connected_clients.delete(player);
    socketsToClients.delete(socket);
    if (admin == socket) {
      admin = clientToSockets.get(players[0]);
      if (admin != undefined) {
        admin.emit('setAdmin');
      }
    }
    updateAll();
  });

  socket.on('register', info => {
    handleRegister(info.username, info.password, socket);
  });

  socket.on('login', info => {
    console.log('Username: ' + info.username + ' ' + 'Password: ' + info.password);
    handleLogin(info.username, info.password, socket);
  });

  socket.on('prompt', info => {
    handlePrompt(info.prompt, info.password, socket);
  });

  socket.on('answer', info => {
    handleAnswer(info);
  });

  socket.on('vote', info => {
    handleVote();
  });

  socket.on('next', info => {
    handleNext();
  });
});

//Start server
if (module === require.main) {
  startServer();
}

module.exports = server;
