import React from "react";
import { useNavigate } from "react-router-dom";
import { IoLogInOutline } from "react-icons/io5";
import styled from "styled-components";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";
export default function Logout() {
  const navigate = useNavigate();
  const handleClick = async () => {
    const storedUser = localStorage.getItem(
      process.env.REACT_APP_LOCALHOST_KEY
    );
    if (!storedUser) {
      localStorage.clear();
      navigate("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    if (!user?._id) {
      localStorage.clear();
      navigate("/login");
      return;
    }

    const data = await axios.get(`${logoutRoute}/${user._id}`);
    if (data.status === 200) {
      localStorage.removeItem(process.env.REACT_APP_LOCALHOST_KEY);
      navigate("/login");
    }
  };
  return (
    <LogOut onClick={handleClick}>
      <span>Log Out </span>
      <IoLogInOutline className="logout-icon" />
    </LogOut>

  );
}

const LogOut = styled.div`
display: flex;
align-items: center;
justify-content: center;
gap: 1em;
font-size: 1.5rem;

span{
  font-size: 1rem;
}
.logout-icon{
    position: relative;
    right: -4rem;
  }
  
`;
