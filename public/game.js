var socket = null;

//Prepare game
var app = new Vue({
    el: '#game',
    data: {
        connected: false,
        prompts: [],
        prompt: '',
        me: {name: '', score: 0, state: 0},
        state: {state: 0},
        players: [],
        loggedIn: false,
        isAdmin: false,
        password: '',
        currentPromptIndex: 0,
        answer: ''
    },
    mounted: function() {
        connect(); 
    },
    methods: {
        handleChat(message) {
            if(this.messages.length + 1 > 10) {
                this.messages.pop();
            }
            this.messages.unshift(message);
        },
        chat() {
            socket.emit('chat',this.chatmessage);
            this.chatmessage = '';
        },
        login(username, password) {
            socket.emit('login', {username: username, password: password});
            this.password = password;
        },
        register(username, password) {
            socket.emit('register', {username: username, password: password});
        },
        updateState(state) {
            this.me = state.me;
            this.state = state.state;
            this.players = state.players;
        },
        startGame() {
            socket.emit('next');
        },
        next() {
            socket.emit('next');
        },
        handlePrompt() {
            socket.emit('prompt', {prompt: this.prompt, password: this.password});
        },
        handleAnswer() {
            socket.emit('answer', {prompt: this.prompts[this.currentPromptIndex], answer: this.answer, username: this.me.name});
        },
        advancePrompt() {
            this.currentPromptIndex++;
            this.me.state = 0;
        },
        vote(index) {
            socket.emit('vote', this.prompts[Object.keys(this.prompts)[this.currentPromptIndex]][index]);
            this.currentPromptIndex++;
        }
    }
});

function connect() {
    //Prepare web socket
    socket = io();

    //Connect
    socket.on('connect', function() {
        //Set connected state to true
        app.connected = true;
    });

    //Handle connection error
    socket.on('connect_error', function(message) {
        alert('Unable to connect: ' + message);
    });

    //Handle disconnection
    socket.on('disconnect', function() {
        alert('Disconnected');
        app.connected = false;
    });

    //Handle incoming chat message
    socket.on('prompt', function(message) {
        app.prompts.push(message);
    });

    socket.on('state', function(message) {
        app.updateState(message);
    });

    socket.on('joinedGame', function() {
        app.loggedIn = true;
    });

    socket.on('setAdmin', function() {
        app.isAdmin = true;
    });

    socket.on('fail', function(message) {
        alert('Error: '+ message);
    });

    socket.on('voting' , function(message) {
        app.prompts = JSON.parse(message);
        app.currentPromptIndex = 0;
    });
}
