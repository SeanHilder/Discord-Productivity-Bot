require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const path = require("path");
const fs = require("fs").promises;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TASKS_FILE = path.join(__dirname, "tasks.json");

// Load tasks from file or initialize empty array
let tasks = [];
async function loadTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, "utf8");
    tasks = JSON.parse(data);
    // Convert createdAt to number if necessary
    tasks = tasks.map((task) => ({
      ...task,
      createdAt:
        typeof task.createdAt === "string"
          ? new Date(task.createdAt).getTime()
          : task.createdAt ?? Date.now(),
      id: task.id ?? `${task.userId}-${task.createdAt}`,
    }));
    // Set up reminders for pending tasks
    const now = Date.now();
    tasks.forEach((task) => {
      const remaining = task.createdAt + task.reminderTime - now;
      if (remaining > 0) {
        setTimeout(async () => {
          const taskIndex = tasks.findIndex((t) => t.id === task.id);
          if (taskIndex !== -1) {
            const channel = client.channels.cache.get(task.channelId);
            if (channel) {
              channel.send(
                `<@${task.userId}> Reminder: "${task.taskDescription}"`
              );
            }
            tasks.splice(taskIndex, 1);
            await saveTasks();
          }
        }, remaining);
      }
    });
    // Remove expired tasks
    tasks = tasks.filter(
      (task) => task.createdAt + task.reminderTime - now > 0
    );
    await saveTasks(); // Save after filtering
  } catch (error) {
    tasks = [];
    await saveTasks();
  }
}

// Save tasks to file
async function saveTasks() {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// login bot
client.login(DISCORD_TOKEN);

// ready
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  loadTasks();
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

// Pomodoro timer command
commands.set("!pomodoro", {
  description: "Starts a pomodoro timer",
  handler: (message) => {
    let words = message.content.split(" ");
    let minutes = parseInt(words[1], 10);
    if (words.length > 1 && !isNaN(minutes) && minutes > 0) {
      message.reply(`Pomodoro timer started for ${minutes} minutes.`);
      setTimeout(() => {
        message.reply("Time's up!");
      }, minutes * 60 * 1000);
    } else {
      message.reply(
        "Invalid input. Please provide a positive number of minutes. Use !help for available commands."
      );
    }
  },
});

commands.set("!task", {
  description:
    "Create a task with a reminder (usage: !task [description] [minutes])",
  handler: async (message) => {
    const parts = message.content.split(" ");
    if (parts.length < 3) {
      message.reply("Usage: !task [description] [minutes]");
      return;
    }
    const reminderStr = parts.pop();
    const taskDescription = parts.slice(1).join(" ");
    const reminder = parseInt(reminderStr, 10);
    if (isNaN(reminder) || reminder <= 0) {
      message.reply(
        "Invalid reminder time. Please provide a positive number of minutes."
      );
      return;
    }
    const task = {
      id: `${message.author.id}-${Date.now()}`,
      userId: message.author.id,
      taskDescription,
      channelId: message.channel.id,
      createdAt: new Date().getTime(), // Store as timestamp for easier calculation
      reminderTime: reminder * 60 * 1000, // Convert minutes to milliseconds
    };

    tasks.push(task);
    await saveTasks();
    message.reply(
      `Task created: "${taskDescription}" with reminder in ${reminder} minutes`
    );
    setTimeout(async () => {
      const taskIndex = tasks.findIndex((t) => t.id === task.id);
      if (taskIndex !== -1) {
        const channel = client.channels.cache.get(task.channelId);
        if (channel) {
          channel.send(`<@${task.userId}> Reminder: "${task.taskDescription}"`);
        }
        // Remove task after reminder
        tasks.splice(taskIndex, 1);
        await saveTasks();
      }
    }, task.reminderTime);
  },
});

// messageCreate
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  const words = message.content.split(" ");
  // Used to check if the command is valid
  if (commands.has(words[0])) {
    commands.get(words[0]).handler(message, content);
  } else {
    message.reply("Unknown command. Use !help for available commands.");
  }
});
