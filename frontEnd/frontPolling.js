const postBtn = document.getElementById("sendButton");
const postBox = document.getElementById("messageInput");
const box = document.getElementById("messagesContainer");
const userBox = document.getElementById("userInput");
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const backendURL = isLocal
  ? "http://localhost:8080"
  : "https://chatapp-backend.hosting.codeyourfuture.io";

let lastSeenId = 0;

// SEND
async function sendData() {
     const user = userBox.value.trim();
     const message = postBox.value.trim();

     // check empty
if (!user) {
    alert("Please enter name");
    return;
     }
    else if(!message){
          alert("Please enter message");
    return;
    }
  const res = await fetch(`${backendURL}/`, {

    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      
      user: user,
      text: message,
    }),
  });

  postBox.value = "";
  userBox.value="";

}

postBtn.addEventListener("click", sendData);

// LONG POLL
async function longPoll() {
  try {
const res = await fetch(`${backendURL}/loadData?since=${lastSeenId}`);

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
  setTimeout(longPoll, 500);
}

async function loadInitialMessages() {
  const res = await fetch(`${backendURL}/loadData?since=0`);
  const messages = await res.json();

  box.innerHTML = "";

  messages.forEach((msg) => {
    box.innerHTML += `<div class="message">${msg.user}: ${msg.text}</div>`;
    lastSeenId = msg.id;
  });
}

longPoll()