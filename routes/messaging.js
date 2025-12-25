import http from "http";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import db from "../db.js";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT ERROR ❌", err);
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcastUsers() {
  const users = [];

  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.username
    ) {
      users.push(client.username);
    }
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "online-users",
        users
      }));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("✅ Client connected");

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.error("Invalid JSON ❌");
      return;
    }

    /* ===== JOIN ===== */
    if (msg.type === "join") {
      ws.username = msg.user;
      console.log("👤 User joined:", ws.username);

      db.all(
        "SELECT user, message, date FROM messages ORDER BY id DESC LIMIT 20",
        (err, rows) => {
          if (err) {
            console.error("DB READ ERROR ❌", err);
            return;
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "chat",
              messages: rows.reverse()
            }));
          }
        }
      );

      broadcastUsers();
    }

    /* ===== MESSAGE ===== */
    if (msg.type === "message") {
      console.log("💬 Message:", msg.message);

      db.run(
        "INSERT INTO messages (user, message, date) VALUES (?, ?, ?)",
        [msg.user, msg.message, msg.date],
        (err) => {
          if (err) console.error("DB INSERT ERROR ❌", err);
          
        }
      );

      wss.clients.forEach((client) => {
        if (
          client.readyState === WebSocket.OPEN &&
          client.username
        ) {
          client.send(JSON.stringify(msg));
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("❌ Disconnected:", ws.username);
    broadcastUsers();
  });

  ws.on("error", (err) => {
    console.error("WS ERROR ❌", err);
  });
});

server.listen(8081, "0.0.0.0", () => {
  console.log("🚀 Server running on port 8081");
});
