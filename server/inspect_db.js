const mongoose = require('mongoose');
const User = require('./models/userModel');
const Message = require('./models/messageModel');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/chat');
  const users = await User.find({ username: { $in: ['TestUser1', 'TestUser2'] } }).lean();
  console.log('USERS');
  console.log(JSON.stringify(users, null, 2));
  const msgs = await Message.find({}).sort({ createdAt: 1 }).lean();
  console.log('MESSAGE_COUNT', msgs.length);
  console.log(JSON.stringify(msgs, null, 2));
  process.exit(0);
})();
