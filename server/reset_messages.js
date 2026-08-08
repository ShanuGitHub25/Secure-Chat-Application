const mongoose = require('mongoose');
const Messages = require('./models/messageModel');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/chat');
  await Messages.deleteMany({});
  console.log('deleted all messages');
  process.exit(0);
})();
