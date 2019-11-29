const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const PORT = process.env.PORT || 4000

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`))