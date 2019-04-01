// Standard
var fs = require("fs");
var util = require("util");

// Local
var user = require("../user");

// Discord client
var bot;

// Quote
function Quote(channelID, messageID, commandID, quoterID){
    for (var channelKey in bot.channels){
        FindQuote(channelID, messageID, commandID, quoterID, channelKey);
    }
}

function FindQuote(channelID, messageID, commandID, quoterID, channelKey){
    bot.getMessage({
        channelID : channelKey,
        messageID : messageID
    },
    function (err, message){
        if (!err){
            SendQuote(channelID, commandID, quoterID, message);
        }
    });
}

function SendQuote(channelID, commandID, quoterID, message){
    var quote = {color: 6826080};
    var member = user.GetMember(bot, message.author.id);
    var quoter = user.GetMember(bot, quoterID);
    quote.description = message.content;
    quote.author = {name: member.nick};
    quote.timestamp = message.timestamp;
    quote.footer = {text: util.format("Quoted by %s", quoter.nick)};

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

function Commands(client, userID, channelID, message, cmd, args){
    bot = client;

    switch(cmd){
        case "q": // Fallthrough
        case "quote":
            if (args[0]){
                GetMessageIDFromContent(channelID, message, function(id){
                    Quote(channelID, args[0], id, userID);
                });
            }
            break;
    }
}

exports.Commands = Commands;