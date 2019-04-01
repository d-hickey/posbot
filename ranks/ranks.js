// Standard
var fs = require("fs");
var util = require("util");

// Local
var randomInt = require("../randomint");

// Discord client
var bot;

// Rank vars and methods
var ranks = JSON.parse(fs.readFileSync('./ranks/ranks.json', 'utf8'));
var progress = JSON.parse(fs.readFileSync('./ranks/xp.json', 'utf8'));

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
    fs.writeFileSync('./ranks/ranks.json', rankJson);
}

function WriteXP(){
    var xpJson = JSON.stringify(progress);
    fs.writeFileSync('./ranks/xp.json', xpJson);
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
    var prog_earned = randomInt.Get(10, 100);

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

function Update(client, userID, channelID){
    bot = client;

    if (!stopRank){
        if (userID in progress){
            progress[userID]++;
        }
        else{
            progress[userID] = 1;
        }

        var rankChance = randomInt.Get(1, progress[userID]);
        var progressTarget = GetProgressTarget(userID);
        if (rankChance > progressTarget){
            var rankMessage = RankUp(userID);
            bot.sendMessage({
                to: channelID,
                message: rankMessage
            });
            WriteRanks();
        }
        WriteXP();
    }
}

function Commands(client, userID, channelID, cmd, args){
    bot = client;

    if (stopRank){
        return;
    }

    switch(cmd){
        case "rank":
            bot.sendMessage({
                to: channelID,
                message: GetRank(userID)
            });
            break;
        case "buy-microtransaction":
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
                    message: "Then we shall continue. Ad infinitum. On your head be it."
                });
            }
            break;
    }
}

exports.Stop = stopRank;
exports.Update = Update;
exports.Commands = Commands;