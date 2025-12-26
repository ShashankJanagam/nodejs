let socket = null;
let pc = null;
let localStream = null;
let socketReady = false;

let pendingCandidates = [];

window.onload = () => {

  socket = new WebSocket("wss://nodejs-eng5.onrender.com");

  socket.onopen = () => {
    console.log("WebSocket connected");
    socketReady = true;
  };

  socket.onmessage = async (e) => {
    const text = e.data instanceof Blob ? await e.data.text() : e.data;
    const data = JSON.parse(text);

    /* ONLINE USERS LIST */
    if (data.type === "online-users") {
      const onlineDiv = document.getElementById("online");
      onlineDiv.innerHTML = "";

      data.users.forEach((user) => {
        const div = document.createElement("div");
        div.innerText = `🟢 ${user}`;
        onlineDiv.appendChild(div);
      });
      return;
    }

    /* INCOMING CALL */
    if (data.type === "video-call-incoming") {
      if (confirm(`Video Call request from ${data.from}. Accept?`)) {
        socket.send(JSON.stringify({
          type: "video-call-accept",
          from: data.from
        }));
      }
      return;
    }

    /* CALLER: start offer */
    if (data.type === "video-call-start-offer") {
      await createPeerConnection();
      await getMedia();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.send(JSON.stringify({
        type: "webrtc-offer",
        offer
      }));

      return;
    }

    /* RECEIVER: got offer → set remote → send answer */
    if (data.type === "webrtc-offer") {

      await createPeerConnection();
      await getMedia();

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

      // flush buffered ICE if any
      for (const c of pendingCandidates) {
        try {
          await pc.addIceCandidate(c);
        } catch {}
      }
      pendingCandidates = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.send(JSON.stringify({
        type: "webrtc-answer",
        answer
      }));

      return;
    }

    /* CALLER receives answer */
    if (data.type === "webrtc-answer") {

      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

      // flush buffered ICE if any
      for (const c of pendingCandidates) {
        try {
          await pc.addIceCandidate(c);
        } catch {}
      }
      pendingCandidates = [];

      return;
    }

    /* ICE candidate */
    if (data.type === "ice-candidate") {

      // remote description not yet set → buffer
      if (!pc || !pc.remoteDescription) {
        pendingCandidates.push(data.candidate);
        return;
      }

      try {
        await pc.addIceCandidate(data.candidate);
      } catch (e) {
        console.log("ICE add failed but ignored:", e);
      }

      return;
    }
  };

  socket.onclose = () => {
    console.log("WebSocket closed");
    socketReady = false;
  };
};


/* START CALL */
function startVideoCall() {
  if (!socketReady) {
    alert("Please wait, WebSocket not connected yet");
    return;
  }

  const to = document.getElementById("peer").value.trim();

  socket.send(JSON.stringify({
    type: "video-call-request",
    to
  }));
}


/* PEER CONNECTION */
async function createPeerConnection() {

  if (pc) return;

  pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.ontrack = (e) => {
    document.getElementById("remoteVideo").srcObject = e.streams[0];
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.send(JSON.stringify({
        type: "ice-candidate",
        candidate: e.candidate
      }));
    }
  };
}


/* MEDIA */
async function getMedia() {
  if (localStream) return;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  document.getElementById("localVideo").srcObject = localStream;

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });
}


/* END CALL */
function endCall() {
  if (pc) pc.close();
  pc = null;

  if (localStream)
    localStream.getTracks().forEach(t => t.stop());

  localStream = null;
}
