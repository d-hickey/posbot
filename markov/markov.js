// Standard
const fs = require("fs");
const util = require("util");

// Third Party
const MarkovChain = require("markovchain");

// Local
const randomInt = require("../randomint");

// Discord client
let bot;

const config = JSON.parse(fs.readFileSync("./markov/config.json", "utf8"));

//Emma's Markov
const bot_at = config.bot;
const bot_role = config.role;
let history = read_history();
let quotes = new MarkovChain(history);
let messageCount = 0;
let timeSinceLast = 0;

function read_history(){
    if (!fs.existsSync("chat.log")){
        fs.writeFileSync("chat.log", "");
        return "";
    }
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
    let limit = randomInt.Get(1, 25);
    let markov = quotes.start(
        function(wordList) {
            let tmpList = Object.keys(wordList);
            return tmpList[~~(Math.random()*tmpList.length)];
        }
    ).end(limit).process();

    if (markov) {
        markov = markov.replace(/(com\/.*?\/status\/)/gi, "https://twitter.$1");
        markov = markov.replace(/com\/r\//gi, "https://reddit.com/r/");
    }

    bot.createMessage(channelID, markov);
}

function specific_markov(userID, channelID, messageID, word) {
    let limit = randomInt.Get(2, 20);
    bot.createMessage(
        channelID,
        {
            content: util.format("%s", quotes.start(word).end(limit).process()),
            messageReference: {
                channelID: channelID,
                messageID: messageID
            }
        }
    );
}

// Advice
function asking_for_advice(message){
    let lower = message.toLowerCase();

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
    let potential = 0;
    let target = config.chance;
    if (timeSinceLast > target){
        potential = timeSinceLast - target;
    }

    let probability = (potential / timeSinceLast) * 100;

    return util.format("There has been %d messages since last pos markov. The current target is %d. This gives a markov probability of %d / %d which is %d%",
        timeSinceLast, target, potential, timeSinceLast, probability);
}

function entry(client, userID, channelID, message, messageID){
    bot = client;

    if (message.indexOf(bot_at) > -1 || message.indexOf(bot_role) > -1){
        let messageContents = message.replace(bot_at, "");
        messageContents = messageContents.replace(bot_role, "");

        // Discord currently has two formats for @s
        // Remove the formatting for both
        messageContents = messageContents.replace("<@>", "");
        messageContents = messageContents.replace("<@!>", "");
        messageContents = messageContents.replace(/^\s+/, "");
        messageContents = messageContents.replace(/\s+$/, "");

        if (asking_for_advice(messageContents)){
            bot.createMessage(
                channelID, 
                util.format("<@%s> That's a great question. I get asked about this topic a lot and it reminds me of a quote:\n\"BITCH, DON'T\"\n-me", userID)
            );
        }
        else{
            let messageParts = messageContents.split(/\s+/);
            let index = randomInt.Get(0, messageParts.length - 1);
            let word = messageParts[index];
            if (!word.trim()){
                send_markov(channelID);
            }
            else{
                specific_markov(userID, channelID, messageID, word);
            }
        }
    }
    else{
        // Update chat log
        update_chat_log(message);

        // Check markov trigger
        timeSinceLast++;
        let chance = randomInt.Get(1, timeSinceLast);
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
