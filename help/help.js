var util = require("util");

var ranks = require("../ranks/ranks");

// Discord client
var bot;

var help = {
    "ping": {
        "alias": [],
        "args": "",
        "desc": "Ping posbot"
    },
    "help": {
        "alias": ["halp", "man"],
        "args": "<command or keyword>",
        "desc": "Get help for a command or search for commands with a keyword"
    },
    "helpall": {
        "alias": [],
        "args": "",
        "desc": "Get description of all commands"
    },
    "notail": {
        "alias": [],
        "args": "",
        "desc": "Flower, river, rainbow which are you?"
    },
    "compliment": {
        "alias": [],
        "args": "[complimentee]",
        "desc": "Get a compliment sourced from some of the nicest subreddits, for yourself or a target"
    },
    "markov": {
        "alias": [],
        "args": "",
        "desc": "Get a markov generated response, include @posbot in any message to get a more personalised response"
    },
    "markov-chance": {
        "alias": [],
        "args": "",
        "desc": "See the current trigger chance for a markov message"
    },
    "quote": {
        "alias": ["q"],
        "args": "<messageID>",
        "desc": "Formats a quote of the message with the given ID (turn on dev mode to copy message IDs)"
    },
    "roll": {
        "alias": ["r"],
        "args": "<dice>",
        "desc": "Rolls the specified dice (d6, 2d4, d20) and returns result"
    },
    "heyruby": {
        "alias": [],
        "args": "",
        "desc": "Say hello to ruby"
    },
    "inspo": {
        "alias": [],
        "args": "",
        "desc": "Get an inspirational message in a fancy font"
    },
    "savepoint": {
        "alias": ["determination"],
        "args": "",
        "desc": "Need some determination? This is the command for you"
    },
    "stats": {
        "alias": [],
        "args": "",
        "desc": "Displays your message stats for the current text channel"
    },
    "statstotal": {
        "alias": [],
        "args": "",
        "desc": "Displays your message stats for the all text channels"
    },
    "rank": {
        "alias": [],
        "args": "",
        "desc": "Displays your current pos Level"
    },
    "buy-microtransaction": {
        "alias": [],
        "args": "<link>",
        "desc": "Exchange a link for progress"
    },
    "leaderboard": {
        "alias": [],
        "args": "",
        "desc": "Shows the rank leaderboard"
    },
    "8ball": {
        "alias": [],
        "args": "",
        "desc": "Gives a magic 8 ball response"
    },
    "remindme": {
        "alias": ["remind"],
        "args": "<time> [message]",
        "desc": "Sets a reminder, time should be specified in minutes and be between 1 and 40320. Or use some or all of the format #w#d#h#m to specify weeks, days, hours and/or minutes."
    },
    "reminddays": {
        "alias": ["remindays", "remindmedays", "remindday", "remindmeday"],
        "args": "<days> [message]",
        "desc": "Sets a reminder (triggers at noon) for a number of days in the future."
    },
    "todo": {
        "alias": [],
        "args": "[task]",
        "desc": "Shows your tasks or adds a task to your todo list"
    },
    "tasks": {
        "alias": [],
        "args": "",
        "desc": "Shows the tasks on your todo list"
    },
    "removetask": {
        "alias": ["todone"],
        "args": "<indices>",
        "desc": "Removes the tasks at the given positions from your todo list (0 indexed)"
    },
    "squadgoals": {
        "alias": [],
        "args": "[task]",
        "desc": "Shows squad goals or adds a goal to the todo list"
    },
    "squaddone": {
        "alias": [],
        "args": "<indices>",
        "desc": "Removes the goal at the given positions from the squad todo list (0 indexed)"
    },
    "werewolf": {
        "alias": [],
        "args": "",
        "desc": "Start a game of werewolf. Other werewolf commands should be explained as part of the game"
    },
    "newgift": {
        "alias": [],
        "args": "",
        "desc": "Not happy with your xmas gift? Use this to get a new one"
    }
};

// Help
function PrintHelp(channelID, userID, args){
    var key = "";
    if (args.length === 0){
        key = "help";
    }
    else{
        key = args[0];
    }
    if (key in help){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> %s", userID, BuildCommandDescription(key))
        });
        return;
    }
    for (var comm in help){
        var index = help[comm].alias.indexOf(key);
        if (index > -1){
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> %s", userID, BuildCommandDescription(comm, index))
            });
            return;
        }
    }
    
    var search = args[0];
    var commands = [];
    for (var command in help){
        if (command.indexOf(search) > -1){
            commands.push(command);
        }
        else if (help[command].desc.indexOf(search) > -1){
            commands.push(command);
        }
        else if (help[command].args.indexOf(search) > -1){
            commands.push(command);
        }
    }

    if (commands.length > 0){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Possible commands based on search term %s: %s", userID, search, commands.join(", "))
        });
    }
    else{
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Nothing found with search term %s", userID, search)
        });
    }
}

function BuildCommandDescription(key, aliasIndex=-1){
    var aliasList = help[key].alias.slice(0);
    var comm = key;
    if (aliasIndex > -1){
        comm = aliasList.splice(aliasIndex, 1);
        aliasList.push(key);
    }
    var command = comm + " ";
    if (help[key].args !== ""){
        command += help[key].args + " ";
    }
    command += "- " + help[key].desc;
    if (help[key].alias.length > 0){
        command += " (alias: " + aliasList.join(", ") + ")";
    }
    return command;
}

function PrintHelpAll(channelID, userID){
    var allhelp = "";
    for (var command in help){
        allhelp += BuildCommandDescription(command) + "\n";
    }

    bot.sendMessage({
        to: channelID,
        message: "Response is in your DMs, yo."
    });

    bot.sendMessage({
        to: userID,
        message: allhelp
    });
}

function Commands(client, userID, channelID, cmd, args){
    bot = client;

    switch (cmd){
        case "halp": // Fallthrough
        case "man": // Fallthrough
        case "help":
            PrintHelp(channelID, userID, args);
            break;
        case "helpall":
            PrintHelpAll(channelID, userID);
            break;
    }
}

exports.Commands = Commands;