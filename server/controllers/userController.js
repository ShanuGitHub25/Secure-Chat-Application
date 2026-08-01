const mongoose = require("mongoose");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password, publicKey } = req.body;
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      publicKey: publicKey || null,
    });
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = {};

    if (id && mongoose.Types.ObjectId.isValid(id)) {
      query._id = { $ne: id };
    }

    const users = await User.find(query).select([
      "email",
      "username",
      "avatarImage",
      "_id",
      "publicKey",
    ]);
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(
      userId,
      {
        isAvatarImageSet: true,
        avatarImage,
      },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports.setPublicKey = async (req, res, next) => {
  try {
    const { publicKey } = req.body;
    const userId = req.params.id;
    if (!userId) return res.json({ msg: "User id is required", status: false });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { publicKey },
      { new: true }
    );

    if (!updatedUser) {
      return res.json({ msg: "User not found", status: false });
    }

    return res.json({ status: true, publicKey: updatedUser.publicKey });
  } catch (ex) {
    next(ex);
  }
};

module.exports.logOut = (req, res, next) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ msg: "User id is required", status: false });
    }

    if (!global.onlineUsers) {
      global.onlineUsers = new Map();
    }

    global.onlineUsers.delete(req.params.id);
    return res.status(200).json({ status: true });
  } catch (ex) {
    next(ex);
  }
};
