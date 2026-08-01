import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, host, setPublicKeyRoute } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import { ensureE2EEKeyPair } from "../utils/e2ee";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  useEffect(() => {
    const storedUser = localStorage.getItem(
      process.env.REACT_APP_LOCALHOST_KEY
    );
    if (!storedUser) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    if (!user) {
      navigate("/login");
      return;
    }

    setCurrentUser(user);
  }, [navigate]);
  useEffect(() => {
    const syncPublicKey = async () => {
      if (!currentUser?._id) return;
      try {
        const { publicKeyJwk } = await ensureE2EEKeyPair(currentUser._id);
        console.log("[E2EE] Syncing public key for user:", currentUser._id);
        const response = await axios.post(`${setPublicKeyRoute}/${currentUser._id}`, {
          publicKey: publicKeyJwk,
        });
        console.log("[E2EE] Public key sync successful:", response.status);
      } catch (error) {
        console.error("[E2EE] Failed to sync public key", error.message);
      }
    };

    if (currentUser) {
      socket.current = io(host);
      socket.current.emit("add-user", currentUser._id);
      syncPublicKey();
    }

    return () => {
      socket.current?.disconnect();
    };
  }, [currentUser]);

  useEffect(() => {
    const loadContacts = async () => {
      if (currentUser) {
        if (currentUser.isAvatarImageSet) {
          const data = await axios.get(`${allUsersRoute}/${currentUser._id}`);
          setContacts(data.data);
        } else {
          navigate("/setAvatar");
        }
      }
    };

    loadContacts();
  }, [currentUser, navigate]);
  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };
  return (
    <>
      <Container>
        <div className="container">
          <Contacts contacts={contacts} changeChat={handleChatChange} />
          {currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer currentChat={currentChat} socket={socket} />
          )}
        </div>
      </Container>
    </>
  );
}

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: #131324;
  .container {
    height: 85vh;
    width: 85vw;
    background-color: #00000076;
    display: grid;
    grid-template-columns: 25% 75%;
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
    }
  }
`;
