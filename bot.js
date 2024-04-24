// Standard
const fs = require("fs");
const util = require("util");

// Third Party
const Eris = require("eris");
const logger = require("winston");
const request = require("request");
const schedule = require("node-schedule");

// Local
const auth = require("./auth.json");
const burgs = require("./burgs/burgs");
const help = require("./help/help");
const horoscope = require("./horoscope/horoscope");
const improve = require("./improve/improve");
const markov = require("./markov/markov");
const messageHistory = require("./message_history/history");
const randomInt = require("./randomint");
const reddit = require("./reddit/reddit");
const remind = require("./remind/remind");
const soccer = require("./soccer/soccer");
// const rpg = require("./rpg/rpg");
const todo = require("./todo/todo");
const userInfo = require("./user");
const wordStats = require("./word_stats/word_stats");

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console({
    colorize: true
}));
logger.level = "debug";

// Dice Roll
function isPositiveNumber(num) {
    if (num && !Number.isNaN(num) && +num > 0) {
        return true;
    }
    return false;
}

function diceRoll(args) {
    let dice = args[0];
    if (dice.indexOf("d") > -1) {
        let diceParts = dice.split("d");
        let amount = diceParts[0];
        let dicenumber = diceParts[1];

        if (!amount) {
            amount = "1";
        }

        if (isPositiveNumber(amount) && isPositiveNumber(dicenumber)) {
            let total = 0;
            let parts = [];

            for (let i = 0; i < +amount; i++) {
                let roll = randomInt.Get(1, +dicenumber);
                parts.push(roll);
                total = total + roll;
            }
            if (amount === "1"){
                return total;
            }

            return util.format("(%s) = %d", parts.join(" + "), total);
        }
    }

    return "Invalid Dice";
}


// Get Gift
function getFlickrImage(callback) {
    let url = "https://api.flickr.com/services/feeds/photos_public.gne?format=json";

    request(url, function(error, response, body) {
        body = body.replace("jsonFlickrFeed(", "");
        body = body.replace(/\)$/, "");
        let feed = JSON.parse(body);
        let images = feed.items;
        let index = randomInt.Get(0, images.length - 1);
        let image = images[index].link;

        return callback(image);
    });
}

function regift(userID, channelID) {
    if (!(userID in xmasGifts)) {
        return;
    }

    if ("regifted" in xmasGifts) {
        if (xmasGifts.regifted.indexOf(userID) > -1) {
            bot.createMessage(
                channelID,
                util.format("<@%s> Listen here, bucko. I've already gotten you two thoughtful gifts. Maybe you should be a little more grateful.", userID)
            );
            return;
        }
        xmasGifts.regifted.push(userID);
    } else {
        xmasGifts.regifted = [];
        xmasGifts.regifted.push(userID);
    }
    getFlickrImage(function(image) {
        xmasGifts[userID] = image;
        bot.createMessage(
            channelID,
            util.format("<@%s> Ok... I put a lot of work into that gift... JK. Here's your real gift. %s That I always intended to give you.", userID, image)
        );
    });
}

// Xmas
let xmasGifts = {};

function IsXmas() {
    let today = new Date().toString();
    if (today.indexOf("Dec 25") > -1) {
        return true;
    }
    xmasGifts = {};
    return false;
}

// Birthdays
let birthdays = JSON.parse(fs.readFileSync("bdays.json", "utf8"));
function SaveBirthdays(){
    let bdaysJson = JSON.stringify(birthdays, null, 4);
    fs.writeFileSync("bdays.json", bdaysJson);
}

function IsBirthday(userID) {
    if (birthdays.today && birthdays.today.includes(userID)){
        return true;
    }
    return false;
}

function DeliveredBirthdayGift(userID){
    let index = birthdays.today.indexOf(userID);
    if (index > -1) {
        birthdays.today.splice(index, 1);
    }
    SaveBirthdays();
}

// Ruby vars
let rubyPatience = 0;

// Determination
let savepoints = JSON.parse(fs.readFileSync("determination.json", "utf8"));
let overwrite = -1;

function getSavepoint() {
    let index = randomInt.Get(0, savepoints.length - 1);
    if (overwrite !== -1) {
        index = overwrite;
        overwrite = -1;
    }
    return savepoints[index];
}

// Initialize Discord Bot
let bot = new Eris(auth.token);

bot.on("ready", () => {
    logger.info("Connected");
    logger.info("Logged in as: ");
    logger.info(bot.user.username + " - (" + bot.user.id + ")");
});

let backoff = 1;
let attempts = 1;
function CheckConnection() {
    if (bot.uptime < 1) {
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
schedule.scheduleJob("0 12 * * *", function() {
    remind.CheckDailyReminders(bot);
});

// Midnight scheduler
schedule.scheduleJob("0 0 * * *", function() {
    let today = new Date().toString();
    for (let bday in birthdays) {
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
    soccer.ClearDrew();
});

// Minute scheduler
schedule.scheduleJob("* * * * *", function() {
    CheckConnection();
    remind.CheckMinuteReminders(bot);
    wordStats.Write();
});

// Random point in day scheduler, kicked off at 6pm
schedule.scheduleJob("0 18 * * *", function() {
    let delay = randomInt.Get(1000, 86400000);
    setTimeout(soccer.UpdateLimit, delay);
});


// Who Am I vars
const whoYouAre = JSON.parse(fs.readFileSync("whoyouare.json", "utf8"));

function whoAmI(member) {
    let outerIndex = randomInt.Get(0, 7);
    if (outerIndex > 3) {
        outerIndex = 1;
    }
    let array = whoYouAre[outerIndex];
    let index = randomInt.Get(0, array.length - 1);
    let message = "";

    if (outerIndex === 0) {
        message = array[index];
    } else if (outerIndex === 1) {
        message = util.format(array[index], member.nick);
    } else if (outerIndex === 2) {
        message = util.format(array[index], member.nick, member.username);
    } else if (outerIndex === 3) {
        message = util.format(array[index], member.nick, member.id);
    }
    return message;
}

// Inspiration quotes (inspo)
const inspoQuotes = JSON.parse(fs.readFileSync("inspo.json", "utf8"));
const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
];
const fonts = [120432, 120380, 120328, 120276, 120224, 120172, 120016, 119912, 119808];

function Inspo(userID, channelID) {
    let fontIndex = randomInt.Get(0, fonts.length - 1);
    let inspoIndex = randomInt.Get(0, inspoQuotes.length - 1);

    let inspiration = convert(fonts[fontIndex], inspoQuotes[inspoIndex]);

    let output = util.format("<@%s> %s", userID, inspiration);

    bot.createMessage(
        channelID,
        output
    );
}

function convert(font, string) {
    let converted = [];
    // Break string into substrings
    let arr = string.split("");
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
    let fancy = converted.join("");
    return fancy;
}

// Magic 8 ball
function predict(userID, channelID) {
    let responses = ["It is certain.", "It is decidedly so.", "Without a doubt.", "Yes - definitely.", "You may rely on it.", "As I see it, yes.",
        "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.", "Better not tell you now.",
        "Cannot predict now.", "Concentrate and ask again.", "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.",
        "Very doubtful."
    ];
    let index = randomInt.Get(0, responses.length - 1);
    bot.createMessage(
        channelID,
        util.format("<@%s> %s", userID, responses[index])
    );
}

// Cheese
const cheeses = JSON.parse(fs.readFileSync("cheeses.json", "utf8"));

function cheese(userID, channelID) {
    let index = randomInt.Get(0, cheeses.length - 1);

    bot.createMessage(
        channelID,
        util.format("<@%s> %s", userID, cheeses[index])
    );
}

function rockpaperscissors(userID, channelID) {
    bot.createMessage(
        channelID,
        util.format("<@%s> Ok, on 'Shoot', are you ready?", userID)
    );

    let options = ["Rock", "Paper", "Scissors"];
    let index = randomInt.Get(0, 2);
    let choice = options[index];

    options.push("Shoot!");
    options.push(choice);

    timeoutThenMessage(channelID, 1500, options);
}

function timeoutThenMessage(channelID, timeout, messages){
    if (messages.length === 0){
        return;
    }

    setTimeout(function(){
        bot.createMessage(
            channelID,
            messages[0]
        );
        messages.shift();
        timeoutThenMessage(channelID, timeout, messages);
    }, timeout);
}

bot.on("messageCreate", (msg) => {
    if (msg.author.bot) {
        return;
    }
    let member = msg.member;
    if (!member){
        member = userInfo.GetMember(bot, msg.author.id);
    }
    if (!member){
        bot.createMessage(
            msg.channel.id,
            "You can only interact with posbot if you share a server."
        );
        return;
    }

    let message = msg.content;
    let channelID = msg.channel.id;
    let userID = msg.author.id;

    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == "!") {
        let args = message.substring(1).split(" ");
        let cmd = args[0].toLowerCase();

        args = args.splice(1);

        let logged = util.format("Running command %s", cmd);
        if (args.length > 0){
            logged += util.format(" with arguments %s", args.join(" "));
        }
        logger.info(logged);

        switch (cmd) {
        // !ping
        case "ping":
            bot.createMessage(
                channelID,
                "Pong!"
            );
            break;
        case "disconnect":
            if (userID === "88614328499961856"){
                bot.disconnect({reconnect:true});
            }
            break;
        case "reconnect":
            if (userID === "88614328499961856"){
                bot.disconnect({reconnect:"auto"});
            }
            break;
        case "notail":{
            let noun = "flower";
            let choice = randomInt.Get(1, 3);
            if (choice === 1) {
                noun = "flower";
            } else if (choice === 2) {
                noun = "river";
            } else {
                noun = "fucking rainbow m8";
            }
            bot.createMessage(
                channelID,
                util.format("%s, you're a %s", member.nick, noun)
            );
            break;
        }
        case "compliment":{
            let receiver = util.format("<@%s>", userID);
            if (args.length > 0) {
                receiver = args.join(" ");
            }
            reddit.GetRandomRedditComment(function(comm) {
                bot.createMessage(
                    channelID,
                    receiver + " " + comm
                );
            });
            break;
        }
        case "markov":
            markov.Send(channelID);
            break;
        case "markov-chance":
            bot.createMessage(
                channelID,
                markov.Chance()
            );
            break;
        case "r": // Fallthrough
        case "roll":{
            let diceReturn = diceRoll(args);
            bot.createMessage(
                channelID,
                diceReturn
            );
            break;
        }
        case "heypatch": // Fallthrough
        case "heyruby": // Fallthrough
        case "heysammy": // Fallthrough
        case "heytess": // Fallthrough
        case "heyyoshi": // Fallthrough
        case "heydoggo": // Fallthrough
        case "heydog":{
            let ruby = "woof";
            rubyPatience = rubyPatience + 1;
            if (rubyPatience > 1) {
                ruby = "bork";
            }
            if (rubyPatience > 2) {
                ruby = "woof woof woof";
                rubyPatience = 0;
            }
            bot.createMessage(
                channelID,
                ruby
            );
            break;
        }
        case "heychips":{
            let chip = "meow";
            rubyPatience = rubyPatience + 1;
            if (rubyPatience > 2) {
                chip = "_bonks head on leg_";
                rubyPatience = 0;
            }
            bot.createMessage(
                channelID,
                chip
            );
            break;
        }
        case "heyemma":{
            let emma = "😏";
            rubyPatience = rubyPatience + 1;
            if (rubyPatience > 1) {
                emma = "^^";
            }
            if (rubyPatience > 2) {
                emma = "life is just _so_ hard";
                rubyPatience = 0;
            }
            bot.createMessage(
                channelID,
                emma
            );
            break;
        }
        case "determination": // Fallthrough
        case "savepoint":
            bot.createMessage(
                channelID,
                getSavepoint()
            );
            break;
        case "whoami":
            bot.createMessage(
                channelID,
                whoAmI(member)
            );
            break;
        case "whoapos":
            bot.createMessage(
                channelID,
                "I'm posbot, the positivity botitivity"
            );
            break;
        case "inspo":
            Inspo(userID, channelID);
            break;
        case "newgift":
            regift(userID, channelID);
            break;
        case "8ball":
            predict(userID, channelID);
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
            // Horoscope
            horoscope.Commands(bot, userID, channelID, cmd);
            // Improve yourself
            improve.Commands(bot, userID, channelID, cmd);
            // To Do List
            todo.Commands(bot, userID, channelID, cmd, args);
            // Reminders
            remind.Commands(bot, userID, channelID, cmd, args);
            // Soccer Sweepstakes
            soccer.Commands(bot, userID, channelID, cmd, args);
            // RPG
            // rpg.Commands(bot, userID, channelID, cmd, args);
            // Burger checklist
            burgs.Commands(bot, member.username, userID, channelID, cmd, args);
            // Word stats
            wordStats.Commands(bot, userID, channelID, cmd, args);
            messageHistory.Commands(bot, userID, channelID, cmd);
            break;
        }

        // Don't do any message stats on ! commands
        return;
    }

    // Check xmas
    if (IsXmas()) {
        if (!(userID in xmasGifts)) {
            getFlickrImage(function(image) {
                xmasGifts[userID] = image;
                bot.createMessage(
                    channelID,
                    util.format("Hey <@%s>! Merry Xmas 🎄\nI saw this and thought of you %s", userID, image)
                );
            });
        }
    }

    // Check Birthdays
    if (IsBirthday(userID)) {
        getFlickrImage(function(image) {
            let picsum = util.format("https://picsum.photos/id/%d/3840/2160", randomInt.Get(1, 1080));
            bot.createMessage(
                channelID,
                util.format(
                    "Happy Birthday <@%s>! 🎉 🍰 🎂 🎊\nHere are some gifts I've gathered specifically for you.\nPicsum: %s\nFlickr: %s\n~~Reddit pic:~~", 
                    userID,
                    picsum,
                    image,
                )
            );
            DeliveredBirthdayGift(userID);
        });
    }

    // Check markov triggers and update history
    markov.Update(bot, userID, channelID, message, msg.id);

    // Update Word Stats
    wordStats.Update(userID, message);

    // Check rpg triggers
    // rpg.Update(bot, userID, channelID);

    // Extra message contents responses
    if (message.indexOf("🙃") > -1) {
        bot.createMessage(
            channelID,
            "don't worry sam! Something something something"
        );
    }
    else if (message.toLowerCase().indexOf("^w^") > -1) {
        bot.createMessage(
            channelID,
            "How he do that face?"
        );
    }
    else if (message.toLowerCase().indexOf("good, you") > -1) {
        bot.createMessage(
            channelID,
            "Good, you?"
        );
    }

    // Update user message stats
    messageHistory.Update(channelID, userID, false, true);
});

bot.connect();
