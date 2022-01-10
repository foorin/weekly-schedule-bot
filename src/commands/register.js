const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS);

const createSchedule = require("../createSchedule");

module.exports = {
  name: "register",
  async execute(message, args) {
    if (await redis.exists(message.channelId)) {
      message.channel.send("This channel is already registered.");
      return;
    }

    const config = {
      guildId: message.guildId,
      channelId: message.channelId,
      title: args[0],
      description: args[1],
    };

    const result = await redis.set(message.channelId, JSON.stringify(config));

    if (result !== "OK") {
      message.channel.send("Woops, error.");
      return;
    }

    createSchedule(message.channel, config.title, config.description);
  },
};
