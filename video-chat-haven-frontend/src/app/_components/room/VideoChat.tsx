"use client";
import { useUserStore } from "@/store/userStore";
import {
  createRef,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  console.log(receiverRefs);
  const createRecieveOffer = useCallback(
    async (roomId: string, socketId: string, socket: Socket) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (!receiverRefs.current.has(socketId)) {
        receiverRefs.current.set(socketId, pc);
      } else return; // already exists, bail early

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
    },
    [],
  );

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
        console.log("came in here", senderId);
        createRecieveOffer(roomId, senderId, socket);
      }
    });

    return () => {
      socket.off("new-user-enter");
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on("existing-streams-ready", (ids) => {
      console.log("received", ids);
      ids.forEach((i: string) => {
        if (i === socket.id) return;
        if (receiverRefs.current.has(i)) return;
        createRecieveOffer(roomId, i, socket);
      });
    });
  }, [socket, roomId, createRecieveOffer]);

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

  return (
    <div className="w-full min-h-full overflow-hidden z-0">
      {/* <div className="w-full flex justify-center ">
        <FloatingDock />
      </div> */}
      <div className="flex  gap-8 p-4 content-center justify-around flex-wrap h-full">
        <div className="relative h-fit w-[38vw] lg:w-[30vw] aspect-video  rounded-xl bg-[#1A1A1B] flex justify-center items-center">
          <p className="absolute bottom-5 left-5  rounded-lg bg-[#1B1212] opacity-50 font-medium px-2  text-white">
            {userNick}
          </p>
          <video
            className="h-full w-full object-cover rounded-xl"
            autoPlay
            ref={userVideoRef}
          ></video>
        </div>
        {receiverStreams.size !== 0 &&
          Array.from(receiverStreams).map(([socketId, stream]) => (
            <div
              key={socketId}
              className="relative w-[38vw] lg:w-[30vw] h-fit aspect-video rounded-xl bg-[#1A1A1B] flex justify-center items-center"
            >
              <p className="absolute bottom-5 left-5  rounded-lg bg-[#1B1212] opacity-50 font-medium px-2  text-white">
                {users.find((u) => u.socketId === socketId)?.nick || ""}
              </p>
              <video
                autoPlay
                className="w-full object-cover h-full rounded-xl"
                ref={(el) => {
                  if (el && el.srcObject !== stream) el.srcObject = stream;
                }}
              ></video>
            </div>
          ))}
        <div className="relative h-[12vh] w-[38vw] flex-col lg:w-[30vw] lg:h-[30vh] rounded-xl bg-[#1A1A1B] flex justify-center items-center">
          <button
            onClick={() => {
              socket.emit("find-partner-room", roomId);
            }}
            className="p-3 bg-white cursor-pointer hover:scale-110 transition-all duration-150 text-black w-8 h-8 lg:w-12 lg:h-12 text-xl flex justify-center items-center rounded-full"
          >
            +
          </button>
          <p className="text-lg text-white mt-2">Add</p>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
