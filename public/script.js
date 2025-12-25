let socket = null;
let pc=null
let localStream=null

window.onload=()=> {

      socket = new WebSocket("wss://nodejs-eng5.onrender.com:5500");

      socket.onopen = () => {
        console.log("WebSocket connected");

        const div = document.createElement("div");


      };

      socket.onmessage = async (e) => {
        const text = e.data instanceof Blob ? await e.data.text() : e.data;
        const data = JSON.parse(text);

        /* ===== CHAT HISTORY ===== */
      

        /* ===== SINGLE MESSAGE ===== */
      

        /* ===== ONLINE USERS ===== */
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

        if (data.type === "video-call-incoming") {
          if (confirm(`Video Call request from ${data.from}. Accept?`)) {
            socket.send(JSON.stringify({
              type: "video-call-accept",
              from: data.from
            }));
          }
          return
        }


        if(data.type=="video-call-start-offer"){
            await createPeerConnection();
            await getMedia();

            const offer=await pc.createOffer();
            await pc.setLocalDescription(offer)
            socket.send(JSON.stringify({
                type:"webrtc-offer",
                offer
            }))
            return
        
        }

        if(data.type=="webrtc-offer"){
            await createPeerConnection();
            await getMedia();
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
            const answer=await pc.createAnswer();
            await pc.setLocalDescription(answer)
            socket.send(JSON.stringify({
                type:"webrtc-answer",
                answer
            }))
            return
        }

        if(data.type=="webrtc-answer"){
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            return
        }

        if(data.type=="ice-candidate"){
            try{
                await pc.addIceCandidate(data.candidate)
            }catch(e){
                console.log(e)

            }
            return

        }

      };

      socket.onclose = () => {
        console.log("WebSocket closed");
      };
    
    
}


function startVideoCall(){
        const to=document.getElementById("peer").value.trim()
        socket.send(JSON.stringify({type:"video-call-request",to}))
}

async function createPeerConnection(){
    pc=new RTCPeerConnection({
        iceServers:[{urls:"stun:stun.l.google.com:19302"}]

    })

    pc.ontrack=(e)=>{
        document.getElementById("remoteVideo").srcObject=e.streams[0]
    }

    pc.onicecandidate=(e)=>{
        if(e.candidate){
            socket.send(JSON.stringify({
                type:"ice-candidate",
                candidate:e.candidate
            }))
        }
    }
}

async function getMedia(){
    localStream=await navigator.mediaDevices.getUserMedia({
        video:true,
        audio:true
    })

    document.getElementById("localVideo").srcObject=localStream
    localStream.getTracks().forEach(track=>{
        pc.addTrack(track,localStream)
    })
}

function endCall(){
    if(pc) pc.close()
    if(localStream) localStream.getTracks().forEach(t=>t.stop())
}