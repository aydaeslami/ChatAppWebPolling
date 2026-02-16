const postBtnWeb = document.getElementById("sendButton");
const postBoxWeb = document.getElementById("messageInput");
const boxWeb = document.getElementById("messagesContainer");
const userBoxWeb = document.getElementById("userInput");

// =======================
// LOCAL WS CONNECTION
// =======================
const socket = new WebSocket("ws://localhost:8080");

// =======================
// SEND MESSAGE
// =======================
postBtnWeb.addEventListener("click", () => {
  const user = userBoxWeb.value.trim();
  const message = postBoxWeb.value.trim();

  if (!user || !message) return;

  const msgData = {
    type: "SEND_MESSAGE",
    payload: {
      user,
      text: message,
    },
  };

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msgData));
    postBoxWeb.value = "";
  }
});

// =======================
// RECEIVE MESSAGE
// =======================
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "NEW_MESSAGE") {
    const msg = data.payload;

    boxWeb.innerHTML += `
      <div class="message" data-message-id="${msg.id}">
        <div>${msg.user}: ${msg.text}</div>

        👍 <span class="likes">${msg.likes}</span>
        👎 <span class="dislikes">${msg.dislikes}</span>

        <button onclick="addReaction(${msg.id}, 'LIKE')">Like</button>
        <button onclick="addReaction(${msg.id}, 'DISLIKE')">Dislike</button>
      </div>
    `;

    boxWeb.scrollTop = boxWeb.scrollHeight;
  }

  if (data.type === "REACTION_UPDATED") {
    const { messageId, likes, dislikes } = data.payload;

    const messageEl = document.querySelector(
      `[data-message-id="${messageId}"]`
    );

    if (!messageEl) return;

    messageEl.querySelector(".likes").textContent = likes;
    messageEl.querySelector(".dislikes").textContent = dislikes;
  }
};

// =======================
// SEND REACTION
// =======================
function addReaction(messageId, reaction) {
  const msgData = {
    type: "REACTION_ADD",
    payload: {
      messageId,
      reaction,
    },
  };

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msgData));
  }
}

// =======================
// SOCKET EVENTS
// =======================
socket.onopen = () => {
  console.log("WebSocket connected");
};

socket.onclose = () => {
  console.log("WebSocket disconnected");
};

socket.onerror = (err) => {
  console.error("WebSocket error", err);
};
