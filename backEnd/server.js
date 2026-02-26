import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);

// start server
const PORT = process.env.PORT || 8080;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});

// =======================
// App Data
// =======================

const waitingRequests = [];
const connections = [];

let msgVar = [
  {
    id: 1,
    user: "Ali",
    text: "The weather was nice today.",
    likes: 0,
    dislikes: 0,
    timeMsg: Date.now(),
  },
  {
    id: 2,
    user: "Sara",
    text: "I watched the new movie and really liked it.",
    likes: 0,
    dislikes: 0,
    timeMsg: Date.now(),
  },
];

let nextId = msgVar.length + 1;

// =======================
// Middlewares
// =======================

app.use(cors());
app.use(express.json());

// =======================
// Serve Frontend Files
// =======================

app.use(express.static("../frontEnd"));
app.get("/", (req, res) => {
  res.sendFile("../frontEnd/index.html");
});


// =======================
// Add Message (HTTP)
// =======================

app.post("/", (req, res) => {
  const newMessage = {
    id: nextId++,
    user: req.body.user,
    text: req.body.text,
    likes: 0,
    dislikes: 0,
    timeMsg: Date.now(),
  };

  msgVar.push(newMessage);

  // answer waiting polling requests
  for (let i = waitingRequests.length - 1; i >= 0; i--) {
    const waiting = waitingRequests[i];
    if (newMessage.id > waiting.since) {
      waiting.res.json([newMessage]);
      waitingRequests.splice(i, 1);
    }
  }

  // send to websocket users
  connections.forEach((conn) => {
    conn.send(
      JSON.stringify({
        type: "NEW_MESSAGE",
        payload: newMessage,
      })
    );
  });

  res.json(newMessage);
});

// =======================
// Long Polling
// =======================

app.get("/loadData", (req, res) => {
  const since = Number(req.query.since ?? 0);
  const newMessages = msgVar.filter((msg) => msg.id > since);

  if (newMessages.length > 0) {
    return res.json(newMessages);
  }

  const waiting = { since, res };

  waiting.timeout = setTimeout(() => {
    res.json([]);
    const i = waitingRequests.indexOf(waiting);
    if (i !== -1) waitingRequests.splice(i, 1);
  }, 25000);

  waitingRequests.push(waiting);

  req.on("close", () => {
    clearTimeout(waiting.timeout);
    const i = waitingRequests.indexOf(waiting);
    if (i !== -1) waitingRequests.splice(i, 1);
  });
});

// =======================
// WebSocket Server
// =======================

const wss = new WebSocketServer({ server });

wss.on("connection", (connection) => {
   
 // First load
 
    msgVar.forEach((chatMessage) => {
       connection.send(
    JSON.stringify({
      type: "NEW_MESSAGE",
      payload: {
            id: chatMessage.id,
            user: chatMessage.user,
            text: chatMessage.text,
            likes: chatMessage.likes,
            dislikes: chatMessage.dislikes,
            timeMsg: chatMessage.timeMsg
          }
      })
    )
    })
  


    
  connections.push(connection);


  connection.on("message", (message) => {
    console.log("WebSocket connected");


    let data;
    try {
      data = JSON.parse(message.toString());
    } catch {
      return;
    }

    if (!data.type) return;

    switch (data.type) {
      case "SEND_MESSAGE": {
        const { user, text } = data.payload || {};
        if (!user || !text) return;

        const newMessage = {
          id: nextId++,
          user,
          text,
          likes: 0,
          dislikes: 0,
          timeMsg: Date.now(),
        };

        msgVar.push(newMessage);

        connections.forEach((conn) => {
          conn.send(
            JSON.stringify({
              type: "NEW_MESSAGE",
              payload: newMessage,
            })
          );
        });

        break;
      }

      case "REACTION_ADD": {
        const { messageId, reaction } = data.payload || {};
        if (!messageId || !reaction) return;

        const messageItem = msgVar.find((m) => m.id === messageId);
        if (!messageItem) return;

        if (reaction === "LIKE") {
          messageItem.likes++;
        } else if (reaction === "DISLIKE") {
          messageItem.dislikes++;
        } else {
          return;
        }

        connections.forEach((conn) => {
          conn.send(
            JSON.stringify({
              type: "REACTION_UPDATED",
              payload: {
                messageId: messageItem.id,
                likes: messageItem.likes,
                dislikes: messageItem.dislikes,
              },
            })
          );
        });

        break;
      }

      default:
        break;
    }
  });

  connection.on("close", () => {
    const index = connections.indexOf(connection);
    if (index !== -1) connections.splice(index, 1);
    console.log("WebSocket disconnected");
  });
});
