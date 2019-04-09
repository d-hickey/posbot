// Standard
var fs = require("fs");
var util = require("util");

// Discord client
var bot;

// Reminders list
var reminders = JSON.parse(fs.readFileSync('./remind/reminders.json', 'utf8'));

function WriteReminders(){
    var remindJson = JSON.stringify(reminders);
    fs.writeFileSync('./remind/reminders.json', remindJson);
}

// Reminder
function SetReminder(userID, channelID, time, message){
    var remindMsg = message;
    var timer = time;

    if (isNaN(timer) || timer < 1 || timer > 600){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Please enter a number between 1 and 600", userID)
        });
        return;
    }

    if (remindMsg === ""){
        remindMsg = "I am reminding you of something you didn't specify";
    }

    timer = timer * 60000;

    setTimeout(DoTheReminding, timer, userID, channelID, remindMsg);

    bot.sendMessage({
        to:channelID,
        message: util.format("Reminder set for %d minutes", time)
    });
}

function SetDaysReminder(userID, channelID, days, message){
    var remindMsg = message;

    if (isNaN(days) || days < 1){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Please enter an amount of days", userID)
        });
        return;
    }

    if (days > 3650){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> That's a very long time away, maybe focus on the present?", userID)
        });
        return;
    }

    if (remindMsg === ""){
        remindMsg = "You set a reminder for this day but never specified what you wanted to be reminded of. So...";
    }

    var now = new Date();
    var future = new Date(now.setTime(now.getTime() + days * 86400000));

    reminders[future] = {};
    reminders[future].remindee = userID;
    reminders[future].channel = channelID;
    reminders[future].message = remindMsg;

    WriteReminders();

    bot.sendMessage({
        to:channelID,
        message: util.format("No probs. I will remind you in %d days", days)
    });
}

function DoTheReminding(userID, channelID, message){
    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> %s", userID, message)
    });
}

function IsToday(dateString){
    var date = new Date(dateString);
    var today = new Date();
    return date.getDate() == today.getDate() && date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear();
}

function CheckDailyReminders(){
    for (var date in reminders){
        if (IsToday(date)){
            DoTheReminding(reminders[date].remindee, reminders[date].channel, reminders[date].message);
            delete reminders[date];
            WriteReminders();
        }
    }
}

function Commands(client, userID, channelID, cmd, args){
    bot = client;

    switch (cmd){
        case "remindme":
            var time = 1;
            if (args.length > 0){
                time = parseInt(args[0]);
                args = args.splice(1);
            }

            var reminder = "";
            if (args.length > 0){
                reminder = args.join(" ");
            }
            SetReminder(userID, channelID, time, reminder);
            break;
        case "remindmedays": // Fallthrough
        case "reminddays":
            var days = 1;
            if (args.length > 0){
                days = parseInt(args[0]);
                args = args.splice(1);
            }

            var message = "";
            if (args.length > 0){
                message = args.join(" ");
            }
            SetDaysReminder(userID, channelID, days, message);
            break;
    }
}

exports.Commands = Commands;
exports.CheckDailyReminders = CheckDailyReminders;