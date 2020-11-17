const http = require("http");
const server = require("websocket").server;

const httpServer = http.createServer(() => {});
const wsServer = new server({
  httpServer
});

// WebSocket

const peersByCode = {};

wsServer.on("request", request => {
  const connection = request.accept();
  const id = request.resourceURL.path.replace('/', '')

  connection.on('message', message => {
    const { code } = JSON.parse(message.utf8Data);
    if (!peersByCode[code]) {
      console.log("Empty Room")
      peersByCode[code] = [{ connection, id }];
    } else if (!peersByCode[code].find(peer => peer.id === id )) {
      peersByCode[code].push({ connection, id });
      console.log("Found buddy")
    }

    const peer = peersByCode[code].find(peer => peer.id !== id)
    if (peer) {
        console.log("Sending msg to buddy", peer.id)
        peer.connection.send(message.utf8Data);
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
httpServer.listen(1337, () => {
  console.log("Server listening at port 1337");
});

