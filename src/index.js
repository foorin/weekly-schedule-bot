const dotenv = require("dotenv");
dotenv.config();

const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS);

const fs = require("fs");

const { Client, Intents, Collection } = require("discord.js");

const intents = new Intents();
intents.add(Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS);

const client = new Client({ intents });
client.commands = new Collection();

const commandFiles = fs.readdirSync("./src/commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  // set a new item in the Collection
  // with the key as the command name and the value as the exported module
  client.commands.set(command.name, command);
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.mentions.has(client.user.id)) {
    return;
  }

  if (message.content.includes("@here") || message.content.includes("@everyone") || message.type == "REPLY") {
    return false;
  }

  const args = message.content.replace(/<@![0-9]+>/g, "").trim().split(" ");
  const command = args.shift().toLowerCase();

  if (!client.commands.has(command)) {
    return;
  }

  try {
    client.commands.get(command).execute(message, args);
    message.delete();
  } catch (error) {
    console.error(error);
    message.reply("there was an error trying to execute that command.");
  }
});

client.on("interactionCreate", async (interaction) => {
  const message = interaction.message;
  const embed = message.embeds[0];
  if (!embed) {
    return;
  }

  const yyyymmdd = interaction.component.customId;

  const config = JSON.parse(await redis.get(interaction.channelId));
  if (!config) {
    interaction.reply("This channel is not registered.");
    return;
  }

  const participants = config[yyyymmdd]?.participants;
  if (!participants) {
    interaction.reply("This schedule is done.");
    return;
  }

  const join = !participants.includes(interaction.user.id);

  const replaced = join
    ? (participants.some(p => p === interaction.user.id)
      ? participants
      : [...participants, interaction.user.id]
    )
    : participants.filter(p => p !== interaction.user.id);

  const result = await redis.set(interaction.channelId, JSON.stringify({
    ...config,
    [yyyymmdd]: {
      created: config[yyyymmdd]?.created,
      participants: replaced,
    },
  }));

  if (result !== "OK") {
    interaction.reply("Erorr");
    return;
  }

  const day = new Date(
    yyyymmdd.substring(0, 4),
    parseInt(yyyymmdd.substring(4, 6)) - 1,
    yyyymmdd.substring(6, 8),
  ).getDay();

  const field = embed.fields[day];
  if (replaced.length === 0) {
    field.value = "> -";
  } else {
    field.value = replaced.map(p => `> <@${p}>`).join("\n");
  }

  if (config[yyyymmdd].created) {
    const thread = interaction.channel.threads.cache.get(config[yyyymmdd].created.threadId);
    const message = thread.messages.cache.get(config[yyyymmdd].created.messageId);
    await message?.edit(
      replaced.length === 0
        ? "参加者なし"
        : replaced.map(p => `<@${p}>`).join(" ")
    );
  }

  return interaction.update({
    embeds: [
      embed,
    ],
    components,
  });

});

client.login(process.env.TOKEN);
