const http = require("http");
const server = require("websocket").server;

const port = process.env.PORT || 3000
const httpServer = http.createServer(() => {});
const wsServer = new server({
  httpServer
});

const findPeers = (id, connection, code) => {
  const room = peersByCode[code]
  if (room) return room.filter(peer => peer.id !== id)
  peersByCode[code] = [{ connection, id }];
  return null
}

const handleIceCandidate = (id, connection, data) => {
  const { code, candidate, type } = data
  const peers = findPeers(id, connection, code)
  if (peers) {
    const peer = peers[0]
    console.log(`${id} sending candidate to ${peer.id}`)
    peer.connection.send(JSON.stringify({
      type,
      candidate,
      id
    }))
  }
}

const handleOffer = (id, connection, data) => {
  const { code, offer, type } = data
  const peers = findPeers(id, connection, code)
  if (peers) {
    const peer = peers[0]
    console.log(`${id} sending offer to ${peer.id}`)
    peer.connection.send(JSON.stringify({
      type,
      offer,
      id
    }))
  }
}

const handleAnswer = (id, connection, data) => {
  const { code, answer, type } = data
  const peers = findPeers(id, connection, code)
  if (peers) {
    const peer = peers[0]
    console.log(`${id} sending answer to ${peer.id}`)
    peer.connection.send(JSON.stringify({
      type,
      answer,
      id
    }))
  }
}

const handleJoin = (id, connection, data) => {
    const { code } = data
    if (!peersByCode[code]) {
      console.log(`New room: ${code} has been created by ${id}`)
      peersByCode[code] = [{ connection, id }];
    } else if (!peersByCode[code].find(peer => peer.id === id )) {
      peersByCode[code].push({ connection, id });
      console.log(`${id} has joined the room: ${code}`);
    }
}

const handleLeave = (id, connection, data) => {
  peersByCode[data.code] = peersByCode[data.code].filter(peer => peer.id !== id)
  console.log(`${id} has left the room: ${data.code}`)
}

const handleChat = (id, connection, data) => {
  const { text, code, type} = data
  const peers = findPeers(id, connection, code)
  if (peers) {
    peers.forEach(peer => peer.connection.send(JSON.stringify({
      id,
      type,
      code,
      text
    })));
  }
}

// WebSocket

const peersByCode = {};

wsServer.on("request", request => {
  const connection = request.accept();
  const id = request.resourceURL.path.replace('/', '')

  connection.on('message', message => {
    let data;

    //accepting only JSON messages
    try {
      data = JSON.parse(message.utf8Data);
    } catch (e) {
      console.log("Invalid JSON");
      data = {};
    }

    const { code, type } = data

    console.log(`Origin ID: ${id}, Type: ${type}, Room: ${code}`)
    switch (type) {
      case 'join':
        handleJoin(id, connection, data);
        break;
      case 'leave':
        handleLeave(id, connection, data);
        break;
      case 'offer':
        console.log(data.offer)
        handleOffer(id, connection, data)
        break;
      case 'answer':
        handleAnswer(id, connection, data)
        break;
      case 'candidate':
        handleIceCandidate(id, connection, data)
        break;
      case 'chat':
        handleChat(id, connection, data)
        break;
      default:
        break
    }

  });

  connection.on("close", () => {
    const room = Object.values(peersByCode).filter(room => room.filter(peer => peer.id == id ))[0]
    const peer = room.find(peer => peer.id !== id)
    if (peer) {
      peer.connection.send(
        JSON.stringify({
          client: id,
          text: "I disconnected"
        })
      )
    }
  });
});


// Init Server
httpServer.listen(port, () => {
  console.log(`Server listening at port ${port}`);
});

