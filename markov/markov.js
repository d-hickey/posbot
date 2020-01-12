// Standard
var fs = require("fs");
var util = require("util");

// Third Part
var MarkovChain = require("markovchain");

// Local
var randomInt = require("../randomint");

// Discord client
var bot;

var config = JSON.parse(fs.readFileSync('./markov/config.json', 'utf8'));

//Emma's Markov
var bot_at = config.bot;
var history = read_history();
var quotes = new MarkovChain(history);
var messageCount = 0;
var timeSinceLast = 0;

function read_history(){
    return fs.readFileSync("chat.log", "utf8");
}

function write_history(){
    fs.writeFile("chat.log", history, function(err) {
        if (err){
            throw err;
        }
    });
}

function update_chat_log(message){
    history = history.concat(message + "\n");
    write_history();
}

function send_markov(channelID) {
    var limit = randomInt.Get(1, 25);
    var markov = quotes.start(
        function(wordList) {
            var tmpList = Object.keys(wordList);
            return tmpList[~~(Math.random()*tmpList.length)];
        }
    ).end(limit).process();

    if (markov) {
        markov = markov.replace(/(com\/.*?\/status\/)/gi, "https://twitter.$1");
        markov = markov.replace(/com\/r\//gi, "https://reddit.com/r/");
    }

    bot.sendMessage({
        to: channelID,
        message: markov
    });
}

function specific_markov(userID, channelID, word) {
    var limit = randomInt.Get(2, 20);
    bot.sendMessage({
        to: channelID,
        message: util.format("<@%s> %s", userID, quotes.start(word).end(limit).process())
    });
}

// Advice
function asking_for_advice(message){
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

function chance_message(){
    var potential = 0;
    var target = config.chance;
    if (timeSinceLast > target){
        potential = timeSinceLast - target;
    }

    var probability = (potential / timeSinceLast) * 100;

    return util.format("There has been %d messages since last pos markov. The current target is %d. This gives a markov probability of %d / %d which is %d\%",
        timeSinceLast, target, potential, timeSinceLast, probability);
}

function entry(client, userID, channelID, message){
    bot = client;

    if (message.indexOf(bot_at) > -1){
        var messageContents = message.replace(bot_at, "");

        // Discord currently has two formats for @s
        // Remove the formatting for both
        messageContents = messageContents.replace("<@>", "");
        messageContents = messageContents.replace("<@!>", "");
        messageContents = messageContents.replace(/^\s+/, "");
        messageContents = messageContents.replace(/\s+$/, "");

        if (asking_for_advice(messageContents)){
            bot.sendMessage({
                to: channelID,
                message: util.format("<@%s> That's a great question. I get asked about this topic a lot and it reminds me of a quote:\n\"BITCH, DON'T\"\n-me", userID)
            });
        }
        else{
            var messageParts = messageContents.split(/\s+/);
            var index = randomInt.Get(0, messageParts.length - 1);
            var word = messageParts[index];
            if (!word.trim()){
                send_markov(channelID);
            }
            else{
                specific_markov(userID, channelID, word);
            }
        }
    }
    else{
        // Update chat log
        update_chat_log(message);

        // Check markov trigger
        timeSinceLast++;
        var chance = randomInt.Get(1, timeSinceLast);
        if (chance > config.chance){
            send_markov(channelID);
            timeSinceLast = 1;
        }

        // Update markov object
        if (messageCount > 100){
            messageCount = 0;
            quotes = new MarkovChain(history);
        }
        else{
            messageCount++;
        }
    }
}

exports.Chance = chance_message;
exports.Send = send_markov;
exports.Update = entry;
