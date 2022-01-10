const dotenv = require("dotenv");
dotenv.config();

const Redis = require("ioredis");
const { dateToMMDD } = require("./utils");
const redis = new Redis(process.env.REDIS);

const { MessageActionRow, MessageButton } = require("discord.js");

const weekDayJp = ["日", "月", "火", "水", "木", "金", "土"];

module.exports = async (channel, title, description) => {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - baseDate.getDay());
  
  const config = JSON.parse(await redis.get(channel.id));

  const days = [];

  const newConfig = {
    guildId: config.guildId,
    channelId: config.channelId,
    title: config.title,
    description: config.description,
  }
  const fields = [...Array(7)].map((_, i) => {
    const field = {
      name: `${baseDate.getMonth() + 1}/${baseDate.getDate()}(${weekDayJp[baseDate.getDay()]})`,
      value: "> -",
      inline: true,
    }

    days.push(baseDate.getFullYear() + dateToMMDD(baseDate));
    newConfig[baseDate.getFullYear() + dateToMMDD(baseDate)] = {
      participants: [],
    };
    baseDate.setDate(baseDate.getDate() + 1);
    return field;
  });

  await redis.set(channel.id, JSON.stringify(newConfig));

  const message = await channel.send({
    content: "@everyone",
    embeds: [
      {
        title,
        description,
        fields,
      }
    ],
    components: [
      new MessageActionRow().addComponents([
        new MessageButton({ customId: days[0], style: "PRIMARY", label: weekDayJp[0] }),
        new MessageButton({ customId: days[1], style: "PRIMARY", label: weekDayJp[1] }),
        new MessageButton({ customId: days[2], style: "PRIMARY", label: weekDayJp[2] }),
        new MessageButton({ customId: days[3], style: "PRIMARY", label: weekDayJp[3] }),
      ]),
      new MessageActionRow().addComponents([
        new MessageButton({ customId: days[4], style: "PRIMARY", label: weekDayJp[4] }),
        new MessageButton({ customId: days[5], style: "PRIMARY", label: weekDayJp[5] }),
        new MessageButton({ customId: days[6], style: "PRIMARY", label: weekDayJp[6] }),
      ]),
    ],
  });

  await redis.set(channel.id, JSON.stringify({
    ...newConfig,
    messageId: message.id,
  }));
}
