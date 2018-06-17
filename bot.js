var Discord = require("discord.io");
var logger = require("winston");
var auth = require("./auth.json");
var util = require("util");
var request = require("request");
var MarkovChain = require("markovchain");
var fs = require("fs");

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = "debug";

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

function cardinalToOrdinal(num){
    switch (num){
        case 1:
            return "1st";
            break;
        case 2:
            return "2nd";
            break;
        case 3:
            return "3rd";
            break;
        case 4:
            return "4th";
            break;
        default:
            return "";
            break;
    }
}

// Reddit Functions
var subs = ["LadyBoners", "happy", "aww", "RoastMe", "relationships", "meirl", "me_irl", "gonewild", "Tinder"];

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

//Emma's Markov
var bot_at = "<@348179384580177922>";
var current_message = 0;
var interval = 20;
var update = "";
var history = "";
var quotes = new MarkovChain(fs.readFileSync("chat.log", "utf8"));
var endcheck = "";

var rubyPatience = 0;
var soccerLoaded = 0;
var groupsLoaded = 0;
var killianAccepted = 0;
var killianPayment = "";
var soccerEntries = {};
var teamPool = [];
var teamOwners = {};
var memePool = [];

var groups = {};

function load_history (file) {
    var lineReader = require("readline").createInterface({
        input: require("fs").createReadStream(file)
    });

    lineReader.on("line", function (line) {
        history = history.concat(line, "\n");
    });
    quotes = new MarkovChain(history);
}

function send_markov (user, userID, channelID, message, evt) {
    logger.info("attempting markov chain");
    bot.sendMessage({
        to: channelID,
        message: quotes.start( function(wordList) {
            var tmpList = Object.keys(wordList);
            return tmpList[~~(Math.random()*tmpList.length)];
        }).end().process()
    });
}

function get_previous_messages (bot, channelID, last_message_ID) {
    bot.getMessages(
        {channelID: channelID, limit: 100, before: last_id},
        function(err, messageArray) {
            returned_messages = messageArray.length;
            messageArray.forEach(
                function(message) {
                    //logger.info(message.content);
                    last_id = message.id;
                    if ((message.content.substring(0, bot_at.length) != bot_at) && (message.content.substring(0, 1) != "!") && (message.author.id != bot.id)){
                        history = history.concat(message.content, "\n");
                    }
             });
        if (returned_messages == 100){
            get_previous_messages(bot, channelID, last_id);
        }
        else {
            logger.info("HMMMMMMMMMMM?!");
            console.log(returned_messages);
            logger.info(err);
            logger.info("endcheck is " + endcheck + " and last_id is " + last_id);
            if (last_id != endcheck){
                endcheck = last_id;
                logger.info("Sleeping for 20 seconds");
                setTimeout(get_previous_messages(bot, channelID, last_id), 20000);
            }
            else{
                logger.info("finished, actually done or was 20 second sleep not enough? who knows");
            }
        }
    });
}

function get_channel_history (bot, channelID) {
    bot.getMessages(
        {channelID: channelID, limit: 100},
        function(err, messageArray) {
            returned_messages = messageArray.length;
            messageArray.forEach(
                function(message) {
                    //logger.info(message.content);
                    last_id = message.id;
                    if ((message.content.substring(0, bot_at.length) != bot_at) && (message.content.substring(0, 1) != "!") && (message.author.id != bot.id)){
                        history = history.concat(message.content, "\n");
                    }
            });
        if (returned_messages == 100){
            get_previous_messages(bot, channelID, last_id);
        }
    });
}

function test_hist (bot, channelID) {
    var url = "http://discordapp.com/channels/88601349020725248/messages";
    logger.info(url);

    request(url, function(error, response, body){
        console.log("error:", error); // Print the error if one occurred
        console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
        console.log("body:", body); // Print the HTML for the Google homepage.
    });
}

function loadSoccer () {
    soccerEntries = JSON.parse(fs.readFileSync('entries.json', 'utf8'));
    memePool = JSON.parse(fs.readFileSync('memes.json', 'utf8'));
    teamPool= JSON.parse(fs.readFileSync('teams.json', 'utf8'));
    teamOwners = JSON.parse(fs.readFileSync('teamowners.json', 'utf8'));

    var url = "https://raw.githubusercontent.com/openfootball/world-cup.json/master/2018/worldcup.standings.json";
    logger.info(url);

    request(url, function(error, response, body){
        groups = JSON.parse(body);
        groupsLoaded = 1;
    });

    soccerLoaded = 1;
}

function bad_input () {
    var choice = getRandomInt(1, 3);
    if (choice === 1){
        return "Maybe you should try \"!soccer help\"";
    }
    if (choice === 2){
        return "Okay, but like what action? I'm not a mind reader you know!";
    }
    if (choice === 3){
        return "Listen here m80, I'm not here to play games. This is serious business! Tell me what you want to do or I'll assign Italy as one of your teams."
    }
}

function badPayment(user){
    var choice = getRandomInt(1, 3);
    if (choice === 1){
        return util.format("Trying to pull wool over the eyes of ol' posbot eh, %s? Keep it up and we'll see what happens.", user);
    }
    if (choice === 2){
        return "Do you even know what a meme is?";
    }
    if (choice === 3){
        return util.format("I need links, %s, I'm trying to run a business here and you come to me with this shit. Get outta here!", user);
    }
}

function pullout(user){
    var choice = getRandomInt(1, 3);
    if (choice === 1){
        return util.format("We're sorry, %s, but due to technical difficulties we were unable to withdraw your entries. Please wait 6 to 8 weeks and try again.", user);
    }
    if (choice === 2){
        return util.format("Don't pull out, %s senpai! 🤤", user);
    }
    if (choice === 3){
        return util.format("Unfortunately, %s, we cannot seem to find you in our system. Are you sure you have entries with PosBot Inc?", user);
    }
}

function drawUpdate(){
    var data = JSON.stringify(soccerEntries);  
    fs.writeFileSync('entries.json', data);

    var teamJson = JSON.stringify(teamPool);  
    fs.writeFileSync('teams.json', teamJson);

    var ownersJson = JSON.stringify(teamOwners);  
    fs.writeFileSync('teamowners.json', ownersJson);
}

function paymentUpdate(){
    var data = JSON.stringify(soccerEntries);  
    fs.writeFileSync('entries.json', data);

    var memeJson = JSON.stringify(memePool);  
    fs.writeFileSync('memes.json', memeJson);
}

function drawTeam(user){
    var max = teamPool.length;
    var index = getRandomInt(1, max);
    var team = teamPool[index-1];

    teamPool.splice(index-1, 1);
    soccerEntries[user]["teams"].push(team);
    teamOwners[team] = user;

    drawUpdate();
    return team;
}

function acceptPayment(user, meme){
    if (teamPool.length === 0){
        memePool.push(meme);
        paymentUpdate();
        return "We are all out of teams, unfortunately, but we thank you for this generous donation";
    }
    if (user in soccerEntries){
        if (soccerEntries[user]["payments"].length === 4){
            memePool.push(meme);
            paymentUpdate();
            return util.format("It appears you have hit your entry limit, %s, but we thank you for this generous donation", user);
        }
        soccerEntries[user]["payments"].push(meme);
        memePool.push(meme);
        paymentUpdate();
        return util.format("%s: Your payment has been successfully processed, you may now draw another team.", user);
    }
    else{
        soccerEntries[user] = {};
        soccerEntries[user]["payments"] = [];
        soccerEntries[user]["payments"].push(meme);
        memePool.push(meme);
        paymentUpdate();
        return util.format("%s: Thank you for choosing posbot, your payment has been accepted and you can draw your first team.", user);
    }
}

function soccer (args, user) {
    if (args.length === 0){
        return bad_input();
    }
    if (args.length === 1){
        if (args[0] === "help"){
            return util.format("Alright listen up %s, because I'm only going to say this once (unless you use this command again). This is posbot's fantastic fantasy football world cup sweepstakes." +
                "You stake your bet by using \"!soccer pay <meme_link>\", then you can pull a team using \"!soccer draw\". Entries are limited to 4 per person." +
                "If you want to withdraw your bet, you can use \"!soccer pullout\". If you want to check your teams, you can use \"!soccer check\"." +
                "Other commands available: \"!soccer group <group_letter>\", \"!soccer team <team_name>\", \"!soccer amiwinning\", \"!soccer amilosing\", \"!soccer prizes\"", user)
        }
        if (args[0] === "pay"){
            return "Please provide payment using \"!soccer pay <meme_link>\"";
        }
        if (args[0] === "draw"){
            if (user in soccerEntries){
                if ("teams" in soccerEntries[user]){
                    if (soccerEntries[user]["teams"].length < soccerEntries[user]["payments"].length){
                        var picked = drawTeam(user);
                        return util.format("Congratulations %s, you have drawn %s. Good luck!", user, picked);
                    }
                    else{
                        return util.format("%s: You do not have any draws to make", user);
                    }
                }
                else{
                    soccerEntries[user]["teams"] = [];
                    var picked = drawTeam(user);
                    return util.format("Congratulations %s, you have drawn %s. Good luck!", user, picked);
                }
            }
            else{
                return util.format("You don't get to draw a team until you pay, %s", user);
            }
        }
        if (args[0] === "pullout"){
            return pullout(user);
        }
        if (args[0] === "check"){
            if (user in soccerEntries){
                if ("teams" in soccerEntries[user]){
                    return util.format("%s: You have made %s payment(s) and drawn %s teams: %s.", user, soccerEntries[user]["payments"].length, soccerEntries[user]["teams"].length, soccerEntries[user]["teams"]);
                }
                else{
                    return util.format("%s: You have made %s payment(s), but have drawn no teams. Use \"!soccer draw\"", user, soccerEntries[user]["payments"].length);
                }
            }
            else{
                return util.format("You have not yet drawn a team, %s, what are you waiting for?", user);
            }
        }
        if (args[0] === "group"){
            return "Please specify a group letter";
        }
        if (args[0] === "amiwinning"){
            if (groupsLoaded === 0){
                return "Loading Fixtures, please wait a few moments and try again";
            }
            var teamName = "";
            var won =  0;
            var gd = 0;

            for (var i = groups["groups"].length - 1; i >= 0; i--) {
                var grp = groups["groups"][i];
                for (var j = 0; j < grp["standings"].length; j++) {
                    if (grp["standings"][j]["pos"] === 1 && grp["standings"][j]["won"] >= won && (grp["standings"][j]["goals_for"] - grp["standings"][j]["goals_against"]) > gd){
                        teamName = grp["standings"][j]["team"]["name"];
                        won = grp["standings"][j]["won"];
                        gd = (grp["standings"][j]["goals_for"] - grp["standings"][j]["goals_against"]);
                    }             
                }
            }
            if (teamOwners[teamName] === user){
                return util.format("Yes, good job %s, your team, %s, is winning with %d win(s) and a goal difference of %d", user, teamName, won, gd);
            }
            else{
                return util.format("No, %s, none of your teams are winning. %s is currently ahead with %d win(s) and a goal difference of %d. I'm sure this is your fault somehow.", user, teamName, won, gd);
            }
        }
        if (args[0] === "amilosing"){
            if (groupsLoaded === 0){
                return "Loading Fixtures, please wait a few moments and try again";
            }
            var teamName = "";
            var lost =  0;
            var gd = 100;

            for (var i = groups["groups"].length - 1; i >= 0; i--) {
                var grp = groups["groups"][i];
                for (var j = 0; j < grp["standings"].length; j++) {
                    if (grp["standings"][j]["pos"] === 4 && grp["standings"][j]["lost"] >= lost && (grp["standings"][j]["goals_for"] - grp["standings"][j]["goals_against"]) < gd){
                        teamName = grp["standings"][j]["team"]["name"];
                        lost = grp["standings"][j]["lost"];
                        gd = (grp["standings"][j]["goals_for"] - grp["standings"][j]["goals_against"]);
                    }             
                }
            }
            if (teamOwners[teamName] === user){
                return util.format("Congratulations, %s, %s are dead last with %d lost game(s) and a goal difference of %d. I bet you can smell those consolation memes already.", user, teamName, lost, gd);
            }
            else{
                return util.format("Not one of your teams are in last place, %s. Considering there's a prize for last, this might actually be bad news. %s is currently the worst team in the tournament.", user, teamName);
            }
        }
        if (args[0] === "prizes"){
            return "The meme pool will be split up amongst the owners of the teams who place 1st through 4th, there will also be a consolation prize for the team who comes last.\n"+
                    "Remember you can always donate more memes to the prize pool with \"!soccer pay <meme_link>\".";
        } 
    }
    if (args.length === 2){
        if (args[0] === "pay"){
            if (args[1].indexOf("http://") > -1 || args[1].indexOf("https://") > -1){
                if (memePool.indexOf(args[1]) > -1){
                    return util.format("Sorry, %s, but I've already seen that meme, therefore it's now worthless to me. Please come back with something fresh", user);
                }

                if (user === "Mister Killijam"){
                    killianPayment = args[1];
                    return "Killian detected. Manual user verification required. Could someone use \"!soccer killian yes\" to accept the meme or \"!soccer killian no\" to reject the payment";
                }

                return acceptPayment(user, args[1]);
            }
            else {
                return badPayment(user);
            }
        }
        if (args[0] === "killian"){
            if (user === "Mister Killijam"){
                return "Killian, you can't accept your own memes, baka!";
            }
            if (killianPayment === ""){
                return util.format("I appreciate your helpfulness, %s, but their are no Killian submissions in need of review.", user);
            }
            if (args[1] === "yes"){
                var payresponse = acceptPayment("Mister Killijam", killianPayment);
                killianPayment = "";
                killianAccepted = killianAccepted + 1;
                return payresponse;
            }
            if (args[1] === "no"){
                return util.format("Thank you, %s, for your surely unbiased rejection of Killian's submission", user);
            }
        }
        if (args[0] === "group"){
            if (groupsLoaded === 0){
                return "Loading Fixtures, please wait a few moments and try again";
            }

            var groupName = "Group " + args[1].toUpperCase();
            for (var i = groups["groups"].length - 1; i >= 0; i--) {
                var grp = groups["groups"][i];
                if (grp["name"] === groupName){
                    var groupString = groupName + ":\n"
                    for (var j = 0; j < grp["standings"].length; j++) {
                        var teamName = grp["standings"][j]["team"]["name"];
                        var position = grp["standings"][j]["pos"];
                        var played = grp["standings"][j]["played"];
                        var won = grp["standings"][j]["won"];
                        var draw = grp["standings"][j]["drawn"];
                        var lost = grp["standings"][j]["lost"];
                        var goals_for = grp["standings"][j]["goals_for"];
                        var goals_against = grp["standings"][j]["goals_against"];
                        var pts = grp["standings"][j]["pts"];
                        groupString = groupString + util.format("%s: %s (%s) MP:%d W:%d D:%d L:%d GF:%d GA:%d pts:%d\n", cardinalToOrdinal(position), teamName, teamOwners[teamName], played, won, draw, lost, goals_for, goals_against, pts);
                    }
                    return groupString;
                }
            }
            return "Could not find " + groupName;
        }
        if (args[0] === "team"){
            if (groupsLoaded === 0){
                return "Loading Fixtures, please wait a few moments and try again";
            }

            var teamName = args[1].toLowerCase();
            for (var i = groups["groups"].length - 1; i >= 0; i--) {
                var grp = groups["groups"][i];
                for (var j = 0; j < grp["standings"].length; j++) {
                    if (grp["standings"][j]["team"]["name"].toLowerCase().replace(/ /g,'') === teamName){
                        teamName = grp["standings"][j]["team"]["name"];
                        var groupName = grp["name"];
                        var position = grp["standings"][j]["pos"];
                        var played = grp["standings"][j]["played"];
                        var won = grp["standings"][j]["won"];
                        var draw = grp["standings"][j]["drawn"];
                        var lost = grp["standings"][j]["lost"];
                        var goals_for = grp["standings"][j]["goals_for"];
                        var goals_against = grp["standings"][j]["goals_against"];
                        var pts = grp["standings"][j]["pts"];
                        return util.format("%s (%s): %s in %s - MP:%d W:%d D:%d L:%d GF:%d GA:%d pts:%d\n", teamName, teamOwners[teamName], cardinalToOrdinal(position), groupName, played, won, draw, lost, goals_for, goals_against, pts);
                    }             
                }
            }
            return "Could not find " + teamName;
        }
    }
    return "Could not process command";
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
bot.on("message", function (user, userID, channelID, message, evt) {
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
            case "gethistory":
                bot.getMessages({
                    channelID: channelID
                }, function(err, messagearray){
                    messagearray.forEach(function(value){
                        logger.info(value)
                    })
                });
                break;
            case "compliment":
                var subno = getRandomInt(0, 8);
                var sub = subs[subno];
                var rec = user
                if (args.length > 0){
                    rec = args[0];
                }
                getRedditComment(sub, function(comm){
                    bot.sendMessage({
                        to: channelID,
                        message: rec + ": " + comm
                    })
                });
                break;
            case "markov":
                send_markov(user, userID, channelID, message, evt);
                break;
            case "hist":
                if (user === "Darragh"){
                    logger.info("Darragh Confirmed")

                    history = "";
                    get_channel_history(bot, channelID);
                    logger.info("loaded history");
                }
                break;
            case "init":
                if (user === "Darragh"){
                    logger.info("Darragh Confirmed")

                    quotes = new MarkovChain(history);
                    logger.info("initialised markov bot");
                    fs.writeFile("chat.log", history, function (err) {
                        if (err) throw err;
                    });
                }
                break;
            case "test":
                test_hist(bot, channelID);
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
            case "soccer":
                if (soccerLoaded === 0){
                    loadSoccer();
                }
                bot.sendMessage({
                    to: channelID,
                    message: soccer(args, user)
                });
                break;

            // Just add any case commands if you want to..
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
});