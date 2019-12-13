const app = require('express')()
const server = require('http').Server(app)

global.path = require('path')
global.fs = require('fs')
global.io = require('socket.io')(server)
global.ss = require('socket.io-stream')
global.kafka = require('kafka-node')

global.Transform = require('stream').Transform
global.Duplex = require('stream').Duplex

const uuiv4 = require('uuid/v4')
const router = require('./router')

const { kafka_server, kafka_topic } = require('./kafka_config')
const util = require('util')
const PORT = process.env.PORT || 4000

const { addUser, removeUser, getUser, getUsersInRoom, addToChatHistory, getChatHistory } = require('./users')
const { downloadUploadData, createProducerStream } = require('./utils')
const { kafkaProducerTexts, kafkaFilesProducer } = require('./kafkaProducer')
const { kafkaConsumerGroupTexts, kafkaConsumerTexts, kafkaFileConsumer } = require('./kafkaConsumer')

global.uploadDirectory = path.resolve(process.cwd(), '../file-repository')


const kafka_client_options = {
    kafkaHost: kafka_server
}

const kafka_client = new kafka.KafkaClient( kafka_client_options )

var topicsToCreate = [{
    topic: 'images',
    partitions: 3,
    replicationFactor: 3
  }];

  kafka_client.createTopics(topicsToCreate, (error, result) => {
    if (error) console.log(error)
    console.log(`Result of creating topic is ${util.inspect(result, false, null, true)}`)
  });


// uploads namespace for retrieving uploads
const uploads = io.of('/uploads')
uploads.on('connect', (socket) => {
    socket.emit('connected-uploads', `You are connected to uploads socket namespace`)
    let { file_name, force } = socket.handshake.query

    socket.on('ready', () => {
        //download upload data
        downloadUploadData(socket, file_name)
    })

})






global.texts_namespace = io.of('/texts')
texts_namespace.on('connect', socket => {
    socket.emit('connected-texts', `You are connected to text socket namespace`)

    socket.on('user-join', ({name, room}) => {
        const { error, user } = addUser({id: socket.id, name, room})
        if (error) return callback(error)


        socket.emit('admin-message', {user: {name: 'admin'}, text: `${user.name}, Welcome to the room ${user.room}.`})
       // kafkaConsumerTexts(kafka_server, socket, room)
        socket.broadcast.to(user.room).emit('admin-message', {user: {name: 'admin'}, text: `${user.name} has joined.`})
        socket.join(user.room)
        texts_namespace.to(user.room).emit('room-data', {room: user.room, users: getUsersInRoom(user.room)})
    })


    ss(socket).on('send-data', (stream, data, callback) => {
    console.log("TCL: message", data)
        const user = getUser(socket.id)



        //kafka integration
        const topic = 'texts'
        const fileNameTopic = 'filenames'
        try {
            console.log(`Going to Kafka........`)
            console.log(`Kafka request received for topic -> ${topic}`)


            // produce file name
            // kafkaProducerTexts(kafka_client, fileNameTopic, data.file, user)

            // pass to file producer and write
            kafkaFilesProducer(kafka_client, topic, stream, data)

            // consuming file names
            // const {filename} = kafkaConsumerGroupTexts(fileNameTopic)
            // console.log("TCL: filename", filename)

            // consuming file
        //     stream.on('end', () => {
        //         console.log('Processing consumer....')
        //         const filePath = path.join(process.cwd(), 'uploads/' + Date.now().toString() + 'test.jpg')
        //         writeStream = fs.createWriteStream(filePath)
        //         // in consumer decode strings to true
        //         const messageTransform = new Transform({
        //             objectMode: true,
        //             decodeStrings: true,
        //             transform (message, encoding, callback) {
        //               callback(false, message.value);
        //             }
        //           });

        //           const consumerOptions = {
        //             groupId: 'ExampleTestGroup',
        //             sessionTimeout: 15000,
        //             protocol: ['roundrobin'],
        //             fetchMaxBytes: 1024 * 1024,
        //             fromOffset: 'latest',
        //             encoding: 'buffer',
        //             outOfRangeOffset: 'earliest'
        //         }

        //         const kafkaConsumerStream = new kafka.ConsumerGroupStream(consumerOptions, topic)

        //         // writeStream.on('drain', () => {
        //         //     console.log('Write stream completed')
        //         //     kafkaConsumerStream.pause()
        //         // })

        //         kafkaConsumerStream.pipe(messageTransform).pipe(writeStream)

        //     })

        } catch (err) {
            throw err
        }


        // ===============================================================



                    // topicsToCreate = [
                        //     {
                            //         topic,
                            //         partitions: 3,
                            //         key: 'theKey',
                            //         replicationFactor: 2
                            //     }
                            // ]

                    // kafka_client.createTopics(topicsToCreate, ( err, result ) => {
                    //     if ( err ) {
                    //         throw err
                    //     } else {
                    //         console.log(`this is the result`)
                    //         console.log (`Created topic ${topic}`)
                    //     }
                    // })

                    // kafka_client.loadMetadataForTopics(["texts", "pictures", "ohyeah"], (err, resp) => {
                    //     console.log("TOPIC EXIST: ", JSON.stringify(resp).includes('error'))
                    //   });


        // addToChatHistory({
        //     message,
        //     user
        // })

        callback()
    })
})



// io.on('connect', (socket) => {
//     console.log('new Connection')
//     socket.on('user-join', ({ name, room }, callback) => {
//         const { error, user } = addUser({id: socket.id, name, room})
//         if (error) return callback(error)

//         const chatHistory = getChatHistory()


//         socket.emit('admin-message', {user: 'admin', text: `${user.name}, Welcome to the room ${user.room}.`})
//         socket.broadcast.to(user.room).emit('admin-message', {user: 'admin', text: `${user.name} has joined.`})
//         socket.join(user.room)
//         io.to(user.room).emit('room-data', {room: user.room, users: getUsersInRoom(user.room)})
//         // if(chatHistory.length > 0) {
//         //     chatHistory.forEach(chat => {
//         //         const { user, room, message } = chat
//         //         socket.emit('admin-message', {user: user.name , text: message})
//         //     })
//         // }
//     })

//     ss(socket).on('send-message', (stream, message, callback) => {
//         const user = getUser(socket.id)
//         if (typeof message === 'object') {
//             const fileName = message.image
//             const filePath = path.join(__dirname, 'uploads/' + fileName)
//             const writeStream = fs.createWriteStream(filePath)
//             stream.pipe(writeStream)

//             stream.on('end', () => {
//                 const outboundStream = ss.createStream()
//                 ss(socket).emit('admin-message-image', outboundStream, {user: user.name, text: message})
//                 fs.createReadStream(filePath).pipe(outboundStream)

//                 uploads.emit('uploaded');
//             })
//         } else {
//             io.emit('admin-message', {user: user.name, text: message})
//         }

//         addToChatHistory({
//             message,
//             user
//         })

//         callback()
//     })


//     socket.on('disconnect', () => {
//         console.log('Disconnection')
//         // const user = removeUser(socket.id)

//         // if (user) {
//             // io.to(user.room).emit('admin-message', {user: 'admin', text: `${user.name} has left.`})
//         // }
//     })
// } )

app.use(router)

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`))