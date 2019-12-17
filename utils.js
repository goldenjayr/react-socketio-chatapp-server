const downloadFromRepo = (socket, file_name) => {
  if (!file_name) {
    fs.readdir(uploadDirectory, (err, files) => {
      if (err) {
        return console.log("Unable to scan directory: " + err);
      }
      files.forEach(file => {
        const filePath = path.resolve(uploadDirectory, file);
        const stream = ss.createStream();
        ss(socket).emit("upload-data", stream);
        fs.createReadStream(filePath).pipe(stream);
      });
    });
  } else {
    console.log(
      `Downloading SSession ${socket.id} - Preparing Download of ${file_name}`
    );

    let filesArr;
    fs.readdir(uploadDirectory, (err, files) => {
      if (err) {
        return console.log("Unable to scan directory: " + err);
      }

      filesArr = files.filter(file => {
        return file.toLowerCase().includes(file_name);
      });

      if (filesArr.length > 0) {
        filesArr.forEach(file => {
          const filePath = path.resolve(uploadDirectory, file);
          const stream = ss.createStream();
          ss(socket).emit("upload-data", stream);
          fs.createReadStream(filePath).pipe(stream);
        });
      } else {
        socket.emit("download error", {
          code: 500,
          message: `${file_name} does not exists`
        });
      }
    });

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
};

const requestFiles = producer => {
  console.log("Processing Producer");
  const payloads = [
    {
      topic: "request-files",
      messages: "hello", // multi messages should be a array, single message can be just a string or a KeyedMessage instance
      timestamp: Date.now() // <-- defaults to Date.now() (only available with kafka v0.10+)
    }
  ];

  console.log(`Sending message to kafka  with payload`);
  producer.send(payloads, (err, data) => {
    if (err) throw err;
    console.log(`Message is sent from producer`);
  });

  producer.on("error", err => console.log("There is an error:", err));
};

const listenForData = (consumerStream, socket) => {
  console.log("listening for DATA");
  const fileList = {};
  const fileNumberOfChunks = {};
  consumerStream.on("data", chunk => {
    const key = typeof chunk.key === 'string'? JSON.parse(chunk.key) : chunk.key;
    if (key.last) {
      fileNumberOfChunks[`${key.fileName}`] = Number(key.order);
    }
    if (!fileList[`${key.fileName}`]) fileList[`${key.fileName}`] = [];
    chunk.key = key;
    fileList[`${key.fileName}`].unshift(chunk);

    console.log("TCL: fileNumberOfChunks", fileNumberOfChunks);
    if (
      fileList[`${key.fileName}`].length ===
      fileNumberOfChunks[`${key.fileName}`]
    ) {
      renderImage(key.fileName);
    }
  });

  const renderImage = filename => {
    const { key } = fileList[`${filename}`].find(e => e.key);
    const { fileName, fileSize } = key;
    console.log(`File Size is ${fileSize} bytes`);
    const stream = ss.createStream();
    const newTransformStream = new Transform({
      objectMode: true,
      decodeStrings: true,
      transform(chunk, encoding, callback) {
        callback(null, {
          messages: chunk
        });
      }
    });
    let progress = 0;
    let percentage = 0;
    ss(socket).emit("upload-data", stream, {fileName, fileSize, length: fileList[`${filename}`].length});

    fileList[`${filename}`]
      .sort((a, b) => a.key.order - b.key.order)
      .forEach(chunk => {
        console.log("ORDERED ARRAY --> ", {
          partition: chunk.partition,
          key: chunk.key.order
        });
        progress = progress + chunk.value.length;
        percentage = (progress / fileSize) * 100;
        console.log(
          `Transferring ${fileName} to client ----- ${progress} bytes ---- ${Math.round(
            percentage
          )}%`
        );
        newTransformStream.push(chunk.value);
      });
      newTransformStream.pipe(stream)

    if (percentage === 100) {
      console.log("Transfer is complete");
    }
    fileList[`${filename}`].length = 0;
  };
};

const createProducerStream = (kafka_client_options, topic) => {
  const client = new kafka.KafkaClient(kafka_client_options);
  const producer = new kafka.Producer(client);
  let dataStreamed = 0;
  producer.on("ready", () => {
    console.log(`Producer for ${topic} is ready`);
  });

  let order = 0;
  const bufferToTopicStream = new Transform({
    objectMode: true,
    decodeStrings: false,
    transform(buff, encoding, callback) {
      console.log("TCL: transform -> buff", buff);
      order = order + 1;
      callback(null, {
        topic: topic,
        key: order,
        replicationFactor: 2,
        messages: Buffer.from(buff)
      });
    }
  });

  bufferToTopicStream.on("data", payload => {
    console.log("TCL: createProducerStream -> payload", payload);
    const { topic, messages } = payload;
    dataStreamed = dataStreamed + messages.length;

    producer.send([payload], () =>
      console.log(`Streamed ${dataStreamed} to ${topic}`)
    );
  });

  return bufferToTopicStream;
};

module.exports = {
  requestFiles,
  listenForData,
  downloadFromRepo,
  createProducerStream
};
