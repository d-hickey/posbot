// Standard
var fs = require("fs");
var util = require("util");

// Discord client
var bot;

// To Do list
var tasks = JSON.parse(fs.readFileSync('./todo/todo.json', 'utf8'));

function WriteTasks() {
    var taskJson = JSON.stringify(tasks, null, 4);
    fs.writeFileSync('./todo/todo.json', taskJson);
}

function AddTask(userID, channelID, task, list = "do") {
    var userAt = util.format("<@%s>", userID);
    if (userID === "squad") {
        userAt = "Squad!";
    }

    if (!(userID in tasks)) {
        tasks[userID] = {};
    }
    if (!(list in tasks[userID])) {
        tasks[userID][list] = [];
    }

    if (!task || task === "") {
        bot.sendMessage({
            to: channelID,
            message: util.format("%s My child, you must actually enter something you want to do.", userAt)
        });
        return;
    }

    if (tasks[userID][list].length > 19) {
        bot.sendMessage({
            to: channelID,
            message: util.format("%s This feature takes up enough space as it is. Maybe you should clear some of the items already on your list.", userAt)
        });
        return;
    }

    tasks[userID][list].push(task);
    WriteTasks();

    ShowTasks(userID, channelID, "", list);
}

function ShowLists(userID, channelID) {
    var userAt = util.format("<@%s>", userID);

    if (!(userID in tasks)) {
        bot.sendMessage({
            to: channelID,
            message: util.format("%s You have no to do lists", userAt)
        });
        return;
    }
    var lists = [];
    for (var list in tasks[userID]){
        if (tasks[userID][list].length > 0){
            lists.push(list);
        }
    }
    if (lists.length > 0){
        bot.sendMessage({
            to: channelID,
            message: util.format("%s Your lists are: %s", userAt, lists.join(", "))
        });
    }
    else{
        bot.sendMessage({
            to: channelID,
            message: util.format("%s You have no to do lists", userAt)
        });
    }
}

function ShowTasks(userID, channelID, message = "", list = "do") {
    var userAt = util.format("<@%s>", userID);
    if (userID === "squad") {
        userAt = "Squad!";
    }

    if (!(userID in tasks) || !(list in tasks[userID])) {
        bot.sendMessage({
            to: channelID,
            message: util.format("%s You don't have a to %s list!", userAt, list)
        });
        return;
    }

    if (tasks[userID][list].length === 0) {
        bot.sendMessage({
            to: channelID,
            message: util.format("%s <:waow:375020892591489025> You have no items left on your list!", userAt)
        });
        return;
    }

    var tasklist = "";
    for (var i = 0; i < tasks[userID][list].length; i++) {
        tasklist = tasklist + util.format("%d. %s\n", i, tasks[userID][list][i]);
    }

    if (message === "") {
        message = "I believe you can do every item on this list:";
    }

    bot.sendMessage({
        to: channelID,
        message: util.format("%s %s\n```%s```", userAt, message, tasklist)
    });
}

function RemoveTask(userID, channelID, indices, list = "do") {
    if (!(userID in tasks) || !(list in tasks[userID])) {
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> You don't have a to %s list!", userID, list)
        });
        return;
    }

    var numbers = [];
    for (var index of indices) {
        var i = parseInt(index);

        if (isNaN(i)) {
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> %s is not a number, dummy!", userID, index)
            });
            return;
        }

        if (i < 0 || i > tasks[userID][list].length - 1) {
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> You don't have a task with index %s. Please try again, but do better.", userID, index)
            });
            return;
        }
        numbers.push(i);
    }
    numbers = numbers.sort(function(a, b) { return b - a; });

    for (var num of numbers) {
        tasks[userID][list].splice(num, 1);
    }

    WriteTasks();

    var message = "<:waow:375020892591489025> you did it! Here's what's left on the list:";

    ShowTasks(userID, channelID, message, list);
}

function Commands(client, userID, channelID, cmd, args) {
    bot = client;

    switch (cmd) {
        case "todo":
            if (args.length > 0) {
                var task = args.join(" ");
                AddTask(userID, channelID, task);
            } else {
                ShowTasks(userID, channelID);
            }
            break;
        case "tasks":
            ShowTasks(userID, channelID);
            break;
        case "lists":
        case "showlists":
            ShowLists(userID, channelID);
            break;
        case "todone": // Fallthrough
        case "removetask":
            if (args.length > 0) {
                RemoveTask(userID, channelID, args);
            }
            break;
        case "squadgoals":
            if (args.length > 0) {
                var goal = args.join(" ");
                AddTask("squad", channelID, goal);
            } else {
                ShowTasks("squad", channelID);
            }
            break;
        case "squaddone":
            if (args.length > 0) {
                RemoveTask("squad", channelID, args);
            }
            break;
        default:
            if (cmd.startsWith("to-")) {
                var list = cmd.split("-")[1];
                if (list) {
                    if (args.length > 0) {
                        var listTask = args.join(" ");
                        AddTask(userID, channelID, listTask, list);
                    } else {
                        ShowTasks(userID, channelID, "", list);
                    }
                }
            }
            else if (cmd.startsWith("done-")) {
                var doneList = cmd.split("-")[1];
                if (doneList) {
                    if (args.length > 0) {
                        RemoveTask(userID, channelID, args, doneList);
                    }
                }
            }
            break;
    }
}

exports.Commands = Commands;
