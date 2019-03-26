var Discord = require("discord.io");
var logger = require("winston");
var auth = require("./auth.json");
var util = require("util");
var request = require("request");
var MarkovChain = require("markovchain");
var fs = require("fs");
var werewolf = require("./werewolf");

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = "debug";

// Help
function PrintHelp(channelID){
    var help = "!helpall - Show a complete command list\n" +
               "!compliment [complimentee] - Get a compliment sourced from some of the nicest subreddits\n" +
               "@posbot - Get a markov generated response\n" +
               "!quote messageID - Formats a quote of the message with the given ID (turn on dev mode to copy message IDs)\n" +
               "!roll dice - Rolls the specified dice and returns result\n" +
               "!savepoint - Need some determination? This is the command for you\n" +
               "!stats - Displays your message stats for the current text channel\n";
    if (!stopRank){
        help = help + "!rank - Displays your current Pos Level\n" +
               "!buy-microtransaction link - Exchange a link for progress\n";
    }
    help = help + "!8ball - Gives a magic 8 ball response\n" +
               "!remindme time message - Sets a reminder, time should be specified in minutes and be between 1 and 240\n" +
               "!todo [task] - Shows your tasks or adds a task to your todo list\n" +
               "!todone indices - Removes the task at the given positions from your todo list (0 indexed)\n" +
               "!squadgoals and !squaddone - Same as to do commands but for the whole squad\n";
               
    if (IsXmas()){
        help = help + "\n\n!newgift - Not happy with your xmas gift? Use this to get a new one";
    }

    bot.sendMessage({
        to: channelID,
        message: help
    });
}

function PrintHelpAll(channelID){
    var help = "!ping - Ping posbot\n" +
               "!help - Show a shorter help message\n" +
               "!helpall - Show this message\n" +
               "!notail - Flower, river, rainbow which are you?\n" +
               "!compliment [complimentee] - Get a compliment sourced from some of the nicest subreddits\n" +
               "!markov or @posbot - Get a markov generated response\n" +
               "!quote messageID - Formats a quote of the message with the given ID (turn on dev mode to copy message IDs)\n" +
               "!roll dice - Rolls the specified dice and returns result\n" +
               "!heyruby - Say hello to ruby\n" +
               "!savepoint - Need some determination? This is the command for you\n" +
               "!stats - Displays your message stats for the current text channel\n" +
               "!statstotal - Displays your message stats for the all text channels\n";
    if (!stopRank){
        help = help + "!rank - Displays your current Pos Level\n" +
               "!buy-microtransaction link - Exchange a link for progress\n" +
               "!leaderboard - shows the rank leaderboard\n";
    }
    help = help + "!8ball - Gives a magic 8 ball response\n" +
               "!remindme time message - Sets a reminder, time should be specified in minutes and be between 1 and 240\n" +
               "!todo [task] - Shows your tasks or adds a task to your todo list\n" +
               "!tasks - Shows the tasks on your todo list\n" +
               "!removetask | !todone indices - Removes the task at the given positions from your todo list (0 indexed)\n" +
               "!squadgoals [task] - Shows squad goals or adds a goal to the todo list\n" +
               "!squaddone indices - Removes the goal at the given positions from the squad todo list (0 indexed)\n" +
               "!werewolf - Start a game of werewolf. Other werewolf commands should be explained as part of the game";
               
    if (IsXmas()){
        help = help + "\n\n!newgift - Not happy with your xmas gift? Use this to get a new one";
    }

    bot.sendMessage({
        to: channelID,
        message: help
    });
}

// Random Function
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// Dice Roll
function diceRoll(args) {
    if (args[0].substring(0,1) === "d"){
        var dice = args[0];
        dicenumber = dice.substring(1);
        if (dicenumber !== Number.isNaN && +dicenumber > 1){
            return getRandomInt(1, +dicenumber);
        }
    }
    return "Invalid Dice";
}

// This should probably just be a dictionary
function cardinalToOrdinal(num){
    switch (num){
        case 1:
            return "1st";
        case 2:
            return "2nd";
        case 3:
            return "3rd";
        case 4:
            return "4th";
        default:
            return "";
    }
}

// Reddit Functions
var subs = ["LadyBoners", "happy", "aww", "RoastMe", "relationships", "meirl", "me_irl", "gonewild", "Tinder", "PrequelMemes", "UpliftingNews"];

function getRedditComment(sub, callback){
    var url = "http://www.reddit.com/r/" + sub + "/comments/.json?limit=50";
    logger.info(url);
    var comment = "<Insert reprehensible shit here>";

    request(url, function(error, response, body){
        //console.log("error:", error); // Print the error if one occurred
        //console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
        //console.log("body:", body); // Print the HTML for the Google homepage.

        var redditResponse = JSON.parse(body);
        var post = getRandomInt(0, 49);

        comment = redditResponse.data.children[post].data.body;
        logger.info(comment);
        return callback(comment);
    });
}

// Get Gift
function getImgurImage(callback){
    var url = "http://www.imgur.com/random";

    request(url, function(error, response, body){
        //console.log("error:", error); // Print the error if one occurred
        //console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
        //console.log("body:", body); // Print the HTML for the Google homepage.

        var regex = /https?:\/\/i.imgur.com\/[a-zA-Z0-9]+\.[a-zA-Z]+/g;
        var images = body.match(regex);
        var image = images[0];

        return callback(image);
    });
}

function regift(userID, channelID){
    if (!(userID in xmasGifts)){
        return;
    }

    if ("regifted" in xmasGifts){
        if (xmasGifts.regifted.indexOf(userID) > -1){
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> Listen here, bucko. I've already gotten you two thoughtful gifts. Maybe you should be a little more grateful.", userID)
            });
            return;
        }
        xmasGifts.regifted.push(userID);
    }
    else{
        xmasGifts.regifted = [];
        xmasGifts.regifted.push(userID);
    }
    getImgurImage(function(image){
        xmasGifts[userID] = image;
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Ok... I put a lot of work into that gift... JK. Here's your real gift. %s That I always intended to give you.", userID, image)
        });
    });
}

// Xmas
var xmasGifts = {};

function IsXmas(){
    var today = new Date().toString();
    if (today.indexOf("Dec 25") > -1){
        return true;
    }
    xmasGifts = {};
    return false;
}

// Birthdays
var birthdays = JSON.parse(fs.readFileSync('bdays.json', 'utf8'));
var baby = "";

function IsBirthday(){
    var today = new Date().toString();
    for (var bday in birthdays){
        if (today.indexOf(bday) > -1 && birthdays[bday] != baby){
            baby = birthdays[bday];
            return true;
        }
    }
    return false;
}

//Emma's Markov
var bot_at = "<@348179384580177922>";
//var bot_at = "<@503939825833869313>";
var history = fs.readFileSync("chat.log", "utf8");
var quotes = new MarkovChain(fs.readFileSync("chat.log", "utf8"));
var messageCount = 0;
var timeSinceLast = 10;

function load_history (file) {
    var lineReader = require("readline").createInterface({
        input: require("fs").createReadStream(file)
    });

    lineReader.on("line", function (line) {
        history = history.concat(line, "\n");
    });
    quotes = new MarkovChain(history);
}

function send_markov (channelID) {
    logger.info("attempting markov chain");
    var limit = getRandomInt(1, 25);
    bot.sendMessage({
        to: channelID,
        message: quotes.start( function(wordList) {
            var tmpList = Object.keys(wordList);
            return tmpList[~~(Math.random()*tmpList.length)];
        }).end(limit).process()
    });
}

function specific_markov (userID, channelID, word) {
    var limit = getRandomInt(2, 20);
    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> %s", userID, quotes.start(word).end(limit).process())
    });
}

// Ruby vars
var rubyPatience = 0;

// Determination
var savepoints = JSON.parse(fs.readFileSync('determination.json', 'utf8'));
var overwrite = 28;

function getSavepoint () {
    var index = getRandomInt(0, savepoints.length-1);
    if (overwrite !== -1){
        index = overwrite;
        overwrite = -1;
    }
    return savepoints[index];
}

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on("ready", function (evt) {
    logger.info("Connected");
    logger.info("Logged in as: ");
    logger.info(bot.username + " - (" + bot.id + ")");
});

//Channel History
var userMsgCount = JSON.parse(fs.readFileSync('messagecount.json', 'utf8'));
var updateFile = true;

function updateUserMsgCount(channel, user, createNewChan=true){
    if (channel in userMsgCount){
        if (user in userMsgCount[channel]){
            userMsgCount[channel][user]++;
        }
        else{
            userMsgCount[channel][user] = 1;
        }
    }
    else if (createNewChan){
        userMsgCount[channel] = {};
        userMsgCount[channel][user] = 1;
    }

    if (updateFile){
        var msgJson = JSON.stringify(userMsgCount);
        fs.writeFileSync('messagecount.json', msgJson);
    }
}

function queryChannelHistory(chanID){
    logger.info("getting message history for channel: " + chanID);
    bot.getMessages({
        channelID : chanID,
        limit : 100
    }, function (err, messageArray){
        if (err){
            logger.info(err);
        }
        else{
            logger.info("1 array size: " + messageArray.length);
            var lastID = 0;
            for (var message of messageArray){
                logger.info("content: " + message.content);
                if (message.content == null){ continue; }
                lastID = message.id;
                var user = message.author;
                var userID = user.id;
                updateUserMsgCount(chanID, userID);
            }
            getPastMessages(chanID, lastID, 2);

            var msgJson = JSON.stringify(userMsgCount);
            fs.writeFileSync('messagecount.json', msgJson);

            logger.info("done outer history");
        }
    });
    
}

function getPastMessages(chanID, beforeID, count){
    bot.getMessages({
        channelID : chanID,
        before : beforeID,
        limit : 100
    }, function (err, messageArray){
        if (err){
            logger.info("got error, waiting for 10 seconds\n " + err);
            setTimeout(getPastMessages(chanID, beforeID, count), 10000);
        }
        else{
            var lastID = 0;
            logger.info(count + " array size: " + messageArray.length);
            for (var message of messageArray){
                if (message.content == null){ continue; }
                //logger.info(message.content);
                lastID = message.id;
                var user = message.author;
                var userID = user.id;
                updateUserMsgCount(chanID, userID);
            }

            if (messageArray.length == 100){
                getPastMessages(chanID, lastID, count + 1);
            }
            else{
                var msgJson = JSON.stringify(userMsgCount);
                fs.writeFileSync('messagecount.json', msgJson);
                logger.info("done history " + count);

                bot.sendMessage({
                    to: chanID,
                    message: "Done counting this channel"
                });
            }
        }
    });
}

function getMessageTotal(){
    var total = 0;
    for (var chan in userMsgCount){
        for (var user in userMsgCount[chan]){
            total = total + userMsgCount[chan][user];
        }
    }
    return total;
}

function getChannelTotal(chan){
    var total = 0;
    for (var user in userMsgCount[chan]){
        total = total + userMsgCount[chan][user];
    }
    return total;
}

function getUserTotal(user){
    var total = 0;
    for (var chan in userMsgCount){
        if (user in userMsgCount[chan]){
            total = total + userMsgCount[chan][user];
        }
    }
    return total;
}

function getMessageStats(channel, user, name){
    if (channel in userMsgCount){
        if (user in userMsgCount[channel]){
            var count = userMsgCount[channel][user];
            var total = getChannelTotal(channel);
            var percent = ((count / total) * 100).toFixed(2);

            var respMsg = util.format("Wow %s! You've posted %d messages in this channel. Out of a total of %d, that's about %s percent.", name, count, total, percent);
            return respMsg;
        }
        return "You've never posted here? Weird";
    }
    return "Channel hasn't been counted.";
}

function getTotalStats(user, name){
    var count = getUserTotal(user);
    var total = getMessageTotal();
    var percent = ((count / total) * 100).toFixed(2);

    var respMsg = util.format("Wow %s! You've posted %d messages in all (counted) channels. Out of a total of %d, that's about %s percent.", name, count, total, percent);
    return respMsg;
}

// Who Am I vars
var whoYouAre = JSON.parse(fs.readFileSync('whoyouare.json', 'utf8'));

function getMember(userID) {
    for (var serverKey in bot.servers){
        for (var memberID in bot.servers[serverKey].members){
            if (memberID === userID){
                //logger.info("found member");
                return bot.servers[serverKey].members[memberID];
            }
        }
    }

    var fakemember = {};
    fakemember.nick = "Undefined User";
    return fakemember;
}

function whoAmI(name, user, id){
    var outerIndex = getRandomInt(0,3);
    var array = whoYouAre[outerIndex];
    var index = getRandomInt(0, array.length-1);
    var message = "";
    
    if (outerIndex === 0){
        message = array[index];
    }
    else if (outerIndex === 1){
        message = util.format(array[index], name);
    }
    else if (outerIndex === 2){
        message = util.format(array[index], name, user);
    }
    else if (outerIndex === 3){
        message = util.format(array[index], name, id);
    }
    return message;
}

// Advice

function askingForAdvice(message){
    var lower = message.toLowerCase();

    if (lower.indexOf("no good for me") > -1){
        return true;
    }

    if (lower.indexOf("mess with my credit") > -1){
        return true;
    }

    if (lower.indexOf("should i go over there") > -1){
        return true;
    }

    if (lower.indexOf("should i text") > -1){
        return true;
    }

    if (lower.indexOf("should i bail") > -1){
        return true;
    }

    if (lower.indexOf("is this a bad idea") > -1){
        return true;
    }

    return false;
}

// Inspiration quotes (inspo)
var inspoQuotes = JSON.parse(fs.readFileSync('inspo.json', 'utf8'));
var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
var fonts = [120432, 120380, 120328, 120276, 120224, 120172, 120016, 119912, 119808];

function Inspo(channelID, userID){
    var fontIndex = getRandomInt(0, fonts.length-1);
    var inspoIndex = getRandomInt(0, inspoQuotes.length-1);

    var inspiration = convert(fonts[fontIndex], inspoQuotes[inspoIndex]);

    var output = util.format("<@%s> %s", userID, inspiration);

    bot.sendMessage({
        to: channelID,
        message: output
    });
}

function convert(font, string) {
    var converted = [];
    // Break string into substrings
    var arr = string.split('');
    // Search alpha for indexes
    arr.forEach(element => {
        let i = alphabet.indexOf(element);
        if (i == -1) {
            // Return as is
            converted.push(element);
        } else {
            // Get relevant character from unicode var + index
            let unicode = font + i;
            // Return as HTML code
            converted.push(String.fromCodePoint(unicode));
        }

    });
    fancy = converted.join('');
    return fancy;
}

// Rank vars and methods
var ranks = JSON.parse(fs.readFileSync('ranks.json', 'utf8'));
var progress = JSON.parse(fs.readFileSync('xp.json', 'utf8'));

var stopRank = ranks.stop;
var rankQuestionAsked = ranks.asked;
var theChooserID = "";

function RankUp(userID){
    progress[userID] = 0;

    if (userID in ranks && ranks[userID].rank !== -1){
        ranks[userID].rank++;
        ranks[userID].paid = false;
        if (ranks[userID].rank >= ranks.ranks.length){
            ranks[userID].rank = 0;
            ranks[userID].prestige++;
            var resetRank = ranks.ranks[0];
            if (ranks[userID].prestige == 3 && !rankQuestionAsked){
                resetRank = ranks.odd_ranks[0];
            }
            if (ranks[userID].prestige == 4 && !rankQuestionAsked){
                rankQuestionAsked = true;
                theChooserID = userID;
                return util.format("<@%s> Let's be honest for a moment here. This has gone on long enough. Who am I to decide your rank. It's time for an end, don't you agree? !yes or !no", userID);
            }
            else{
                return util.format("<@%s> Wow you leveled up past the highest rank. I guess that means you prestige? You are now **%s (Prestige %d)**.", userID, resetRank, ranks[userID].prestige);
            }
        }
    }
    else{
        ranks[userID] = {};
        ranks[userID].rank = 0;
        ranks[userID].prestige = 0;
        ranks[userID].paid = false;
    }

    var newRank = ranks.ranks[ranks[userID].rank];
    if (ranks[userID].prestige == 3 && !rankQuestionAsked){
        newRank = ranks.odd_ranks[ranks[userID].rank];
    }
    if (userID == 88634159299321856 && newRank === "A Weeb"){
        newRank = "~~A Weeb~~ Not A Weeb";
    }
    var prestige = ranks[userID].prestige;
    var prestigeString = "";
    if (prestige > 0 && !(prestige == 3 && ranks[userID].rank > 4)){
        prestigeString = util.format(" (Prestige %d)", prestige);
    }

    return util.format("Congratulations <@%s>! You have leveled up! You are now **%s%s**.", userID, newRank, prestigeString);
}

function TotalBar(userID){
    var max = ranks.ranks.length;
    var meter = GetRankIndex(userID) + 1;

    var remain = max - meter;
    return util.format("`Rank Total Progress [%s%s]`", "=".repeat(meter), " ".repeat(remain));
}

function ProgressBar(userID){
    var max = ranks.ranks.length;
    var target = GetProgressTarget(userID);
    var prog = progress[userID];

    var meter = Math.floor((max / target) * prog);
    if (meter > max){
        var over = meter - max;
        return util.format("`Next Level Progress [%s]%s`", "=".repeat(max), "=".repeat(over));
    }
    var remain = max - meter;
    return util.format("`Next Level Progress [%s%s]`", "=".repeat(meter), " ".repeat(remain));
}

function GetRank(userID){
    if (userID in ranks){
        var userRank = ranks.ranks[ranks[userID].rank];
        if (ranks[userID].prestige == 3 && !rankQuestionAsked){
            userRank = ranks.odd_ranks[ranks[userID].rank];
        }
        if (userID == 88634159299321856 && userRank === "A Weeb"){
            userRank = "~~A Weeb~~ Not A Weeb";
        }
        var prestige = ranks[userID].prestige;
        var prestigeString = "";
        if (prestige > 0 && !(prestige == 3 && ranks[userID].rank > 4)){
            prestigeString = util.format(" (Prestige %d)", prestige);
        }

        return util.format("We're all very proud of you <@%s>. You are **%s%s**.\n%s\n%s\n`Michael on cooldown: %s`", userID, userRank, prestigeString, ProgressBar(userID), TotalBar(userID), ranks[userID].paid.toString());
    }
    else{
        return util.format("Oh... <@%s>. You don't have a rank yet. Oh.", userID);
    }
}

function WriteRanks(){
    ranks.stop = stopRank;
    ranks.asked = rankQuestionAsked;
    var rankJson = JSON.stringify(ranks);
    fs.writeFileSync('ranks.json', rankJson);
}

function WriteXP(){
    var xpJson = JSON.stringify(progress);
    fs.writeFileSync('xp.json', xpJson);
}

function SetProgress(userID, prog){
    progress[userID] = prog;
}

function GetRankIndex(userID){
    if (userID in ranks){
        return ranks[userID].rank;
    }
    return 0;
}

function GetPrestige(userID){
    if (userID in ranks){
        return ranks[userID].prestige;
    }
    return 0;
}

function GetRankValue(userID){
    var rank = GetRankIndex(userID);
    var pres = GetPrestige(userID);

    var max = ranks.ranks.length;

    return (pres * max) + rank;
}

function GetProgressTarget(userID){
    var base = 69;
    if (userID in ranks){
        base = base + (GetRankIndex(userID) * 5);
        base = base + (GetPrestige(userID) * 40);
    }

    return base;
}

function MichaelTransaction(userID, payment){
    if (!payment.startsWith("http")){
        return util.format("C'mon now, <@%s>! You're gonna try to pay me with this?! For Michael Transactions? Grow up!.", userID);
    }

    if (userID in ranks){
        if ("paid" in ranks[userID] && ranks[userID].paid){
            return "New so-called 'Gambling Laws' require us to have a mandatory cooldown of microtransaction purchases for users. Please try again later.";
        }

        ranks[userID].paid = true;
    }
    else{
        ranks[userID] = {};
        ranks[userID].rank = -1;
        ranks[userID].prestige = 0;
        ranks[userID].paid = true;
    }
    var prog_earned = getRandomInt(10, 100);

    if (userID in progress){
        progress[userID] = progress[userID] + prog_earned;
    }
    else{
        progress[userID] = prog_earned;
    }
    WriteRanks();

    return util.format("Too much of a grind for ya, <@%s>? I'll give you about %d Pos Progress Points:tm: for that.", userID, prog_earned);
}

function Leaderboard(channelID){
    var leaderboard = {};
    for (var userID in ranks){
        if (userID === "ranks" || userID === "odd_ranks" || userID === "stop" || userID === "asked"){
            continue;
        }
        var rankVal = GetRankValue(userID);
        var member = getMember(userID);
        if (!(rankVal in leaderboard)){
            leaderboard[rankVal] = [];
        }
        leaderboard[rankVal].push(member.nick);
    }

    var output = "Leaderboard\n```";
    var position = 1;
    var keys = Object.keys(leaderboard);
    keys.sort((a, b) => b - a);

    for (var key of keys){
        for (var nick of leaderboard[key]){
            output = output + util.format("%d. %s\n", position, nick);
            position++;
        }
    }
    output = output + "```";

    bot.sendMessage({
        to: channelID,
        message: output
    });
}

// Magic 8 ball
function predict(userID, channelID){
    var responses = ["It is certain.", "It is decidedly so.", "Without a doubt.", "Yes - definitely.", "You may rely on it.", "As I see it, yes.",
                     "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.", "Better not tell you now.",
                     "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.",
                     "Very doubtful."];
    var index = getRandomInt(0, responses.length - 1);
    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> %s", userID, responses[index])
    });
}

// Reminder
function SetReminder(userID, channelID, time, message){
    var remindMsg = message;
    var timer = time;

    if (isNaN(timer) || timer < 1 || timer > 240){
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Please enter a number between 1 and 240", userID)
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

function DoTheReminding(userID, channelID, message){
    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> %s", userID, message)
    });
}

// To Do list
var tasks = JSON.parse(fs.readFileSync('todo.json', 'utf8'));

function WriteTasks(){
    var taskJson = JSON.stringify(tasks);
    fs.writeFileSync('todo.json', taskJson);
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
        message: util.format("%s Here's your to do list:\n%sI believe you can do each one!", userAt, tasklist)
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

// Quote
function Quote(channelID, messageID, commandID, quoterID){

    bot.getMessage({
        channelID : channelID,
        messageID : messageID
    }, function (err, message){
        var quote = {color: 6826080};
        if (err){
            quote.description = "No quote found";
            quote.author = {name: "posbot"};
        }
        else{
            var member = getMember(message.author.id);
            var quoter = getMember(quoterID);
            quote.description = message.content;
            quote.author = {name: member.nick};
            quote.timestamp = message.timestamp;
            quote.footer = {text: util.format("Quoted by %s", quoter.nick)};
        }

        bot.sendMessage({
            to: channelID,
            embed: quote
        });

        if (commandID !== -1){
            bot.deleteMessage({
                channelID : channelID,
                messageID : commandID
            }, function(err){
                if (err){
                    logger.info(JSON.stringify(err));
                    logger.info(util.format("channel id = %s, message id = %s", channelID, commandID));
                }
            });
        }
    });
}

function GetMessageIDFromContent(channelID, content, callback){
    bot.getMessages({
        channelID : channelID,
        limit : 10
    }, function (err, messageArray){
        if (err){
            logger.info(err);
        }
        else{
            for (var message of messageArray){
                if (message.content == content){
                    return callback(message.id);
                }
            }
        }
        return callback(-1);
    });
}

bot.on("message", function (user, userID, channelID, message, evt) {
    if (userID == 348179384580177922){
        return;
    }

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == "!") {
        var args = message.substring(1).split(" ");
        var cmd = args[0];

        args = args.splice(1);
        logger.info(args);
        switch(cmd) {
            // !ping
            case "ping":
                bot.sendMessage({
                    to: channelID,
                    message: "Pong!"
                });
                break;
            case "help":
                PrintHelp(channelID);
                break;
            case "helpall":
                PrintHelpAll(channelID);
                break;
            case "notail":
                var noun = "flower";
                var choice = getRandomInt(1, 3);
                if (choice === 1){
                    noun = "flower";
                }
                else if (choice === 2){
                    noun = "river";
                }
                else{
                    noun = "fucking rainbow m8";
                }
                bot.sendMessage({
                    to: channelID,
                    message: util.format("%s, you're a %s", user, noun)
                });
                break;
            case "compliment":
                var subcount = subs.length;
                var subno = getRandomInt(0, subcount-1);
                var sub = subs[subno];
                var rec = util.format("<@%s>", userID);
                if (args.length > 0){
                    rec = args.join(" ");
                }
                getRedditComment(sub, function(comm){
                    bot.sendMessage({
                        to: channelID,
                        message: rec + " " + comm
                    });
                });
                break;
            case "markov":
                send_markov(channelID);
                break;
            case "roll":
                var diceReturn = diceRoll(args);
                bot.sendMessage({
                    to: channelID,
                    message: diceReturn
                });
                break;
            case "heyruby":
                var ruby = "woof";
                rubyPatience = rubyPatience + 1;
                if (rubyPatience > 2){
                    ruby = "woof, bitch";
                    rubyPatience = 0;
                }
                bot.sendMessage({
                    to: channelID,
                    message: ruby
                });
                break;
            case "savepoint":
                bot.sendMessage({
                    to: channelID,
                    message: getSavepoint()
                });
                break;
            case "stats":
                bot.sendMessage({
                    to: channelID,
                    message: getMessageStats(channelID, userID, user)
                });
                break;
            case "statstotal":
                bot.sendMessage({
                    to: channelID,
                    message: getTotalStats(userID, user)
                });
                break;
            case "countmessages":
                if (userID === "88614328499961856"){
                    if (args.length > 0){
                        queryChannelHistory(args[0]);
                    }
                    else{
                        queryChannelHistory(channelID);
                    }
                }
                break;
            case "whoami":
                var member = getMember(userID);
                
                bot.sendMessage({
                    to: channelID,
                    message: whoAmI(member.nick, user, userID)
                });
                break;
            case "whoapos":
                bot.sendMessage({
                    to: channelID,
                    message: "I'm posbot, the positivity botitivity"
                });
                break;
            case "inspo":
                Inspo(channelID, userID);
                break;
            case "rank":
                if (stopRank){
                    break;
                }
                bot.sendMessage({
                    to: channelID,
                    message: GetRank(userID)
                });
                break;
            case "buy-microtransaction":
                if (stopRank){
                    break;
                }
                if (args[0]){
                    bot.sendMessage({
                        to: channelID,
                        message: MichaelTransaction(userID, args[0])
                    });
                }
                break;
            case "leaderboard":
                Leaderboard(channelID);
                break;
            case "setprogress":
                if (userID === "88614328499961856"){
                    if (args[0] && args[1]){
                        SetProgress(args[0], parseInt(args[1]));
                    }
                }
                break;
            case "yes":
                if (rankQuestionAsked && userID == theChooserID){
                    stopRank = true;
                    theChooserID = "";
                    WriteRanks();
                    bot.sendMessage({
                        to: channelID,
                        message: "Good Choice. Deleting all rank data."
                    });
                }
                break;
            case "no":
                if (rankQuestionAsked && userID == theChooserID){
                    stopRank = false;
                    theChooserID = "";
                    bot.sendMessage({
                        to: channelID,
                        message: "Then we shall continue."
                    });
                }
                break;
            case "newgift":
                regift(userID, channelID);
                break;
            case "8ball":
                predict(userID, channelID);
                break;
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
            case "quote":
                if (args[0]){
                    GetMessageIDFromContent(channelID, message, function(id){
                        Quote(channelID, args[0], id, userID);
                    });
                }
                break;
            default:
                // No other cases matched, check werewolf
                werewolf.Werewolf(user, userID, channelID, cmd, args, bot);
                break;
        }

        // Don't do any message stats on ! commands
        return;
    }
    if (message.indexOf(bot_at) > -1){
        logger.info("I have been @");
        var messageContents = message.replace(bot_at, "");
        logger.info("@ with message contents: " + messageContents);

        if (askingForAdvice(messageContents)){
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> That's a great question. I get asked about this topic a lot and it reminds me of a quote:\n\"BITCH, DON'T\"\n-me", userID)
            });
        }
        else{
            var messageParts = messageContents.split(" ");
            var index = getRandomInt(0, messageParts.length - 1);
            var word = messageParts[index];
            if (!word.trim()){
                send_markov(channelID);
            }
            else{
                logger.info("attempting markov with word: " + word);
                specific_markov(userID, channelID, word);
            }
        }
    }
    else if (channelID != 348180091680849922) {
        // Update chat log
        history = history.concat(message + "\n");
        fs.writeFile("chat.log", history, function(err) {
            if (err){
                throw err;
            }
        });

        // Check xmas
        if (IsXmas()){
            if (!(userID in xmasGifts)){
                getImgurImage(function(image){
                    xmasGifts[userID] = image;
                    bot.sendMessage({
                        to: channelID,
                        message: util.format("Hey <@%s>! Merry Xmas 🎄\nI saw this and thought of you %s", userID, image)
                    });
                });
            }
        }

        // Check markov trigger
        timeSinceLast++;
        var chance = getRandomInt(1, timeSinceLast);
        if (chance > 30){
            logger.info("its been too long, time to pipe up");
            if (IsBirthday()){
                getImgurImage(function(image){
                    bot.sendMessage({
                        to: channelID,
                        message: util.format("Happy Birthday <@%s>! 🎉 🍰 🎂 🎊\nHere's your gift %s", baby, image)
                    });
                });
            }
            else{
                send_markov(channelID);
            }
            timeSinceLast = 1;
        }

        // Update markov object
        if (messageCount > 100){
            messageCount = 0;
            quotes = new MarkovChain(history);
            logger.info("updated markov history");
        }
        else{
            messageCount++;
        }
    }
    if (message.indexOf("🙃") > -1){
        bot.sendMessage({
            to: channelID,
            message: "don't worry sam! Something something something"
        });
    }
    if (message.indexOf("^w^") > -1){
        bot.sendMessage({
            to: channelID,
            message: "How he do that face?"
        });
    }
    updateUserMsgCount(channelID, userID, false);

    if (!stopRank){
        if (userID in progress){
            progress[userID]++;
        }
        else{
            progress[userID] = 1;
        }

        var rankChance = getRandomInt(1, progress[userID]);
        var progressTarget = GetProgressTarget(userID);
        if (rankChance > progressTarget){
            var rankMessage = RankUp(userID);
            bot.sendMessage({
                to: channelID,
                message: rankMessage
            });
            WriteRanks();
        }
        else{
            //logger.info(util.format("%d is not > %d", rankChance, progressTarget))
        }
        WriteXP();
    }
});
