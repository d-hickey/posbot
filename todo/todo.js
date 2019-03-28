// Standard
var fs = require("fs");
var util = require("util");

// Discord client
var bot;

// To Do list
var tasks = JSON.parse(fs.readFileSync('./todo/todo.json', 'utf8'));

function WriteTasks(){
    var taskJson = JSON.stringify(tasks);
    fs.writeFileSync('./todo/todo.json', taskJson);
}

function AddTask(userID, channelID, task){
    var userAt = util.format("<@%s>", userID);
    if (userID === "squad"){
        userAt = "Squad!";
    }

    if (!(userID in tasks)){
        tasks[userID] = [];
    }

    if (!task || task === ""){
        bot.sendMessage({
            to: channelID,
            message: util.format("%s My child, you must actually enter something you want to do.", userAt)
        });
        return;
    }

    if (tasks[userID].length > 9){
        bot.sendMessage({
            to: channelID,
            message: util.format("%s Maybe you should clear some of the items already on your list.", userAt)
        });
        return;
    }

    tasks[userID].push(task);
    WriteTasks();

    ShowTasks(userID, channelID);
}

function ShowTasks(userID, channelID){
    var userAt = util.format("<@%s>", userID);
    if (userID === "squad"){
        userAt = "Squad!";
    }

    if (!(userID in tasks)){
        bot.sendMessage({
            to: channelID,
            message: util.format("%s You don't have a to do list!", userAt)
        });
        return;
    }

    if (tasks[userID].length === 0){
        bot.sendMessage({
            to: channelID,
            message: util.format("%s You have no items on your list!", userAt)
        });
        return;
    }

    var tasklist = "";
    for (var i = 0; i < tasks[userID].length; i++){
        tasklist = tasklist + util.format("%d. %s\n", i, tasks[userID][i]);
    }

    bot.sendMessage({
        to: channelID,
        message: util.format("%s I believe you can do every item on this list:\n```%s```", userAt, tasklist)
    });
}

function RemoveTask(userID, channelID, indices){
    if (!(userID in tasks)){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> You don't have a to do list!", userID)
        });
        return;
    }

    indices = indices.sort();
    indices = indices.reverse();

    for (var index of indices){
        var i = parseInt(index);
        if (isNaN(i)){
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> %s is not a number, dummy!", userID, index)
            });
            return;
        }

        if (i < 0 || i > tasks[userID].length-1){
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> You don't have a task with index %s. Please try again, but do better.", userID, index)
            });
            return;
        }

        tasks[userID].splice(i, 1);
    }

    WriteTasks();

    ShowTasks(userID, channelID);
}

function Commands(client, userID, channelID, cmd, args){
    bot = client;

    switch (cmd){
        case "todo":
            if (args.length > 0){
                var task = args.join(" ");
                AddTask(userID, channelID, task);
            }
            else{
                ShowTasks(userID, channelID);
            }
            break;
        case "tasks":
            ShowTasks(userID, channelID);
            break;
        case "todone": // Fallthrough
        case "removetask":
            if (args.length > 0){
                RemoveTask(userID, channelID, args);
            }
            break;
        case "squadgoals":
            if (args.length > 0){
                var goal = args.join(" ");
                AddTask("squad", channelID, goal);
            }
            else{
                ShowTasks("squad", channelID);
            }
            break;
        case "squaddone":
            if (args.length > 0){
                RemoveTask("squad", channelID, args);
            }
            break;
    }
}

exports.Commands = Commands;