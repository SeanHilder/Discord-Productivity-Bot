require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// login bot
client.login(DISCORD_TOKEN);

// ready
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Command registry
const commands = new Map();

// Help command
commands.set("!help", {
  description: "Shows this help message",
  handler: (message) => {
    let helpText = "Here are the available commands:\n";
    commands.forEach((cmd, name) => {
      helpText += `${name}: ${cmd.description}\n`;
    });
    message.reply(helpText);
  },
});

// messageCreate
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  console.log(message.content);

  const content = message.content.trim();

  const words = message.content.split(" ");
  console.log(words);
  // Used to check if the command is valid
  if (commands.has(words[0])) {
    commands.get(words[0]).handler(message, content);
  } else {
    message.reply("Unknown command. Use !help for available commands.");
  }
});
