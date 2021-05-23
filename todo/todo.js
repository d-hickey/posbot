// Standard
const fs = require("fs");
const util = require("util");

// Discord client
let bot;

// To Do list
let tasks = JSON.parse(fs.readFileSync("./todo/todo.json", "utf8"));

function WriteTasks() {
    let taskJson = JSON.stringify(tasks, null, 4);
    fs.writeFileSync("./todo/todo.json", taskJson);
}

function AddTask(userID, channelID, task, list = "do") {
    let userAt = util.format("<@%s>", userID);
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
        bot.createMessage(
            channelID,
            util.format("%s My child, you must actually enter something you want to do.", userAt)
        );
        return;
    }

    if (tasks[userID][list].length > 19) {
        bot.createMessage(
            channelID,
            util.format("%s This feature takes up enough space as it is. Maybe you should clear some of the items already on your list.", userAt)
        );
        return;
    }

    tasks[userID][list].push(task);
    WriteTasks();

    ShowTasks(userID, channelID, "", list);
}

function ShowLists(userID, channelID) {
    let userAt = util.format("<@%s>", userID);

    if (!(userID in tasks)) {
        bot.createMessage(
            channelID,
            util.format("%s You have no to do lists", userAt)
        );
        return;
    }
    let lists = [];
    for (let list in tasks[userID]){
        if (tasks[userID][list].length > 0){
            lists.push(list);
        }
    }
    if (lists.length > 0){
        bot.createMessage(
            channelID,
            util.format("%s Your lists are: %s", userAt, lists.join(", "))
        );
    }
    else{
        bot.createMessage(
            channelID,
            util.format("%s You have no to do lists", userAt)
        );
    }
}

function ShowTasks(userID, channelID, message = "", list = "do") {
    let userAt = util.format("<@%s>", userID);
    if (userID === "squad") {
        userAt = "Squad!";
    }

    if (!(userID in tasks) || !(list in tasks[userID])) {
        bot.createMessage(
            channelID,
            util.format("%s You don't have a to %s list!", userAt, list)
        );
        return;
    }

    if (tasks[userID][list].length === 0) {
        bot.createMessage(
            channelID,
            util.format("%s <:waow:375020892591489025> You have no items left on your list!", userAt)
        );
        return;
    }

    let tasklist = "";
    for (let i = 0; i < tasks[userID][list].length; i++) {
        tasklist = tasklist + util.format("%d. %s\n", i, tasks[userID][list][i]);
    }

    if (message === "") {
        message = "I believe you can do every item on this list:";
    }

    bot.createMessage(
        channelID,
        util.format("%s %s\n```%s```", userAt, message, tasklist)
    );
}

function RemoveTask(userID, channelID, indices, list = "do") {
    if (!(userID in tasks) || !(list in tasks[userID])) {
        bot.createMessage(
            channelID,
            util.format("<@%s> You don't have a to %s list!", userID, list)
        );
        return;
    }

    let numbers = [];
    for (let index of indices) {
        let i = parseInt(index);

        if (isNaN(i)) {
            bot.createMessage(
                channelID,
                util.format("<@%s> %s is not a number, dummy!", userID, index)
            );
            return;
        }

        if (i < 0 || i > tasks[userID][list].length - 1) {
            bot.createMessage(
                channelID,
                util.format("<@%s> You don't have a task with index %s. Please try again, but do better.", userID, index)
            );
            return;
        }
        numbers.push(i);
    }
    numbers = numbers.sort(function(a, b) { return b - a; });

    for (let num of numbers) {
        tasks[userID][list].splice(num, 1);
    }

    WriteTasks();

    let message = "<:waow:375020892591489025> you did it! Here's what's left on the list:";

    ShowTasks(userID, channelID, message, list);
}

function Commands(client, userID, channelID, cmd, args) {
    bot = client;

    switch (cmd) {
    case "todo":
        if (args.length > 0) {
            let task = args.join(" ");
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
            let goal = args.join(" ");
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
            let list = cmd.split("-")[1];
            if (list) {
                if (args.length > 0) {
                    let listTask = args.join(" ");
                    AddTask(userID, channelID, listTask, list);
                } else {
                    ShowTasks(userID, channelID, "", list);
                }
            }
        }
        else if (cmd.startsWith("done-")) {
            let doneList = cmd.split("-")[1];
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
