// Standard
var fs = require("fs");
var util = require("util");

// Discord client
var bot;

// Reminders list
/*
{
    <Date>: {
        "type": "day" or "min",
        "remindee": <userID>,
        "channel": <channelID>,
        "message": "reminder message"
    },
}
*/
var reminders = JSON.parse(fs.readFileSync('./remind/reminders.json', 'utf8'));

function WriteReminders(){
    var remindJson = JSON.stringify(reminders);
    fs.writeFileSync('./remind/reminders.json', remindJson);
}

// Reminder
function SetReminder(userID, channelID, mins, message){
    var remindMsg = message;

    if (isNaN(mins) || mins < 1){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Please enter a number of minutes", userID)
        });
        return;
    }

    if (mins > 10080){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Use !reminddays for reminders this far away", userID)
        });
        return;
    }

    if (remindMsg === ""){
        remindMsg = "I am reminding you of something! You didn't specify what.";
    }

    if (mins > 30){
        SetLongReminder(userID, channelID, mins, remindMsg)
    }
    else{
        SetShortReminder(userID, channelID, mins, remindMsg)
    }

    bot.sendMessage({
        to:channelID,
        message: util.format("Reminder set for %d minutes", mins)
    });
}

function SetShortReminder(userID, channelID, mins, message){
    timer = mins * 60000;

    setTimeout(DoTheReminding, timer, userID, channelID, message)
}

function SetLongReminder(userID, channelID, mins, message){
    var now = new Date();
    var future = new Date(now.setTime(now.getTime() + mins * 60000));

    reminders[future] = {};
    reminders[future].type = "min";
    reminders[future].remindee = userID;
    reminders[future].channel = channelID;
    reminders[future].message = message;

    WriteReminders();
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
            message: util.format("<@%s> That's a very long time away! Maybe focus on the present?", userID)
        });
        return;
    }

    if (remindMsg === ""){
        remindMsg = "You set a reminder for this day but never specified what you wanted to be reminded of. So...";
    }

    var now = new Date();
    var future = new Date(now.setTime(now.getTime() + days * 86400000));

    reminders[future] = {};
    reminders[future].type = "day";
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
    return date.getDate() >= today.getDate() && date.getMonth() >= today.getMonth() && date.getFullYear() >= today.getFullYear();
}

function IsNow(dateString){
    var date = new Date(dateString);
    var now = new Date();
    return date.getTime() >= now.getTime();
}

function CheckDailyReminders(client){
    bot = client;
    for (var date in reminders){
        if ("type" in reminders[date] && reminders[date].type !== "day"){
            continue
        }

        if (IsToday(date)){
            DoTheReminding(reminders[date].remindee, reminders[date].channel, reminders[date].message);
            delete reminders[date];
            WriteReminders();
        }
    }
}

function CheckMinuteReminders(client){
    bot = client;
    for (var date in reminders){
        if (!("type" in reminders[date]) || reminders[date].type !== "min"){
            continue;
        }

        if (IsNow(date)){
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
exports.CheckMinuteReminders = CheckMinuteReminders;