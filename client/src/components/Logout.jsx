import React from "react";
import { useNavigate } from "react-router-dom";
import { IoLogInOutline } from "react-icons/io5";
import styled from "styled-components";
import axios from "axios";
import { logoutRoute } from "../utils/APIRoutes";
export default function Logout() {
  const navigate = useNavigate();
  const handleClick = async () => {
    const id = await JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    )._id;
    const data = await axios.get(`${logoutRoute}/${id}`);
    if (data.status === 200) {
      localStorage.clear();
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
