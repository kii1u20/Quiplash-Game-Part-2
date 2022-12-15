var socket = null;

//Prepare game
var app = new Vue({
    el: '#game',
    data: {
        connected: false,
        prompts: [],
        prompt: '',
        me: {name: '', score: 0, state: 0},
        state: {state: 0, round: 0},
        players: [],
        loggedIn: false,
        isAdmin: false,
        password: '',
        currentPromptIndex: 0,
        lastPromptIndex: 0,
        answer: '',
        scores: {}
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
            if (state.state.round != this.state.round && this.state.round != 0) {
                this.reset();
            }
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
            emit = {};
            emit["vote"] = {'username' : this.me.name, 'vote' : this.prompts[Object.keys(this.prompts)[this.currentPromptIndex]][index]};
            emit["prompt"] = Object.keys(this.prompts)[this.currentPromptIndex];
            emit["answer1"] = this.prompts[Object.keys(this.prompts)[this.currentPromptIndex]][0];
            emit["answer2"] = this.prompts[Object.keys(this.prompts)[this.currentPromptIndex]][1];
            socket.emit('vote', emit);
            this.me.state = 1;

            this.currentPromptIndex++;

            for (this.currentPromptIndex; this.currentPromptIndex < Object.keys(this.prompts).length; this.currentPromptIndex++) {
                if (!answeredByUser(this.prompts[Object.keys(this.prompts)[this.currentPromptIndex]])) {
                    this.lastPromptIndex = this.currentPromptIndex;
                    break;
                }
            }
        },
        reset() {
            this.prompts = [];
            this.prompt = '';
            this.currentPromptIndex = 0;
            this.lastPromptIndex = 0;
            this.answer = '';
        },
        resetGame() {
            console.log('resetGame');
            socket.emit('resetGame', {});
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

        for (app.currentPromptIndex; app.currentPromptIndex < Object.keys(app.prompts).length; app.currentPromptIndex++) {
            if (!answeredByUser(app.prompts[Object.keys(app.prompts)[app.currentPromptIndex]])) {
                app.lastPromptIndex = app.currentPromptIndex;
                break;
            }
        }
    });

    socket.on('result', function(message) {
        console.log(message);
        app.prompts = message;
        app.currentPromptIndex = 0;
    });

    socket.on('scores', function(message) {
        app.scores = message;
    });
}

function answeredByUser(answers) {
    for (let element of answers) {
        if (Object.keys(element)[0] == app.me.name) {
            return true;
        } else {
            continue;
        }
    }
    return false;
}
