const dotenv = require("dotenv");
dotenv.config();

const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS);

const { Client, Intents } = require("discord.js");

const createSchedule = require("./createSchedule");

const intents = new Intents();
intents.add(Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS);

const client = new Client({ intents });

client.on("ready", async () => {
  await Promise.all((await redis.keys("*")).map(async (channelId) => {
    const config = JSON.parse(await redis.get(channelId));
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
      redis.del(channelId);
      return;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      redis.del(channelId);
      return;
    }

    return createSchedule(channel, config.title, config.description);
  }));
  client.destroy();
  process.exit(1);
});

client.login(process.env.TOKEN);
