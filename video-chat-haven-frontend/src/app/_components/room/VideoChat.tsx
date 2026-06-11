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
  const userVideoRef = useRef<HTMLVideoElement | undefined>(undefined);
  const userStreamRef = useRef<MediaStream | null>(null);
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const peerVideoRefs = useRef<Map<string, RefObject<HTMLVideoElement | null>>>(
    new Map(),
  );
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const pendingStreamRefs = useRef<Map<string, MediaStream>>(new Map());
  const peerConnectionRefs = useRef<Map<string, RefObject<RTCPeerConnection>>>(
    new Map(),
  );
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const userId = useUserStore((state) => state.userId);
  const userNick = useUserStore((state) => state.nick);


  useEffect(() => {
    const handleUserDevices = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      if (!userVideoRef.current) return;

      userStreamRef.current = stream;
      userVideoRef.current.srcObject = stream;

      setLocalStream(stream);

      userVideoRef.current.onloadedmetadata = () => {
        if (userVideoRef.current) userVideoRef.current.play();
      };
    };

    handleUserDevices();
  }, []);

  useEffect(() => {

    if (!socket || !users || users.length === 0) return;
    if (!localStream) return;
    if (!userStreamRef.current || !userStreamRef) return;

    users.forEach(async (u) => {
      if (u.userId === userId) return;
      if (peerConnectionRefs.current.has(u.userId)) return;

      if (userId > u.userId) return; 
      if (!peerVideoRefs.current.has(u.userId)) {
        peerVideoRefs.current.set(u.userId, createRef());
      }

      const peerConnection = createConnection(u.userId);

      userStreamRef!.current!.getTracks().forEach((track) => {
        peerConnection.addTrack(track, userStreamRef.current!);
      });

      const offer = await peerConnection.createOffer();
      peerConnection.setLocalDescription(offer);

      socket.emit("chat-offer", offer, roomId, userId, u.userId);
    });
  }, [socket, users, peerIds, localStream]);

  const createConnection = (peerId: string): RTCPeerConnection => {
    const peerConn = new RTCPeerConnection(ICE_SERVERS);

    const peerConnRef = { current: peerConn } as RefObject<RTCPeerConnection>;
    peerConnectionRefs.current.set(peerId, peerConnRef);

    peerConn.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket.emit("ice-candidate", ev.candidate, roomId, peerId, userId);
      }
    };

    peerConn.ontrack = (ev) => {
      const ref = peerVideoRefs.current.get(peerId);
      if (ref?.current) {
        ref.current.srcObject = ev.streams[0];
      } else {
        pendingStreamRefs.current.set(peerId, ev.streams[0]);
      }
    };


    setPeerIds((prev) => {
      return prev.includes(peerId) ? prev : [...prev, peerId];
    });

    return peerConn;
  };

  useEffect(() => {
    pendingStreamRefs.current.forEach((stream, peerId) => {
      const ref = peerVideoRefs.current.get(peerId);

      if (ref?.current) {
        ref.current.srcObject = stream;
        pendingStreamRefs.current.delete(peerId);
      }
    });
  }, [peerIds]);

  useEffect(() => {
    if (!socket) return;

    const handleOffer = async (
      offer: RTCSessionDescription,
      senderId: string,
    ) => {
      if (!userStreamRef.current) return;
      if (!peerVideoRefs.current.has(senderId)) {
        peerVideoRefs.current.set(senderId, createRef());
      }
      if (peerConnectionRefs.current.has(senderId)) {
        const existingConn = peerConnectionRefs.current.get(senderId)!;
        await existingConn.current.setRemoteDescription(offer);
        await flushIceCandidates(senderId);
        const answer = await existingConn.current.createAnswer();
        await existingConn.current.setLocalDescription(answer);
        socket.emit("chat-answer", answer, roomId, userId, senderId);
        return;
      }
      const peerConn = createConnection(senderId);
      userStreamRef.current.getTracks().forEach((track) => {
        peerConn.addTrack(track, userStreamRef.current!);
      });
      await peerConn.setRemoteDescription(offer);
      await flushIceCandidates(senderId);

      const answer = await peerConn.createAnswer();
      await peerConn.setLocalDescription(answer);
      socket.emit("chat-answer", answer, roomId, userId, senderId);
    };

    const handleAnswer = async (
      answer: RTCSessionDescription,
      peerId: string,
    ) => {
      const peerConn = peerConnectionRefs.current.get(peerId);
      if (!peerConn) return;
      await peerConn.current.setRemoteDescription(answer);
      await flushIceCandidates(peerId);
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [socket]);

  const handleIceCandidate = async (
    candidate: RTCIceCandidate,
    senderId: string,
  ) => {
    const pc = peerConnectionRefs.current.get(senderId);
    if (!pc) return;

    if (!pc.current.remoteDescription) {
      const queue = iceCandidateQueue.current.get(senderId) ?? [];
      queue.push(new RTCIceCandidate(candidate));
      iceCandidateQueue.current.set(senderId, queue);
      return;
    }

    await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const flushIceCandidates = async (peerId: string) => {
    const pc = peerConnectionRefs.current.get(peerId);
    const queue = iceCandidateQueue.current.get(peerId) ?? [];
    for (const candidate of queue) {
      await pc?.current.addIceCandidate(candidate);
    }
    iceCandidateQueue.current.set(peerId, []);
  };

  return (
    <div className="w-full h-full ">
      <div className="w-full flex justify-center ">
        <FloatingDock />
      </div>
      <div className="grid grid-cols-1 justify-center place-items-center lg:grid-cols-2 gap-x-2 gap-y-2 p-4">
        <div className=" rounded-full flex justify-center items-center p-4 bg-slate-600">
          <p className="text-white font-bold text-2xl">{userNick}</p>
          <video autoPlay ref={userVideoRef}></video>
        </div>
        {users.length !== 0 &&
          peerIds.map((p) => (
            <div
              key={p}
              className="h-[30vh] w-[30vw] rounded-xl bg-[#1A1A1B] flex justify-center items-center"
            >
              <div className=" rounded-full flex justify-center items-center p-4 bg-slate-600">
                <p className="text-white font-bold text-2xl">
                  {users.find((u) => u.userId === p)!.nick[0].toUpperCase() ||
                    "K"}
                </p>
                <video autoPlay ref={peerVideoRefs.current.get(p)}></video>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default VideoChat;
