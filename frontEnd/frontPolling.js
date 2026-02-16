const postBtn = document.getElementById("sendButton");
const postBox = document.getElementById("messageInput");
const box = document.getElementById("messagesContainer");
const userBox = document.getElementById("userInput");

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
  const res = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      
      user: user,
      text: message,
    }),
  });

  postBox.value = "";
}

postBtn.addEventListener("click", sendData);

// LONG POLL
async function longPoll() {
  try {
    const res = await fetch(`/loadData?since=${lastSeenId}`);

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
