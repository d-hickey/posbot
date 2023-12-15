const fs = require("fs");
const util = require("util");
const logger = require("winston");

// Discord client
let bot;

//Channel History
// filepaths
const COUNT_PATH = "./message_history/count.json";

let CountDict;

// File read/write
function GetCountDictionary(){
    if (CountDict){
        return CountDict;
    }
    if (!fs.existsSync(COUNT_PATH)){
        fs.writeFileSync(COUNT_PATH, "{}");
        CountDict = {};
        return CountDict;
    }
    CountDict = JSON.parse(fs.readFileSync(COUNT_PATH, "utf8"));
    return CountDict;
}

function WriteCountDictionary(){
    let dict = GetCountDictionary();
    let json = JSON.stringify(dict, null, 4);
    fs.writeFileSync(COUNT_PATH, json);
}

function ClearChannel(channelID) {
    GetCountDictionary();
    CountDict[channelID] = {};
}

function QueryChannelHistory(channelID, before) {
    logger.info("getting message history for channel: " + channelID);

    let nextBefore = before;

    bot.getMessages(
        channelID,
        {
            limit: 1000,
            before: before
        }
    ).then(messages => {
        const count = messages.length;
        for (let message of messages) {
            if (message.content == null) { continue; }
            nextBefore = message.id;
            const user = message.author;
            const userID = user.id;
            UpdateUserMessageCount(channelID, userID);
        }
        if (count < 1000){
            WriteCountDictionary();
            bot.createMessage(
                channelID,
                "Done... The messages have been counted."
            );
        }
        else{
            QueryChannelHistory(channelID, nextBefore);
        }
    }).catch(err => {
        logger.error("got error, waiting for 10 seconds\n " + err);
        setTimeout(QueryChannelHistory, 10000, channelID, before);
    });
}

function getChannelTotal(channelID) {
    const count = GetCountDictionary();
    let total = 0;
    for (let user in count[channelID]) {
        total = total + count[channelID][user];
    }
    return total;
}

function getMessageStats(channelID, userID) {
    GetCountDictionary();
    if (channelID in CountDict) {
        if (userID in CountDict[channelID]) {
            let count = CountDict[channelID][userID];
            let total = getChannelTotal(channelID);
            let percent = ((count / total) * 100).toFixed(2);

            let respMsg = util.format("Wow <@%s>! You've posted %d messages in this channel. Out of a total of %d, that's about %s percent.", userID, count, total, percent);
            return respMsg;
        }
        return "You've never posted here? Weird";
    }
    return "Channel hasn't been counted.";
}


function Commands(client, userID, channelID, cmd){
    bot = client;

    switch(cmd){
    case "countmessages":
        bot.createMessage(
            channelID,
            "Uh, ok, give me a couple mins, I'll try."
        );
        ClearChannel(channelID);
        QueryChannelHistory(channelID);
        break;
    case "stats":
        bot.createMessage(
            channelID,
            getMessageStats(channelID, userID)
        );
        break;
    }
}

function UpdateUserMessageCount(channel, user, createNewChan = true, updateFile = false) {
    const count = GetCountDictionary();
    if (channel in count) {
        if (user in count[channel]) {
            count[channel][user]++;
        } else {
            count[channel][user] = 1;
        }
    } else if (createNewChan) {
        count[channel] = {};
        count[channel][user] = 1;
    }

    if (updateFile) {
        WriteCountDictionary();
    }
}

exports.Commands = Commands;
exports.Update = UpdateUserMessageCount;