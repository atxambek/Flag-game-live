import express from "express";
import fetch from "node-fetch";
import WebSocket, { WebSocketServer } from "ws";

const API_KEY = "PASTE_API_KEY_HERE";
const VIDEO_ID = "PASTE_VIDEO_ID_HERE";

const app = express();
app.use(express.static("public"));

const server = app.listen(process.env.PORT || 3000);
const wss = new WebSocketServer({ server });

let liveChatId = "";
let nextPageToken = "";
let players = {};

async function getLiveChatId() {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${VIDEO_ID}&key=${API_KEY}`
  );
  const data = await res.json();
  liveChatId = data.items[0]?.liveStreamingDetails?.activeLiveChatId;
  console.log("LIVE CHAT ID:", liveChatId);
}

async function readChat() {
  if (!liveChatId) return;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet,authorDetails&liveChatId=${liveChatId}&key=${API_KEY}` +
    (nextPageToken ? `&pageToken=${nextPageToken}` : "")
  );

  const data = await res.json();
  nextPageToken = data.nextPageToken;

  data.items.forEach(m => {
    const user = m.authorDetails.displayName;
    const text = m.snippet.displayMessage.trim();

    if (!players[user] && text.length <= 4) {
      players[user] = text;
      console.log(user, text);
      broadcast();
    }
  });
}

function broadcast() {
  wss.clients.forEach(c =>
    c.send(JSON.stringify(players))
  );
}

function eliminate() {
  const users = Object.keys(players);
  if (users.length <= 1) return;

  const out = users[Math.floor(Math.random() * users.length)];
  delete players[out];
  broadcast();
}

(async () => {
  await getLiveChatId();
  setInterval(readChat, 3000);
  setInterval(eliminate, 6000);
})();
