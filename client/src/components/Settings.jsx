import { useEffect, useRef } from "react";
import styled from "styled-components";
import Logout from "./Logout";

const Settings = ({ closeSettings }) => {
    const menuRef = useRef();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                closeSettings();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [closeSettings]);

    return (
        <Container ref={menuRef}>
            <div className="setting-modal">
                <ul>
                    <li>
                        <span>Enable 2FA</span>

                        <label className="switch">
                            <input type="checkbox" />
                            <span className="slider"></span>
                        </label>
                    </li>

                    <li className="logout">
                        <Logout />
                    </li>
                </ul>
            </div>
        </Container>
    );
};

export default Settings;

const Container = styled.div`
.setting-modal {
  position: absolute;
  bottom: 50px;
  right: -3em;

  width: 220px;

  background: #1b1b32;
  border: 1px solid #4e0eff;
  border-radius: 12px;

  padding: 8px 0;

  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
  z-index: 999;

  animation: fadeIn 0.25s ease;
}

.logout{
    border-top: 1px solid #4e0eff;
}

.setting-modal ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.setting-modal li {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 14px 18px;

  color: #fff;
  cursor: pointer;

  transition: background 0.2s ease;
}

.setting-modal li:hover {
  background: rgba(78, 14, 255, 0.15);
}

.setting-modal .logout {
  color: #ff5c5c;
  font-weight: 600;
}

/* Toggle Switch */

.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  display: none;
}

.slider {
  position: absolute;
  inset: 0;

  background: #666;
  border-radius: 999px;

  cursor: pointer;
  transition: 0.3s ease;
}

.slider::before {
  content: "";

  position: absolute;
  width: 18px;
  height: 18px;

  left: 3px;
  top: 3px;

  background: #fff;
  border-radius: 50%;

  transition: 0.3s ease;
}

.switch input:checked + .slider {
  background: #4e0eff;
}

.switch input:checked + .slider::before {
  transform: translateX(22px);
}

/* Modal Animation */

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
`;