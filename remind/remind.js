// Standard
var fs = require("fs");
var util = require("util");

// Local
var randomInt = require("../randomint");

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

var defaultMessages = [
    "I am reminding you of something! You didn't specify what.",
    "Hey! Your posbot reminder is here. It says: ''",
    "Beep Beep Beep. That's me doing an impression of an alarm to remind you that you wanted to be reminded.",
    "Do the thing!",
    "Consider yourself posbot reminded. Posminded.",
    "While exploring a dungeon... Wait, wrong module, this is your reminder.",
    "^w^ How he do that reminder.",
    "No reminder message, huh? Alright, then. Keep your secrets.",
    "Remember. You must remember. I can't tell you what, so I really hope you remember."
];

function WriteReminders(){
    var remindJson = JSON.stringify(reminders, null, 4);
    fs.writeFileSync('./remind/reminders.json', remindJson);
}

function GetMinutes(time){
    var total = 0;
    if (time.indexOf("w") > -1){
        var weeksplit = time.split("w");
        var weeks = parseInt(weeksplit[0]);
        time = weeksplit[1];

        if (isNaN(weeks) || weeks < 1){
            return 0;
        }
        total += (weeks * 7 * 24 * 60);
    }

    if (time.indexOf("d") > -1){
        var daysplit = time.split("d");
        var days = parseInt(daysplit[0]);
        time = daysplit[1];

        if (isNaN(days) || days < 1){
            return 0;
        }
        total += (days * 24 * 60);
    }

    if (time.indexOf("h") > -1){
        var hoursplit = time.split("h");
        var hours = parseInt(hoursplit[0]);
        time = hoursplit[1];

        if (isNaN(hours) || hours < 1){
            return 0;
        }
        total += (hours * 60);
    }

    if (time.indexOf("m") > -1){
        var minsplit = time.split("m");
        var mins = parseInt(minsplit[0]);
        time = minsplit[1];

        if (isNaN(mins) || mins < 1){
            return 0;
        }
        total += mins;
    }
    if (total === 0){
        var justMins = parseInt(time);
        if (isNaN(justMins) || justMins < 1){
            return 0;
        }
        total = justMins;
    }
    return total;
}

// Reminder
function SetReminder(userID, channelID, time, message){
    var remindMsg = message;

    var mins = GetMinutes(time);

    if (isNaN(mins) || mins < 1){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Please enter a number of minutes or a time in the format #w#d#h#m", userID)
        });
        return;
    }

    if (mins > 5256000){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> That's a very long time away! Maybe focus on the present? Or use !reminddate if you really have to.", userID)
        });
        return;
    }

    if (remindMsg === ""){
        messageIndex = randomInt.Get(0, defaultMessages.length - 1);
        remindMsg = defaultMessages[messageIndex];
    }

    if (mins > 30){
        SetLongReminder(userID, channelID, mins, remindMsg);
    }
    else{
        SetShortReminder(userID, channelID, mins, remindMsg);
    }
}

function SetShortReminder(userID, channelID, mins, message){
    timer = mins * 60000;

    setTimeout(DoTheReminding, timer, userID, channelID, message);

    bot.sendMessage({
        to: channelID,
        message: util.format("Reminder set for %d minutes", mins)
    });
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

    var dateString = "";
    if (mins > 480){
        dateString = util.format(" (%s)", future.toString());
    }

    bot.sendMessage({
        to: channelID,
        message: util.format("Reminder set for %s%s", TimeString(mins), dateString)
    });
}

function TimeString(mins){
    var time = "";
    var years = Math.floor(mins / 525600);
    if (years > 0){
        time += util.format("%d years ", years);
    }
    mins = mins % 525600;

    var weeks = Math.floor(mins / 10080);
    if (weeks > 0){
        time += util.format("%d weeks ", weeks);
    }
    mins = mins % 10080;

    var days = Math.floor(mins / 1440);
    if (days > 0){
        time += util.format("%d days ", days);
    }
    mins = mins % 1440;

    var hours = Math.floor(mins / 60);
    if (hours > 0){
        time += util.format("%d hours ", hours);
    }
    mins = mins % 60;

    if (mins > 0){
        time += util.format("%d mins ", mins);
    }
    return time;
}

function SetDaysReminder(userID, channelID){
    bot.sendMessage({
        to:channelID,
        message: util.format("This command has been removed. Please use '!remind #d' or '!reminddate'")
    });
    return;

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

function SetDateReminder(userID, channelID, dateString, message){
    var parts = dateString.split(/\D/);
    var date = null;
    if (dateString.indexOf("T") > -1){
        date = new Date(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]);
    }
    else{
        date = new Date(parts[0], parts[1]-1, parts[2], 12);
    }

    if (!(date instanceof Date) || isNaN(date)){
        bot.sendMessage({
            to: channelID,
            message: "Please enter a valid date in the format YYYY-MM-DD (Optionally add time with THH:MM:SS)"
        });
        return;
    }

    reminders[date] = {};
    reminders[date].type = "min";
    reminders[date].remindee = userID;
    reminders[date].channel = channelID;
    reminders[date].message = message;

    WriteReminders();

    bot.sendMessage({
        to: channelID,
        message: util.format("Reminder set for %s", date.toString())
    });
}

function DoTheReminding(userID, channelID, message){
    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> %s", userID, message)
    });
}

function IsPast(dateString){
    var date = new Date(dateString);
    var today = new Date();
    return (today.getFullYear() > date.getFullYear()) || (today.getFullYear() === date.getFullYear() && today.getMonth() > date.getMonth()) || 
           (today.getFullYear() === date.getFullYear() && today.getMonth() === date.getMonth() && today.getDate() > date.getDate());
}

function IsToday(dateString){
    var date = new Date(dateString);
    var today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function IsNow(dateString){
    var date = new Date(dateString);
    var now = new Date();
    return now.getTime() >= date.getTime();
}

function CheckDailyReminders(client){
    bot = client;
    for (var date in reminders){
        if ("type" in reminders[date] && reminders[date].type !== "day"){
            continue;
        }

        if (IsToday(date)){
            DoTheReminding(reminders[date].remindee, reminders[date].channel, reminders[date].message);
            delete reminders[date];
            WriteReminders();
        }
        else if (IsPast(date)){
            DoTheReminding(reminders[date].remindee, reminders[date].channel, "Whoops, we kind of missed this one:\n" + reminders[date].message);
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
        case "remind": // Fallthrough
        case "remindme":
            var time = 1;
            if (args.length > 0){
                time = args[0];
                args = args.splice(1);
            }

            var reminder = "";
            if (args.length > 0){
                reminder = args.join(" ");
            }
            SetReminder(userID, channelID, time, reminder);
            break;
        case "remindmedays": // Fallthrough
        case "remindmeday": // Fallthrough
        case "reminddays": // Fallthrough
        case "remindays": //Fallthrough
        case "remindday":
            SetDaysReminder(userID, channelID);
            break;
        case "date":
        case "remindate": // Fallthrough
        case "reminddate":
            var date = "Undefined Date";
            if (args.length > 0){
                date = args[0];
                args = args.splice(1);
            }

            var dateReminder = "";
            if (args.length > 0){
                dateReminder = args.join(" ");
            }
            SetDateReminder(userID, channelID, date, dateReminder);
            break;
    }
}

exports.Commands = Commands;
exports.CheckDailyReminders = CheckDailyReminders;
exports.CheckMinuteReminders = CheckMinuteReminders;