const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS);

module.exports = {
  name: "unregister",
  async execute(message) {
    if (!await redis.exists(message.channelId)) {
      message.channel.send("This channel is not registered.");
      return;
    }

    await redis.del(message.channelId);

    message.channel.send("Unregistered this channel.");
  },
};
