
const kafkaProducerTexts = (kafka_client, topic, message, user) => {

    const producer = new kafka.Producer(kafka_client)
    const payloads = [
        {
            topic: topic,
            messages: JSON.stringify({message, user}), // multi messages should be a array, single message can be just a string or a KeyedMessage instance
            timestamp: Date.now() // <-- defaults to Date.now() (only available with kafka v0.10+)
            }
    ]

    producer.on('ready', () => {
        console.log(`Sending message to topic ${topic} with payload`)
        producer.send(payloads, (err, data) => {
            if (err) throw err
            console.log(`Message is sent from producer`)
        })
    })

    producer.on('error', (err) => console.log("There is an error:", err))

}


const kafkaFilesProducer = (kafka_client, topic, stream, {file}) => {
    console.log(`Creating Producer..... with topic ${topic}`)
    const producerStream = new kafka.ProducerStream(kafka_client)
    const streamArray = []
    let order = 0

    const streamToTopic = new Transform({
        objectMode: true,
        decodeStrings: true,
        transform (chunk, encoding, callback) {
          order = order + 1
          callback(null, {
            key: JSON.stringify({order: order, fileName: file.name, fileSize: file.size}),
            topic: 'images',
            messages: chunk
          });
        }
    });


    stream.pipe(streamToTopic).on('data', (chunk) => {
        streamArray.unshift(chunk)
    })

    stream.on('end', () => {
        const key = JSON.parse(streamArray[0].key)
        key.last = true
        streamArray[0].key = JSON.stringify(key)
        // created new transform because producerStream cannot push from array
        const newTransformStream = new Transform({
            objectMode: true,
            decodeStrings: true,
            transform (chunk, encoding, callback) {
              callback(null, {
                messages: chunk
              });
            }
        });
        streamArray.forEach((arr) => {
            newTransformStream.push(arr)
        })
        newTransformStream.pipe(producerStream)
    })



    console.log(`Production completed`)
}

module.exports = {
    kafkaProducerTexts,
    kafkaFilesProducer
}
