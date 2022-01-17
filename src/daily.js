const dotenv = require("dotenv");
dotenv.config();

const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS);

const { Client, Intents } = require("discord.js");
const { dateToMMDD } = require("./utils");

const intents = new Intents();
intents.add(Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS);

const client = new Client({ intents });

const today = new Date();

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

    // delete yesterday.
    if (config.created) {
      await channel.threads.cache.get(config.created.threadId).delete();
    }

    const yyyymmdd = today.getFullYear() + dateToMMDD(today);

    const participants = config[yyyymmdd]?.participants ?? [];

    const thread = await channel.threads.create({
      startMessage: config.messageId,
      name: (config.title ? config.title + " - " : "")
        + today.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
        }),
    });
    const message = await thread.send(
      participants.length === 0
        ? "参加者なし"
        : participants.map(p => `<@${p}>`).join(" ")
    );

    await redis.set(channelId, JSON.stringify({
      ...config,
      [yyyymmdd]: {
        ...config[yyyymmdd],
      },
      created: {
        threadId: thread.id,
        messageId: message.id,
      },
    }));
  }));
  client.destroy();
  process.exit(1);
});

client.login(process.env.TOKEN);
