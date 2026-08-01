import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute } from "../utils/APIRoutes";
import { decryptMessage, ensureE2EEKeyPair, encryptMessage, parsePublicKey } from "../utils/e2ee";

export default function ChatContainer({ currentChat, socket }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef();
  const [arrivalMessage, setArrivalMessage] = useState(null);

  useEffect(() => {
    const loadMessages = async () => {
      if (!currentChat) return;

      const storedUser = localStorage.getItem(
        process.env.REACT_APP_LOCALHOST_KEY
      );
      if (!storedUser) return;

      const data = JSON.parse(storedUser);
      if (!data?._id) return;

      const response = await axios.post(recieveMessageRoute, {
        from: data._id,
        to: currentChat._id,
      });

      const { privateKeyJwk } = await ensureE2EEKeyPair(data._id);
      const peerPublicKey = parsePublicKey(currentChat.publicKey);
      const decryptedMessages = await Promise.all(
        response.data.map(async (message) => {
          if (!message.ciphertext || !message.iv) {
            return {
              ...message,
              message: message.message || "[Encrypted message unavailable]",
            };
          }

          // Skip decryption if we don't have a valid peer public key
          if (!peerPublicKey) {
            return {
              ...message,
              message: "[Cannot decrypt - invalid key]",
            };
          }

          const decrypted = await decryptMessage(
            message.ciphertext,
            message.iv,
            peerPublicKey,
            privateKeyJwk
          );

          return {
            ...message,
            message: decrypted?.decryptionFailed
              ? "[Unable to decrypt]"
              : decrypted?.message || "[Encrypted message unavailable]",
          };
        })
      );

      setMessages(decryptedMessages);
    };

    loadMessages();
  }, [currentChat]);

  const handleSendMsg = async (msg) => {
    const storedUser = localStorage.getItem(
      process.env.REACT_APP_LOCALHOST_KEY
    );
    if (!storedUser) return;

    const data = JSON.parse(storedUser);
    if (!data?._id) return;

    if (!currentChat?.publicKey) {
      console.warn("[E2EE] Cannot send message - no peer public key");
      return;
    }

    const peerPublicKey = parsePublicKey(currentChat.publicKey);
    if (!peerPublicKey) {
      console.warn("[E2EE] Cannot send message - invalid peer public key");
      return;
    }

    const { privateKeyJwk } = await ensureE2EEKeyPair(data._id);
    const encryptedPayload = await encryptMessage(
      msg,
      peerPublicKey,
      privateKeyJwk
    );

    if (!encryptedPayload) {
      return;
    }

    const outgoingMessage = {
      ...encryptedPayload,
      from: data._id,
      to: currentChat._id,
      timestamp: Date.now(),
    };

    socket.current?.emit("send-msg", {
      to: currentChat._id,
      from: data._id,
      msg: outgoingMessage,
    });

    await axios.post(sendMessageRoute, {
      from: data._id,
      to: currentChat._id,
      message: encryptedPayload,
    });

    setMessages((prev) => [
      ...prev,
      { fromSelf: true, message: msg, _id: uuidv4() },
    ]);
  };

  useEffect(() => {
    if (!socket.current || !currentChat) return;

    const currentSocket = socket.current;
    const handleIncomingMessage = async (msg) => {
      if (!msg || msg.from !== currentChat._id) return;

      const storedUser = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const { privateKeyJwk } = await ensureE2EEKeyPair(currentUser?._id);
      const peerPublicKey = parsePublicKey(currentChat.publicKey);
      if (!peerPublicKey) {
        setArrivalMessage({
          fromSelf: false,
          message: "[Cannot decrypt - invalid key]",
        });
        return;
      }
      const decrypted = await decryptMessage(
        msg.ciphertext,
        msg.iv,
        peerPublicKey,
        privateKeyJwk
      );

      setArrivalMessage({
        fromSelf: false,
        message: decrypted?.decryptionFailed
          ? "[Unable to decrypt]"
          : decrypted?.message || "[Encrypted message unavailable]",
      });
    };

    currentSocket.on("msg-recieve", handleIncomingMessage);
    return () => currentSocket.off("msg-recieve", handleIncomingMessage);
  }, [currentChat, socket]);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img
              src={currentChat.avatarImage}
              alt=""
            />
          </div>
          <div className="username">
            <h3>{currentChat.username}</h3>
          </div>
        </div>
        
      </div>
      <div className="chat-messages">
        {messages.map((message) => {
          return (
            <div ref={scrollRef} key={uuidv4()}>
              <div
                className={`message ${
                  message.fromSelf ? "sended" : "recieved"
                }`}
              >
                <div className="content ">
                  <p>{message.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ChatInput handleSendMsg={handleSendMsg} />
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    border-radius: 5px;
    background-color: rgb(76, 46, 209);
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .avatar {
        img {
          height: 3rem;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: rgb(58, 55, 78);
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: rgb(76, 46, 209);
      }
    }
  }
  .gpNLio{
  	background-color: rgb(210, 32, 39);
  }
`;
