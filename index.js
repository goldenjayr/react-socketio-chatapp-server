const app = require('express')()
const path = require('path')
const fs = require('fs')
const server = require('http').Server(app)
const router = require('./router')
const io = require('socket.io')(server)
const PORT = process.env.PORT || 4000
const { addUser, removeUser, getUser, getUsersInRoom, addToChatHistory, getChatHistory } = require('./users')
const ss = require('socket.io-stream')




const uploadData = (socket, file_name) => {
    const uploadDirectory = path.resolve(__dirname, 'uploads')
    if (!file_name) {
        fs.readdir(uploadDirectory, (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            files.forEach(file => {
                    const filePath = path.resolve(uploadDirectory, file)
                    const stream = ss.createStream()
                    ss(socket).emit('upload-data', stream)
                    fs.createReadStream(filePath).pipe(stream)
            })
        })

    } else {
        console.log(`Downloading SSession ${socket.id} - Preparing Download of ${file_name}`)

        let filesArr
        fs.readdir(uploadDirectory, (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err)
            }

            filesArr = files.filter(file => {
                return file.toLowerCase().includes(file_name)
            })
            console.log("TCL: uploadData -> filesArr", filesArr)

            if (filesArr.length > 0) {
                filesArr.forEach(file => {
                        const filePath = path.resolve(uploadDirectory, file)
                        const stream = ss.createStream()
                        ss(socket).emit('upload-data', stream)
                        fs.createReadStream(filePath).pipe(stream)
                })
            } else {
                socket.emit('download error' , {code: 500, message: `${file_name} does not exists`})
            }
        })


        // const filePath = path.resolve(__dirname, `uploads/${file_name}`)
        // console.log("TCL: filePath", filePath)
        // const exists = fs.existsSync(filePath)
        // if (!exists) {
        // } else {
        //     socket.on('ready', () => {
        //         const stream = ss.createStream()
        //         ss(socket).emit('upload-data', stream)
        //         console.log('sending...')
        //         fs.createReadStream(filePath).pipe(stream)
        //     })

        //     socket.on('done', () => {
        //         console.log(`Download Session ${socket.id} - Download Done of ${file_name}`)
        //         socket.emit('close')
        //     })
        // }
    }
}



const uploads = io.of('/uploads')
uploads.on('connect', (socket) => {
    socket.emit('connected-uploads', 'connected')
    let { file_name, force } = socket.handshake.query
    socket.on('ready', () => {
        uploadData(socket, file_name)
    })

    // socket.on('get-uploads', (file_name) => {
    // console.log("TCL: file_name", file_name)
    //     uploadData(socket, file_name)
    // })

})

io.on('connect', (socket) => {
    console.log('new Connection')
    socket.on('user-join', ({ name, room }, callback) => {
        const { error, user } = addUser({id: socket.id, name, room})
        if (error) return callback(error)

        const chatHistory = getChatHistory()


        socket.emit('admin-message', {user: 'admin', text: `${user.name}, Welcome to the room ${user.room}.`})
        socket.broadcast.to(user.room).emit('admin-message', {user: 'admin', text: `${user.name} has joined.`})
        socket.join(user.room)
        io.to(user.room).emit('room-data', {room: user.room, users: getUsersInRoom(user.room)})
        // if(chatHistory.length > 0) {
        //     chatHistory.forEach(chat => {
        //         const { user, room, message } = chat
        //         socket.emit('admin-message', {user: user.name , text: message})
        //     })
        // }
    })

    ss(socket).on('send-message', (stream, message, callback) => {
        const user = getUser(socket.id)
        if (typeof message === 'object') {
            const fileName = message.image
            const filePath = path.join(__dirname, 'uploads/' + fileName)
            const writeStream = fs.createWriteStream(filePath)
            stream.pipe(writeStream)

            stream.on('end', () => {
                const outboundStream = ss.createStream()
                ss(socket).emit('admin-message-image', outboundStream, {user: user.name, text: message})
                fs.createReadStream(filePath).pipe(outboundStream)

                uploads.emit('uploaded');
            })
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