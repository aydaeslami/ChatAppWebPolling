import express from "express";
import cors from "cors";
import http from "http";
import { server as WebSocketServer } from "websocket";

const app = express();
const server = http.createServer(app);
const webSocketServer = new WebSocketServer({ httpServer: server });

// start server
server.listen(8080, () => {
  console.log("Server running on port 8080");
});

// app data

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

// next message id
let nextId = msgVar.length + 1;

// middlewares

app.use(cors());
app.use(express.json());

// serve frontend files
app.use(express.static("../frontEnd"));

// add message (HTTP)

app.post("/", (req, res) => {
  const newMessage = {
    id: nextId++,
    user: req.body.userName,
    text: req.body.boxValue,
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
    conn.sendUTF(
      JSON.stringify({
        type: "NEW_MESSAGE",
        payload: newMessage,
      })
    );
  });

  res.json(newMessage);
});

// delete message

app.post("/delete", (req, res) => {
  const idToDelete = req.body.id;
  const index = msgVar.findIndex((msg) => msg.id === idToDelete);

  if (index !== -1) {
    msgVar.splice(index, 1);
  }

  res.json({ message: "Message deleted" });
});

// long polling

app.get("/loadData", (req, res) => {
  const since = Number(req.query.since ?? 0);
  const newMessages = msgVar.filter((msg) => msg.id > since);

  if (newMessages.length > 0) {
    res.json(newMessages);
  } else {
    waitingRequests.push({ since, res });
  }
});

// websocket connection

webSocketServer.on("request", (req) => {
  const connection = req.accept(null, req.origin);
  connections.push(connection);
  console.log("WebSocket connected");

  connection.on("message", handleWebSocketMessage);

  connection.on("close", () => {
    const index = connections.indexOf(connection);
    if (index !== -1) connections.splice(index, 1);
    console.log("WebSocket disconnected");
  });
});

// websocket messages

function handleWebSocketMessage(msg) {
  if (msg.type !== "utf8") return;

  let data;
  try {
    data = JSON.parse(msg.utf8Data);
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
        conn.sendUTF(
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

      const message = msgVar.find((m) => m.id === messageId);
      if (!message) return;

      if (reaction === "LIKE") {
        message.likes++;
      } else if (reaction === "DISLIKE") {
        message.dislikes++;
      } else {
        return;
      }

      connections.forEach((conn) => {
        conn.sendUTF(
          JSON.stringify({
            type: "REACTION_UPDATED",
            payload: {
              messageId: message.id,
              likes: message.likes,
              dislikes: message.dislikes,
            },
          })
        );
      });

      break;
    }

    default:
      break;
  }
}
