const kafkaConsumerGroupTexts = (topic) => {
    console.log('Creating consumer.....')
    try {

        const consumerOptions = {
            groupId: 'ExampleTestGroup',
            sessionTimeout: 15000,
            protocol: ['roundrobin'],
            fetchMaxBytes: 1024 * 1024,
            fromOffset: 'latest',
            outOfRangeOffset: 'earliest'
        }

        consumer = new kafka.ConsumerGroup(consumerOptions,topic);
        let filename
        consumer.on('message', (data) => {
        console.log("TCL: kafkaConsumerGroupTexts -> data", data)
          // console.log('Sending message to client subscribers')
          const { message, user } = JSON.parse(data.value)
          filename = message
          consumer.close(true, () => {
            console.log('Closing consumer')
          })
          // texts_namespace.emit('admin-message', {user, text: message})
        })

        return {filename}

        consumer.on('error', function(err) {
          console.log('error', err);
        });
      }
      catch(e) {
        console.log(e);
      }
}

const kafkaConsumerTexts = (kafka_server, socket, room) => {
    console.log('Creating kafkaConsumerTexts.....')
    const kafka_client_options = {
        kafkaHost: kafka_server
    }
    const options = {
        groupId: 'ExampleTestGroup',
        // The max wait time is the maximum amount of time in milliseconds to block waiting if insufficient data is available at the time the request is issued, default 100ms
        fetchMaxWaitMs: 0,
        // This is the minimum number of bytes of messages that must be available to give a response, default 1 byte
        fetchMinBytes: 1,
        // The maximum bytes to include in the message set for this partition. This helps bound the size of the response.
        fetchMaxBytes: 1024 * 1024,
        // If set true, consumer will fetch message from the given offset in the payloads
        fromOffset: true,
    }
    const kafka_client = new kafka.KafkaClient( kafka_client_options )
    const payloads =[
        {
            topic: 'texts',
            offset: 0, //default 0
            partition: 0 // default 0
         }
    ]
    try {

        let consumer = new kafka.Consumer(kafka_client, payloads, options);

        consumer.on('message', (data) => {
          console.log('kafka consumed ------> ', data.value);
          console.log('Sending message to client subscribers')
          const { message, user } = JSON.parse(data.value)
            if (user.room === room) {
                socket.emit('admin-message', {user, text: message})
            }
          consumer.close(true, () => console.log('consumer closed'));
        })

        consumer.on('error', function(err) {
          console.log('error', err);
        });

      }
      catch(e) {
        console.log(e);
      }
}

const kafkaFileConsumer = (stream, topic) => {
  stream.on('end', () => {
    console.log('Processing consumer....')
    const filePath = path.join(process.cwd(), 'uploads/' + 'test.jpg')
    writeStream = fs.createWriteStream(filePath)
    // in consumer decode strings to true
    const messageTransform = new Transform({
        objectMode: true,
        decodeStrings: true,
        transform (message, encoding, callback) {
          callback(false, {
                key: Number(message.key.toString()),
                messages: message.value
            }
          );
        }
      });

      const consumerOptions = {
        groupId: 'ExampleTestGroup',
        sessionTimeout: 15000,
        protocol: ['roundrobin'],
        fetchMaxBytes: 1024 * 1024,
        fromOffset: 'latest',
        encoding: 'buffer',
        outOfRangeOffset: 'earliest'
    }
    const kafkaConsumerStream = new kafka.ConsumerGroupStream(consumerOptions, topic)
    kafkaConsumerStream.pipe(messageTransform).on('data', (chunk) => {
        writeStream.write(chunk.messages)
    })
})
}

module.exports = {
    kafkaConsumerGroupTexts,
    kafkaConsumerTexts,
    kafkaFileConsumer
}