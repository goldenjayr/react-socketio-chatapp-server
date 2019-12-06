
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

module.exports = {
    kafkaProducerTexts
}
