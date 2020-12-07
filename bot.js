// Standard
var fs = require("fs");
var util = require("util");

// Third Party
var Discord = require("discord.io");
var logger = require("winston");
var request = require("request");
var schedule = require("node-schedule");

// Local
var auth = require("./auth.json");
var burgs = require("./burgs/burgs");
var help = require("./help/help");
var improve = require("./improve/improve");
var markov = require("./markov/markov");
var quote = require("./quote/quote");
var randomInt = require("./randomint");
var ranks = require("./ranks/ranks");
var remind = require("./remind/remind");
var rpg = require("./rpg/rpg");
var todo = require("./todo/todo");
var userInfo = require("./user");
var werewolf = require("./werewolf/werewolf");

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = "debug";

// Dice Roll
function isPositiveNumber(num) {
    if (num && num !== Number.isNaN && +num > 0) {
        return true;
    }
    return false;
}

function diceRoll(args) {
    var dice = args[0];
    if (dice.indexOf("d") > -1) {
        var diceParts = dice.split("d");
        var amount = diceParts[0];
        var dicenumber = diceParts[1];

        if (amount === "") {
            amount = "1";
        }

        if (isPositiveNumber(amount) && isPositiveNumber(dicenumber)) {
            var total = 0;
            for (var i = 0; i < +amount; i++) {
                total = total + randomInt.Get(1, +dicenumber);
            }
            return total;
        }
    }

    return "Invalid Dice";
}

// Reddit Functions
var subs = [
    "amiugly", "awesome", "aww", "beauty", "boastme", "FancyFollicles", "gonewild", "happy", "LadyBoners", "MakeupAddiction",
    "meirl", "me_irl", "Pareidolia", "PrequelMemes", "relationships", "RoastMe", "Tinder", "UpliftingNews"
];

function getRedditComment(sub, callback) {
    var url = "http://www.reddit.com/r/" + sub + "/comments/.json?limit=50";
    logger.info(url);
    var comment = "<Insert reddit comment here>";

    request(url, function(error, response, body) {
        //console.log("error:", error); // Print the error if one occurred
        //console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
        //console.log("body:", body); // Print the HTML for the Google homepage.

        var redditResponse = JSON.parse(body);
        var post = randomInt.Get(0, 49);

        comment = redditResponse.data.children[post].data.body;
        if (comment.indexOf("I am a bot") > -1) {
            return getRedditComment(sub, callback);
        } else {
            logger.info(comment);
            return callback(comment);
        }

    });
}

// Get Gift
function getFlickrImage(callback) {
    var url = "https://api.flickr.com/services/feeds/photos_public.gne?format=json";

    request(url, function(error, response, body) {
        body = body.replace("jsonFlickrFeed(", "");
        body = body.replace(/\)$/, "");
        var feed = JSON.parse(body);
        var images = feed.items;
        var index = randomInt.Get(0, images.length - 1);
        var image = images[index].link;

        return callback(image);
    });
}

function regift(userID, channelID) {
    if (!(userID in xmasGifts)) {
        return;
    }

    if ("regifted" in xmasGifts) {
        if (xmasGifts.regifted.indexOf(userID) > -1) {
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> Listen here, bucko. I've already gotten you two thoughtful gifts. Maybe you should be a little more grateful.", userID)
            });
            return;
        }
        xmasGifts.regifted.push(userID);
    } else {
        xmasGifts.regifted = [];
        xmasGifts.regifted.push(userID);
    }
    getFlickrImage(function(image) {
        xmasGifts[userID] = image;
        bot.sendMessage({
            to: channelID,
            message: util.format("<@%s> Ok... I put a lot of work into that gift... JK. Here's your real gift. %s That I always intended to give you.", userID, image)
        });
    });
}

// Xmas
var xmasGifts = {};

function IsXmas() {
    var today = new Date().toString();
    if (today.indexOf("Dec 25") > -1) {
        return true;
    }
    xmasGifts = {};
    return false;
}

// Birthdays
var birthdays = JSON.parse(fs.readFileSync('bdays.json', 'utf8'));
function SaveBirthdays(){
    var bdaysJson = JSON.stringify(birthdays, null, 4);
    fs.writeFileSync('bdays.json', bdaysJson);
}

function IsBirthday(userID) {
    if (birthdays.today.includes(userID)){
        return true;
    }
    return false;
}

function DeliveredBirthdayGift(userID){
    var index = birthdays.today.indexOf(userID);
    if (index > -1) {
        birthdays.today.splice(index, 1);
    }
    SaveBirthdays();
}

// Ruby vars
var rubyPatience = 0;

// Determination
var savepoints = JSON.parse(fs.readFileSync('determination.json', 'utf8'));
var overwrite = -1;

function getSavepoint() {
    var index = randomInt.Get(0, savepoints.length - 1);
    if (overwrite !== -1) {
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

bot.on("ready", function(evt) {
    logger.info("Connected");
    logger.info("Logged in as: ");
    logger.info(bot.username + " - (" + bot.id + ")");
});

var backoff = 1;
var attempts = 1;
function CheckConnection() {
    if (!(bot.connected)) {
        if (attempts >= backoff){
            logger.info("Bot has lost connection to Discord. Reconnecting.");
            setTimeout(function(){
                bot.connect();
                setTimeout(function(){
                    if (!(bot.connected)){
                        backoff = backoff * 2;
                        if (backoff > 10){
                            process.exit(1);
                        }
                    }
                    else{
                        backoff = 1;
                        attempts = 1;
                    }
                }, 10000);
            }, 5000);
        }
        else{
            attempts++;
        }
    }
}

// Noon scheduler
var noonScheduler = schedule.scheduleJob("0 12 * * *", function() {
    remind.CheckDailyReminders(bot);
});

// Midnight scheduler
var midnightScheduler = schedule.scheduleJob("0 0 * * *", function() {
    var today = new Date().toString();
    for (var bday in birthdays) {
        if (bday === "today"){
            continue;
        }
        if (today.indexOf(bday) > -1) {
            if (!("today" in birthdays)){
                birthdays.today = [];
            }
            birthdays.today.push(birthdays[bday]);
        }
    }
    SaveBirthdays();
});

// Minute scheduler
var minScheduler = schedule.scheduleJob("* * * * *", function() {
    CheckConnection();
    remind.CheckMinuteReminders(bot);
});

//Channel History
var userMsgCount = JSON.parse(fs.readFileSync('messagecount.json', 'utf8'));
var updateFile = true;

function updateUserMsgCount(channel, user, createNewChan = true) {
    if (channel in userMsgCount) {
        if (user in userMsgCount[channel]) {
            userMsgCount[channel][user]++;
        } else {
            userMsgCount[channel][user] = 1;
        }
    } else if (createNewChan) {
        userMsgCount[channel] = {};
        userMsgCount[channel][user] = 1;
    }

    if (updateFile) {
        var msgJson = JSON.stringify(userMsgCount);
        fs.writeFileSync('messagecount.json', msgJson);
    }
}

function queryChannelHistory(chanID) {
    logger.info("getting message history for channel: " + chanID);
    bot.getMessages({
        channelID: chanID,
        limit: 100
    }, function(err, messageArray) {
        if (err) {
            logger.info(err);
        } else {
            logger.info("1 array size: " + messageArray.length);
            var lastID = 0;
            for (var message of messageArray) {
                logger.info("content: " + message.content);
                if (message.content == null) { continue; }
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

function getPastMessages(chanID, beforeID, count) {
    bot.getMessages({
        channelID: chanID,
        before: beforeID,
        limit: 100
    }, function(err, messageArray) {
        if (err) {
            logger.info("got error, waiting for 10 seconds\n " + err);
            setTimeout(getPastMessages(chanID, beforeID, count), 10000);
        } else {
            var lastID = 0;
            logger.info(count + " array size: " + messageArray.length);
            for (var message of messageArray) {
                if (message.content == null) { continue; }
                //logger.info(message.content);
                lastID = message.id;
                var user = message.author;
                var userID = user.id;
                updateUserMsgCount(chanID, userID);
            }

            if (messageArray.length == 100) {
                getPastMessages(chanID, lastID, count + 1);
            } else {
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

function getMessageTotal() {
    var total = 0;
    for (var chan in userMsgCount) {
        for (var user in userMsgCount[chan]) {
            total = total + userMsgCount[chan][user];
        }
    }
    return total;
}

function getChannelTotal(chan) {
    var total = 0;
    for (var user in userMsgCount[chan]) {
        total = total + userMsgCount[chan][user];
    }
    return total;
}

function getUserTotal(user) {
    var total = 0;
    for (var chan in userMsgCount) {
        if (user in userMsgCount[chan]) {
            total = total + userMsgCount[chan][user];
        }
    }
    return total;
}

function getMessageStats(channel, user, name) {
    if (channel in userMsgCount) {
        if (user in userMsgCount[channel]) {
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

function getTotalStats(user, name) {
    var count = getUserTotal(user);
    var total = getMessageTotal();
    var percent = ((count / total) * 100).toFixed(2);

    var respMsg = util.format("Wow %s! You've posted %d messages in all (counted) channels. Out of a total of %d, that's about %s percent.", name, count, total, percent);
    return respMsg;
}

// Who Am I vars
var whoYouAre = JSON.parse(fs.readFileSync('whoyouare.json', 'utf8'));

function whoAmI(name, user, id) {
    var outerIndex = randomInt.Get(0, 7);
    if (outerIndex > 3) {
        outerIndex = 1;
    }
    var array = whoYouAre[outerIndex];
    var index = randomInt.Get(0, array.length - 1);
    var message = "";

    if (outerIndex === 0) {
        message = array[index];
    } else if (outerIndex === 1) {
        message = util.format(array[index], name);
    } else if (outerIndex === 2) {
        message = util.format(array[index], name, user);
    } else if (outerIndex === 3) {
        message = util.format(array[index], name, id);
    }
    return message;
}

// Inspiration quotes (inspo)
var inspoQuotes = JSON.parse(fs.readFileSync('inspo.json', 'utf8'));
var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
];
var fonts = [120432, 120380, 120328, 120276, 120224, 120172, 120016, 119912, 119808];

function Inspo(channelID, userID) {
    var fontIndex = randomInt.Get(0, fonts.length - 1);
    var inspoIndex = randomInt.Get(0, inspoQuotes.length - 1);

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

// Magic 8 ball
function predict(userID, channelID) {
    var responses = ["It is certain.", "It is decidedly so.", "Without a doubt.", "Yes - definitely.", "You may rely on it.", "As I see it, yes.",
        "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.", "Better not tell you now.",
        "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.",
        "Very doubtful."
    ];
    var index = randomInt.Get(0, responses.length - 1);
    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> %s", userID, responses[index])
    });
}

// Cheese
var cheeses = JSON.parse(fs.readFileSync('cheeses.json', 'utf8'));

function cheese(userID, channelID) {
    var index = randomInt.Get(0, cheeses.length - 1);

    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> %s", userID, cheeses[index])
    });
}

function rockpaperscissors(userID, channelID) {
    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> Ok, on 'Shoot', are you ready?", userID)
    });

    var options = ["Rock", "Paper", "Scissors"];
    var index = randomInt.Get(0, 2);
    var choice = options[index];

    options.push("Shoot!");
    options.push("Pos chooses: " + choice);

    timeoutThenMessage(channelID, 1000, options);
}

function timeoutThenMessage(channelID, timeout, messages){
    if (messages.length === 0){
        return;
    }

    setTimeout(function(){
        bot.sendMessage({
            to: channelID,
            message: messages[0]
        });
        messages.shift();
        timeoutThenMessage(channelID, timeout, messages)
    }, timeout);
}

bot.on("message", function(user, userID, channelID, message, evt) {
    if (userID == bot.id) {
        return;
    }

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == "!") {
        var args = message.substring(1).split(" ");
        var cmd = args[0].toLowerCase();

        args = args.splice(1);
        logger.info(args);
        switch (cmd) {
            // !ping
            case "ping":
                bot.sendMessage({
                    to: channelID,
                    message: "Pong!"
                });
                break;
            case "disconnect":
                if (userID === "88614328499961856"){
                    bot.disconnect();
                }
                break;
            case "reconnect":
                    if (userID === "88614328499961856"){
                        bot.disconnect();
                        setTimeout(function(){
                            bot.connect();
                        }, 5000);
                    }
                    break;
            case "notail":
                var noun = "flower";
                var choice = randomInt.Get(1, 3);
                if (choice === 1) {
                    noun = "flower";
                } else if (choice === 2) {
                    noun = "river";
                } else {
                    noun = "fucking rainbow m8";
                }
                bot.sendMessage({
                    to: channelID,
                    message: util.format("%s, you're a %s", user, noun)
                });
                break;
            case "compliment":
                var subcount = subs.length;
                var subno = randomInt.Get(0, subcount - 1);
                var sub = subs[subno];
                var rec = util.format("<@%s>", userID);
                if (args.length > 0) {
                    rec = args.join(" ");
                }
                getRedditComment(sub, function(comm) {
                    bot.sendMessage({
                        to: channelID,
                        message: rec + " " + comm
                    });
                });
                break;
            case "markov":
                markov.Send(channelID);
                break;
            case "markov-chance":
                bot.sendMessage({
                    to: channelID,
                    message: markov.Chance()
                });
                break;
            case "r": // Fallthrough
            case "roll":
                var diceReturn = diceRoll(args);
                bot.sendMessage({
                    to: channelID,
                    message: diceReturn
                });
                break;
            case "heypatch": // Fallthrough
            case "heyruby": // Fallthrough
            case "heysammy": // Fallthrough
            case "heytess": // Fallthrough
            case "heyyoshi": // Fallthrough
            case "heydoggo": // Fallthrough
            case "heydog":
                var ruby = "woof";
                rubyPatience = rubyPatience + 1;
                if (rubyPatience > 1) {
                    ruby = "bork";
                }
                if (rubyPatience > 2) {
                    ruby = "woof woof woof";
                    rubyPatience = 0;
                }
                bot.sendMessage({
                    to: channelID,
                    message: ruby
                });
                break;
            case "heychips":
                var chip = "meow";
                rubyPatience = rubyPatience + 1;
                if (rubyPatience > 2) {
                    chip = "_bonks head on leg_";
                    rubyPatience = 0;
                }
                bot.sendMessage({
                    to: channelID,
                    message: chip
                });
                break;
            case "heyemma":
                var emma = "😏";
                rubyPatience = rubyPatience + 1;
                if (rubyPatience > 1) {
                    emma = "^^";
                }
                if (rubyPatience > 2) {
                    emma = "life is just _so_ hard";
                    rubyPatience = 0;
                }
                bot.sendMessage({
                    to: channelID,
                    message: emma
                });
                break;
            case "determination": // Fallthrough
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
                if (userID === "88614328499961856") {
                    if (args.length > 0) {
                        queryChannelHistory(args[0]);
                    } else {
                        queryChannelHistory(channelID);
                    }
                }
                break;
            case "whoami":
                var member = userInfo.GetMember(bot, userID, channelID);

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
            case "newgift":
                regift(userID, channelID);
                break;
            case "8ball":
                predict(userID, channelID);
                break;
            case "gaydar":
                var radarmessage = "I am simply a posbot, it's not for me to determine the sexuality of you or anyone else.";
                if (userID == 88632232113102848) {
                    radarmessage = "I am simply a posbot, it's not for me to... Actually, you're like, hella gay my dude. And that's ok, we accept you for who you are.";
                }
                bot.sendMessage({
                    to: channelID,
                    message: radarmessage
                });
                break;
            case "cheese":
                cheese(userID, channelID);
                break;
            case "rps": // Fallthrough
            case "rockpaperscissors":
                rockpaperscissors(userID, channelID);
                break;
            default:
                // No other cases matched, check other modules
                // Help
                help.Commands(bot, userID, channelID, cmd, args);
                // Improve yourself
                improve.Commands(bot, userID, channelID, cmd);
                // Ranks
                ranks.Commands(bot, userID, channelID, cmd, args);
                // Quote
                quote.Commands(bot, userID, channelID, message, cmd, args);
                // To Do List
                todo.Commands(bot, userID, channelID, cmd, args);
                // Reminders
                remind.Commands(bot, userID, channelID, cmd, args);
                // RPG
                rpg.Commands(bot, userID, channelID, cmd, args);
                // Burger checklist
                burgs.Commands(bot, user, userID, channelID, cmd, args);
                // Werewolf
                werewolf.Commands(bot, user, userID, channelID, cmd, args);
                break;
        }

        // Don't do any message stats on ! commands
        return;
    }

    // Extra werewolf check
    werewolf.MuteCheck(userID, channelID);

    // Check xmas
    if (IsXmas()) {
        if (!(userID in xmasGifts)) {
            getFlickrImage(function(image) {
                xmasGifts[userID] = image;
                bot.sendMessage({
                    to: channelID,
                    message: util.format("Hey <@%s>! Merry Xmas 🎄\nI saw this and thought of you %s", userID, image)
                });
            });
        }
    }

    // Check Birthdays
    if (IsBirthday(userID)) {
        getFlickrImage(function(image) {
            bot.sendMessage({
                to: channelID,
                message: util.format("Happy Birthday <@%s>! 🎉 🍰 🎂 🎊\nHere's your gift %s", userID, image)
            });

        });
        DeliveredBirthdayGift(userID);
    }

    // Check markov triggers and update history
    markov.Update(bot, userID, channelID, message);

    // Check rpg triggers
    rpg.Update(bot, userID, channelID);

    // Extra message contents responses
    if (message.indexOf("🙃") > -1) {
        bot.sendMessage({
            to: channelID,
            message: "don't worry sam! Something something something"
        });
    }
    if (message.toLowerCase().indexOf("^w^") > -1) {
        bot.sendMessage({
            to: channelID,
            message: "How he do that face?"
        });
    }

    // Update user message stats
    updateUserMsgCount(channelID, userID, false);

    // Update ranks data
    ranks.Update(bot, userID, channelID);
});
