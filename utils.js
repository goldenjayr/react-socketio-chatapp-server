const downloadUploadData = (socket, file_name) => {
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


const createProducerStream = ( kafka_client_options, topic ) => {
    const client = new kafka.KafkaClient(kafka_client_options)
    const producer = new kafka.Producer(client)
    let dataStreamed = 0
    producer.on('ready', () => {
        console.log(`Producer for ${topic} is ready`)
    })

    let order = 0
    const bufferToTopicStream = new Transform({
        objectMode: true,
        decodeStrings: false,
        transform(buff, encoding, callback) {
            console.log("TCL: transform -> buff", buff)
            order = order + 1
            callback( null, {
                topic: topic,
                key: order,
                replicationFactor: 2,
                messages: Buffer.from(buff)
            })
        }
    })

    bufferToTopicStream.on('data', payload => {
    console.log("TCL: createProducerStream -> payload", payload)
        const {topic, messages} = payload
        dataStreamed = dataStreamed + messages.length

        producer.send( [ payload ], () => console.log(`Streamed ${dataStreamed} to ${topic}`))
    })

    return bufferToTopicStream
}



module.exports = {
    downloadUploadData,
    createProducerStream
}