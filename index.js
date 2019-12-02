const app = require('express')()
const server = require('http').Server(app)
const router = require('./router')
const io = require('socket.io')(server)
const PORT = process.env.PORT || 4000
const { addUser, removeUser, getUser, getUsersInRoom, addToChatHistory, getChatHistory } = require('./users')


io.on('connection', (socket) => {
    console.log('new Connection')
    socket.on('user-join', ({ name, room}, callback) => {
        const { error, user } = addUser({id: socket.id, name, room})
        if (error) return callback(error)

        const chatHistory = getChatHistory()


        socket.emit('admin-message', {user: 'admin', text: `${user.name}, Welcome to the room ${user.room}.`})
        socket.broadcast.to(user.room).emit('admin-message', {user: 'admin', text: `${user.name} has joined.`})
        socket.join(user.room)
        io.to(user.room).emit('room-data', {room: user.room, users: getUsersInRoom(user.room)})
        if(chatHistory.length > 0) {
            chatHistory.forEach(chat => {
                const { user, room, message } = chat
                socket.emit('admin-message', {user: user.name , text: message})
            })
        }
    })

    socket.on('send-message', (message, callback) => {
     console.log("TCL: message", message)
        const user = getUser(socket.id)
        addToChatHistory({
            message,
            user
        })

        io.to(user.room).emit('admin-message', {user: user.name, text: message})
        io.to(user.room).emit('room-data', {room: user.room, users: getUsersInRoom(user.room)})

        callback()
    })


    socket.on('disconnect', () => {
        console.log('Disconnection')
        // const user = removeUser(socket.id)

        // if (user) {
            // io.to(user.room).emit('admin-message', {user: 'admin', text: `${user.name} has left.`})
        // }
    })
} )

app.use(router)

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`))