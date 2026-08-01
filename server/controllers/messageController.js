const Messages = require("../models/messageModel");

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ createdAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        _id: msg._id,
        fromSelf: msg.sender.toString() === from,
        ciphertext: msg.ciphertext,
        iv: msg.iv,
        sender: msg.sender.toString(),
        createdAt: msg.createdAt,
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const encryptedPayload = message && typeof message === "object"
      ? message
      : { ciphertext: message, iv: "" };

    const data = await Messages.create({
      ciphertext: encryptedPayload.ciphertext,
      iv: encryptedPayload.iv || "",
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};
