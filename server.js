import express from "express";
import fetch from "node-fetch";
import { WebSocketServer } from "ws";

const API_KEY = "AIzaSyDye-sPcSStm9cCAr3nvZ80XkskRwT3AsE";       // YouTube API Key
const VIDEO_ID = "gvfq47XxscK-GGnH";     // Live Video ID

const app = express();
app.use(express.static("public"));

const server = app.listen(process.env.PORT || 3000, () => {
  console.log("⚡ Server running...");
});

const wss = new WebSocketServer({ server });

let liveChatId = "";
let nextPageToken = "";
let players = {};

// 🟢 LIVE CHAT ID olish
async function getLiveChatId() {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${VIDEO_ID}&key=${API_KEY}`
    );
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      console.error("❌ Video topilmadi. VIDEO_ID yoki API_KEY xato yoki video hali live emas");
      return;
    }

    liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
    console.log("✅ LIVE CHAT ID:", liveChatId);
  } catch (err) {
    console.error("❌ getLiveChatId xato:", err);
  }
}

// 🟢 Chatni o‘qish
async function readChat() {
  if (!liveChatId) return;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet,authorDetails&liveChatId=${liveChatId}&key=${API_KEY}` +
        (nextPageToken ? `&pageToken=${nextPageToken}` : "")
    );
    const data = await res.json();
    nextPageToken = data.nextPageToken;

    if (!data.items) return;

    data.items.forEach((m) => {
      const user = m.authorDetails.displayName;
      const text = m.snippet.displayMessage.trim();

      // Flag uzunligi 1-4 bo‘lsin
      if (!players[user] && text.length <= 4) {
        players[user] = text;
        console.log("🟢", user, text);
        broadcast();
      }
    });
  } catch (err) {
    console.error("❌ readChat xato:", err);
  }
}

// 🟢 Flaglarni WebSocket orqali jo‘natish
function broadcast() {
  wss.clients.forEach((c) => {
    if (c.readyState === 1) c.send(JSON.stringify(players));
  });
}

// 🟢 Random OUT funksiyasi
function eliminate() {
  const users = Object.keys(players);
  if (users.length <= 1) return;

  const out = users[Math.floor(Math.random() * users.length)];
  console.log("❌ Eliminated:", out);
  delete players[out];
  broadcast();
}

// 🟢 Server ishga tushishi
(async () => {
  await getLiveChatId();

  // Chatni doimiy o‘qish
  setInterval(readChat, 3000);

  // Har 6 soniyada random OUT
  setInterval(eliminate, 6000);
})();
