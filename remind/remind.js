// Standard
const fs = require("fs");
const util = require("util");

// Local
const randomInt = require("../randomint");

// Discord client
let bot;

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
let reminders = JSON.parse(fs.readFileSync("./remind/reminders.json", "utf8"));

const defaultMessages = [
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
    let remindJson = JSON.stringify(reminders, null, 4);
    fs.writeFileSync("./remind/reminders.json", remindJson);
}

function GetMinutes(time){
    let total = 0;
    if (time.indexOf("w") > -1){
        let weeksplit = time.split("w");
        let weeks = parseInt(weeksplit[0]);
        time = weeksplit[1];

        if (isNaN(weeks) || weeks < 1){
            return 0;
        }
        total += (weeks * 7 * 24 * 60);
    }

    if (time.indexOf("d") > -1){
        let daysplit = time.split("d");
        let days = parseInt(daysplit[0]);
        time = daysplit[1];

        if (isNaN(days) || days < 1){
            return 0;
        }
        total += (days * 24 * 60);
    }

    if (time.indexOf("h") > -1){
        let hoursplit = time.split("h");
        let hours = parseInt(hoursplit[0]);
        time = hoursplit[1];

        if (isNaN(hours) || hours < 1){
            return 0;
        }
        total += (hours * 60);
    }

    if (time.indexOf("m") > -1){
        let minsplit = time.split("m");
        let mins = parseInt(minsplit[0]);
        time = minsplit[1];

        if (isNaN(mins) || mins < 1){
            return 0;
        }
        total += mins;
    }
    if (total === 0){
        let justMins = parseInt(time);
        if (isNaN(justMins) || justMins < 1){
            return 0;
        }
        total = justMins;
    }
    return total;
}

// Reminder
function SetReminder(userID, channelID, time, message){
    let remindMsg = message;

    let mins = GetMinutes(time);

    if (isNaN(mins) || mins < 1){
        bot.createMessage(
            channelID,
            util.format("<@%s> Please enter a number of minutes or a time in the format #w#d#h#m", userID)
        );
        return;
    }

    if (mins > 5256000){
        bot.createMessage(
            channelID,
            util.format("<@%s> That's a very long time away! Maybe focus on the present? Or use !reminddate if you really have to.", userID)
        );
        return;
    }

    if (remindMsg === ""){
        let messageIndex = randomInt.Get(0, defaultMessages.length - 1);
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
    let timer = mins * 60000;

    setTimeout(DoTheReminding, timer, userID, channelID, message);

    bot.createMessage(
        channelID, 
        util.format("Reminder set for %d minutes", mins)
    );
}

function SetLongReminder(userID, channelID, mins, message){
    let now = new Date();
    let future = new Date(now.setTime(now.getTime() + mins * 60000));

    reminders[future] = {};
    reminders[future].type = "min";
    reminders[future].remindee = userID;
    reminders[future].channel = channelID;
    reminders[future].message = message;

    WriteReminders();

    let dateString = "";
    if (mins > 480){
        dateString = util.format(" (%s)", future.toString());
    }

    bot.createMessage(
        channelID, 
        util.format("Reminder set for %s%s", TimeString(mins), dateString)
    );
}

function TimeString(mins){
    let time = "";
    let years = Math.floor(mins / 525600);
    if (years > 0){
        time += util.format("%d years ", years);
    }
    mins = mins % 525600;

    let weeks = Math.floor(mins / 10080);
    if (weeks > 0){
        time += util.format("%d weeks ", weeks);
    }
    mins = mins % 10080;

    let days = Math.floor(mins / 1440);
    if (days > 0){
        time += util.format("%d days ", days);
    }
    mins = mins % 1440;

    let hours = Math.floor(mins / 60);
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
    bot.createMessage(
        channelID, 
        util.format("This command has been removed. Please use '!remind #d' or '!reminddate'")
    );
}

function SetDateReminder(userID, channelID, dateString, message){
    let parts = dateString.split(/\D/);
    let date = null;
    if (dateString.indexOf("T") > -1){
        date = new Date(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]);
    }
    else{
        date = new Date(parts[0], parts[1]-1, parts[2], 12);
    }

    if (!(date instanceof Date) || isNaN(date)){
        bot.createMessage(
            channelID, 
            "Please enter a valid date in the format YYYY-MM-DD (Optionally add time with THH:MM:SS)"
        );
        return;
    }

    reminders[date] = {};
    reminders[date].type = "min";
    reminders[date].remindee = userID;
    reminders[date].channel = channelID;
    reminders[date].message = message;

    WriteReminders();

    bot.createMessage(
        channelID, 
        util.format("Reminder set for %s", date.toString())
    );
}

function DoTheReminding(userID, channelID, message){
    bot.createMessage(
        channelID, 
        util.format("<@%s> %s", userID, message)
    );
}

function IsPast(dateString){
    let date = new Date(dateString);
    let today = new Date();
    return (today.getFullYear() > date.getFullYear()) || (today.getFullYear() === date.getFullYear() && today.getMonth() > date.getMonth()) || 
           (today.getFullYear() === date.getFullYear() && today.getMonth() === date.getMonth() && today.getDate() > date.getDate());
}

function IsToday(dateString){
    let date = new Date(dateString);
    let today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

function IsNow(dateString){
    let date = new Date(dateString);
    let now = new Date();
    return now.getTime() >= date.getTime();
}

function CheckDailyReminders(client){
    bot = client;
    for (let date in reminders){
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
    for (let date in reminders){
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
    case "remindme":{
        let time = 1;
        if (args.length > 0){
            time = args[0];
            args = args.splice(1);
        }

        let reminder = "";
        if (args.length > 0){
            reminder = args.join(" ");
        }
        SetReminder(userID, channelID, time, reminder);
        break;
    }
    case "remindmedays": // Fallthrough
    case "remindmeday": // Fallthrough
    case "reminddays": // Fallthrough
    case "remindays": //Fallthrough
    case "remindday":
        SetDaysReminder(userID, channelID);
        break;
    case "date":
    case "remindate": // Fallthrough
    case "reminddate":{
        let date = "Undefined Date";
        if (args.length > 0){
            date = args[0];
            args = args.splice(1);
        }

        let dateReminder = "";
        if (args.length > 0){
            dateReminder = args.join(" ");
        }
        SetDateReminder(userID, channelID, date, dateReminder);
        break;
    }
    }
}

exports.Commands = Commands;
exports.CheckDailyReminders = CheckDailyReminders;
exports.CheckMinuteReminders = CheckMinuteReminders;