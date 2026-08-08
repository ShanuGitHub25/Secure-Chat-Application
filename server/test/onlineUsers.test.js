const test = require("node:test");
const assert = require("node:assert/strict");
const userController = require("../controllers/userController");

test("logOut removes the user from the online users map", () => {
  global.onlineUsers = new Map([["user-1", "socket-1"]]);

  let statusCode;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    send() {
      return this;
    },
  };

  userController.logOut({ params: { id: "user-1" } }, res, () => {});

  assert.equal(statusCode, 200);
  assert.equal(global.onlineUsers.has("user-1"), false);
});
