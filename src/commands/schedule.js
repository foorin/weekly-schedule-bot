const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS);

const createSchedule = require("../createSchedule");

const register = async (interaction) => {
  if (await redis.exists(interaction.channelId)) {
    interaction.reply({
      content: "This channel is already registered.",
      ephemeral: true,
    });
    return;
  }

  const config = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    title: interaction.options.getString("title"),
    description: interaction.options.getString("description"),
  };

  const result = await redis.set(interaction.channelId, JSON.stringify(config));

  if (result !== "OK") {
    interaction.reply({
      content: "Woops, error.",
      ephemeral: true,
    });
    return;
  }

  createSchedule(interaction.channel, config.title, config.description);

  interaction.reply({
    content: "Registered schedule.",
    ephemeral: true,
  });
};

const unregister = async (interaction) => {
  if (!(await redis.exists(interaction.channelId))) {
    interaction.reply({
      content: "This channel is not registered.",
      ephemeral: true,
    });
    return;
  }

  await redis.del(interaction.channelId);

  interaction.reply({
    content: "Unregistered this channel.",
    ephemeral: true,
  });
};

module.exports = {
  data: {
    name: "schedule",
    description: "Management weekly schedule.",
    options: [
      {
        type: "SUB_COMMAND",
        name: "register",
        description: "registering weekly schedule.",
        options: [
          {
            type: "STRING",
            name: "title",
            description: "Schedule title",
            required: true,
          },
          {
            type: "STRING",
            name: "description",
            description: "Schedule description",
            required: true,
          },
        ],
      },
      {
        type: "SUB_COMMAND",
        name: "unregister",
        description: "unregistering schedule.",
      },
    ],
  },
  async execute(interaction) {
    if (interaction.commandName !== "schedule") {
      return;
    }

    switch (interaction.options.getSubcommand()) {
      case "register":
        register(interaction);
        break;
      case "unregister":
        unregister(interaction);
        break;
      default:
        return;
    }
  },
};
