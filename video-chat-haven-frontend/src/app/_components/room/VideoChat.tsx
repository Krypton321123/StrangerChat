"use client";
import { useUserStore } from "@/store/userStore";
import { createRef, RefObject, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import FloatingDock from "./FloatingDock";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};
const VideoChat = ({
  socket,
  users,
  roomId,
}: {
  socket: Socket;
  users: { socketId: string; userId: string; nick: string }[];
  roomId: string;
}) => {
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const userNick = useUserStore((state) => state.nick);
  const senderRef = useRef<RTCPeerConnection | null>(null);
  const receiverRefs = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [receiverStreams, setReceiverStreams] = useState<
    Map<string, MediaStream>
  >(new Map());

  // whole sending process here;
  useEffect(() => {
    const getUserMediaAndSendToServer = async () => {
      if (!userVideoRef || !userVideoRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      userVideoRef.current.srcObject = stream;
      userVideoRef.current.onloadedmetadata = () => {
        userVideoRef.current?.play();
      };

      const localStream = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
        socket.emit("senderCandidate", ev.candidate);
      };

      pc.ontrack = (ev: RTCTrackEvent) => {
        if (localStream) {
          localStream.getTracks().forEach((t) => localStream.addTrack(t));
        }
      };

      senderRef.current = pc;

      let sdp = await senderRef.current.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await senderRef.current.setLocalDescription(sdp);

      socket.emit("senderOffer", roomId, sdp);
    };
    if (!socket) return;
    getUserMediaAndSendToServer();
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    // server tells us a new user's stream is ready to be pulled
    socket.on("new-user-enter", (senderId: string) => {
      if (!receiverRefs.current.has(senderId)) {
        createRecieveOffer(roomId, senderId, socket);
      }
    });

    return () => {
      socket.off("new-user-enter");
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on("getSenderAnswer", async ({ sdp }) => {
      await senderRef.current?.setRemoteDescription(sdp);
    });

    socket.on("getSenderCandidate", async ({ candidate }) => {
      if (candidate) await senderRef.current?.addIceCandidate(candidate);
    });

    socket.on("getReceiverAnswer", async ({ id, sdp }) => {
      const pc = receiverRefs.current.get(id);
      await pc?.setRemoteDescription(sdp);
    });

    socket.on("getRecieverCandidate", async ({ id, candidate }) => {
      if (candidate) {
        const pc = receiverRefs.current.get(id);
        await pc?.addIceCandidate(candidate);
      }
    });

    return () => {
      socket.off("getSenderAnswer");
      socket.off("getSenderCandidate");
      socket.off("getReceiverAnswer");
      socket.off("getRecieverCandidate");
    };
  }, [socket]);

  const createRecieveOffer = async (
    roomId: string,
    socketId: string,
    socket: Socket,
  ) => {
    // first let's create a receiver peer conn

    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (!receiverRefs.current.has(socketId))
      receiverRefs.current.set(socketId, pc);
    else;

    pc.onicecandidate = (ev: RTCPeerConnectionIceEvent) => {
      if (ev.candidate) {
        socket.emit("receiverCandidate", {
          roomId,
          id: socketId,
          candidate: ev.candidate,
        });
      }
    };

    pc.ontrack = (ev: RTCTrackEvent) => {
      setReceiverStreams((prev) => {
        const next = new Map(prev);
        next.set(socketId, ev.streams[0]);
        return next;
      });
    };

    // now creating offer

    const sdp = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await pc.setLocalDescription(new RTCSessionDescription(sdp));

    socket.emit("receiverOffer", {
      roomId,
      sdp,
      senderId: socketId,
    });
  };

  return (
    <div className="w-full h-full z-0 ">
      <div className="w-full flex justify-center ">
        <FloatingDock />
      </div>
      <div className="grid h-full justify-end place-items-center grid-cols-2 gap-x-2  p-4">
        <div className="relative h-[20vh] w-[38vw] lg:w-[30vw] lg:h-[30vh] rounded-xl bg-[#1A1A1B] flex justify-center items-center">
            <p className="absolute bottom-5 left-5 text-white">hi</p>
            <video  className="h-full w-full object-center rounded-xl" autoPlay ref={userVideoRef}></video>
        </div>
        {receiverStreams.size !== 0 &&
          Array.from(receiverStreams).map(([socketId, stream]) => (
            <div
              key={socketId}
              className="h-[20vh] w-[38vw] lg:w-[30vw] lg:h-[30vh] rounded-xl bg-[#1A1A1B] flex justify-center items-center"
            >
                <video
                  autoPlay
                  className="w-full object-cover h-full rounded-xl"
                  ref={(el) => {
                    if (el && el.srcObject !== stream) el.srcObject = stream;
                  }}
                ></video>
            </div>
          ))}
      </div>
    </div>
  );
};

export default VideoChat;
