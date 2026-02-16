const postBtn = document.getElementById("sendButton");
const postBox = document.getElementById("messageInput");
const box = document.getElementById("messagesContainer");
const userBox = document.getElementById("userInput");

let lastSeenId = 0;

// SEND
async function sendData() {

  const res = await fetch("http://localhost:8080/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      
      user: userBox.value,
      text: postBox.value,
    }),
  });

  postBox.value = "";
}

postBtn.addEventListener("click", sendData);

// LONG POLL
async function longPoll() {
  try {
    const res = await fetch(
      `http://localhost:8080/loadData?since=${lastSeenId}`
    );

    const messages = await res.json();

    messages.forEach((msg) => {
      box.innerHTML += `<div class="message">${msg.user}: ${msg.text}</div>`;
      lastSeenId = msg.id;
    });

    box.scrollTop = box.scrollHeight;

  } catch (err) {
    console.error("Polling error:", err);
  }
// prevent overlapping
  setTimeout(longPoll, 1000);
}

longPoll();
