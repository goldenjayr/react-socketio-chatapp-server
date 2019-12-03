const app = require('express')()
const path = require('path')
const fs = require('fs')
const server = require('http').Server(app)
const router = require('./router')
const io = require('socket.io')(server)
const PORT = process.env.PORT || 4000
const { addUser, removeUser, getUser, getUsersInRoom, addToChatHistory, getChatHistory } = require('./users')
const ss = require('socket.io-stream')
const ouboundStream = ss.createStream()

const uploads = io.of('/uploads')
uploads.on('connection', (socket) => {
    console.log(socket)
})

io.on('connection', (socket) => {
    console.log('new Connection')
    socket.on('user-join', ({ name, room }, callback) => {
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

    ss(socket).on('send-message', (stream, message, callback) => {
    console.log("TCL: message", message)
        const user = getUser(socket.id)
        if (typeof message === 'object') {
            const filename = path.join(__dirname, 'uploads/' + message.image)
            const writeStream = fs.createWriteStream(filename)
            stream.pipe(writeStream)
            console.log("TCL: message", message)

            ss(io).emit('admin-message-image', ouboundStream, {user: user.name, text: message})
            writeStream.on('')
            fs.createReadStream(filename).pipe(ouboundStream)
        } else {
            io.emit('admin-message', {user: user.name, text: message})
        }

        addToChatHistory({
            message,
            user
        })

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