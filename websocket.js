// websocket.js
import { WebSocketServer, WebSocket } from "ws";
import db from "./db.js";

export function initWebSocket(server, sessionMiddleware) {
  const wss = new WebSocketServer({ server });

  const userSockets=new Map()
  const activePrivatePairs=new Map()

  // ---------- ONLINE USERS BROADCAST ----------
  function broadcastUsers() {
    const users = [];

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.username) {
        users.push(client.username);
      }
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "online-users",
            users,
          })
        );
      }
    });
  }

  // ---------- CONNECTION ----------
  wss.on("connection", (ws, req) => {

    // attach session to WS request
    sessionMiddleware(req, {}, () => {
      if (!req.session || !req.session.user) {
        console.log("❌ WS rejected: not logged in");
        ws.close();
        return;
      }
    console.log("session at ws:", req.session);

      // set authenticated username
      ws.username = req.session.user.email;
      userSockets.set(ws.username,ws)
      console.log("🔐 WS connected:", ws.username);

      // ---------- SEND CHAT HISTORY ----------
    //   db.all(
    //     "SELECT user, message, date FROM messages ORDER BY id DESC LIMIT 20",
    //     (err, rows) => {
    //       if (err) {
    //         console.error("DB READ ERROR ❌", err);
    //         return;
    //       }

    //       if (ws.readyState === WebSocket.OPEN) {
    //         ws.send(
    //           JSON.stringify({
    //             type: "chat",
    //             messages: rows.reverse(),
    //           })
    //         );
    //       }
    //     }
    //   );

      // update online list
      broadcastUsers();

      // ---------- MESSAGE RECEIVED ----------
      ws.on("message", (raw) => {
        let msg;

        try {
          msg = JSON.parse(raw.toString());
        } catch {
          console.log("❌ Invalid JSON message");
          return;
        }

        if(msg.type=="video-call-request"){
            const target=msg.to
            const targetSocket=userSockets.get(target)

            if(!targetSocket){
                ws.send(JSON.stringify({
                    type:"call-status",
                    ok:false,
                    message:"user offline"
                }))

                return
            }

            targetSocket.send(JSON.stringify({
                type:"video-call-incoming",
                from:ws.username
            }))

            return
        }

        if(msg.type=="video-call-accept"){
            const caller=msg.from
            const callerSocket=userSockets.get(caller)

            if(!callerSocket) return

            activePrivatePairs.set(caller,ws.username)
            activePrivatePairs.set(ws.username,caller)


            callerSocket.send(JSON.stringify({
                type:"video-call-start-offer",
                with:ws.username
            }))
            return
        }

        if(msg.type=="webrtc-offer"){
            const peer=activePrivatePairs.get(ws.username)
            const peerSocket=userSockets.get(peer)

            if(!peerSocket) return
            peerSocket.send(JSON.stringify({

                type:"webrtc-offer",
                offer:msg.offer,
                from:ws.username

            }))

            return
        }

        if (msg.type === "webrtc-answer") {
            const peer = activePrivatePairs.get(ws.username);
            const peerSocket = userSockets.get(peer);
            if (!peerSocket) return;

            peerSocket.send(JSON.stringify({
                type: "webrtc-answer",
                answer: msg.answer,
                from: ws.username
            }));

        return;
        }

        if (msg.type === "ice-candidate") {
            const peer = activePrivatePairs.get(ws.username);
            const peerSocket = userSockets.get(peer);
            if (!peerSocket) return;

            peerSocket.send(JSON.stringify({
                type: "ice-candidate",
                candidate: msg.candidate
            }));

            return;
        }




       

       // ---------- PRIVATE CHAT ACCEPT ----------
                

       

      });

      

      // ---------- DISCONNECT ----------
      ws.on("close", () => {
        console.log("❌ Disconnected:", ws.username);
        userSockets.delete(ws.username)
        activePrivatePairs.delete(ws.username);

        broadcastUsers();
      });

      ws.on("error", (err) => {
        console.error("WS ERROR ❌", err);
      });
    });
  });

  console.log("💬 WebSocket server ready");
}
