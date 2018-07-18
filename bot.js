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

//Emma's Markov
var bot_at = "<@348179384580177922>";
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

// Soccer vars
var soccerLoaded = 0;
var groupsLoaded = 0;
var killianAccepted = 0;
var killianPayment = "";
var soccerEntries = {};
var teamPool = [];
var teamOwners = {};
var memePool = [];
var soccerPlaces = {};

var groups = {};


function loadSoccer () {
    soccerEntries = JSON.parse(fs.readFileSync('entries.json', 'utf8'));
    memePool = JSON.parse(fs.readFileSync('memes.json', 'utf8'));
    teamPool= JSON.parse(fs.readFileSync('teams.json', 'utf8'));
    teamOwners = JSON.parse(fs.readFileSync('teamowners.json', 'utf8'));
    soccerPlaces = JSON.parse(fs.readFileSync('places.json', 'utf8'));

    var url = "https://raw.githubusercontent.com/openfootball/world-cup.json/master/2018/worldcup.standings.json";
    logger.info(url);

    request(url, function(error, response, body){
        groups = JSON.parse(body);
        groupsLoaded = 1;
    });

    soccerLoaded = 1;
}

function reloadSoccer () {
    groupsLoaded = 0;

    var url = "https://raw.githubusercontent.com/openfootball/world-cup.json/master/2018/worldcup.standings.json";

    request(url, function(error, response, body){
        groups = JSON.parse(body);
        groupsLoaded = 1;
    });
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
        return "Listen here m80, I'm not here to play games. This is serious business! Tell me what you want to do or I'll assign Italy as one of your teams.";
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
    soccerEntries[user].teams.push(team);
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
        if (soccerEntries[user].payments.length === 4){
            memePool.push(meme);
            paymentUpdate();
            return util.format("It appears you have hit your entry limit, %s, but we thank you for this generous donation", user);
        }
        soccerEntries[user].payments.push(meme);
        memePool.push(meme);
        paymentUpdate();
        return util.format("%s: Your payment has been successfully processed, you may now draw another team.", user);
    }
    else{
        soccerEntries[user] = {};
        soccerEntries[user].payments = [];
        soccerEntries[user].payments.push(meme);
        memePool.push(meme);
        paymentUpdate();
        return util.format("%s: Thank you for choosing posbot, your payment has been accepted and you can draw your first team.", user);
    }
}

function getMemes(amount){
    var count = amount;
    var memes = [];
    while (count > 0){
        var numMemes = memePool.length - 1;
        var index = getRandomInt(0, numMemes);

        var meme = memePool[index];
        memes.push(meme);
        memePool.splice(index, 1);
        count--;
    }
    return memes;
}

function soccerWinners(){
    var first = soccerPlaces.first;
    var firstOwner = teamOwners[first];
    var second = soccerPlaces.second;
    var secondOwner = teamOwners[second];
    var third = soccerPlaces.third;
    var thirdOwner = teamOwners[third];
    var fourth = soccerPlaces.fourth;
    var fourthOwner = teamOwners[fourth];
    var last = soccerPlaces.last;
    var lastOwner = teamOwners[last];

    return util.format("Winners:\nFirst: %s (%s)\nSecond: %s (%s)\nThird: %s (%s)\nFourth: %s (%s)\nLast: %s (%s)", first, firstOwner, second, secondOwner, third, thirdOwner, fourth, fourthOwner, last, lastOwner);
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
                "Other commands available: \"!soccer group <group_letter>\", \"!soccer team <team_name>\", \"!soccer amiwinning\", \"!soccer amilosing\", \"!soccer prizes\"", user);
        }
        if (args[0] === "pay"){
            return "Please provide payment using \"!soccer pay <meme_link>\"";
        }
        if (args[0] === "draw"){
            if (user in soccerEntries){
                if ("teams" in soccerEntries[user]){
                    if (soccerEntries[user].teams.length < soccerEntries[user].payments.length){
                        var picked = drawTeam(user);
                        return util.format("Congratulations %s, you have drawn %s. Good luck!", user, picked);
                    }
                    else{
                        return util.format("%s: You do not have any draws to make", user);
                    }
                }
                else{
                    soccerEntries[user].teams = [];
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
                    return util.format("%s: You have made %s payment(s) and drawn %s teams: %s.", user, soccerEntries[user].payments.length, soccerEntries[user].teams.length, soccerEntries[user].teams);
                }
                else{
                    return util.format("%s: You have made %s payment(s), but have drawn no teams. Use \"!soccer draw\"", user, soccerEntries[user].payments.length);
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
            var keys = Object.keys(soccerPlaces);

            for (var place of keys){
                if (place !== "last" && place !== "remaining"){
                    var teamName = soccerPlaces[place];
                    if (teamOwners[teamName] === user){
                        return "Yeah";
                    }
                }
            }
            var rem = soccerPlaces.remaining;
            for (var remTeam of rem){
                if (teamOwners[remTeam] === user){
                    return "Totes";
                }
            }
            return "Nah, you lose.";
        }
        if (args[0] === "amilosing"){
            var teamName = soccerPlaces.last;

            if (teamOwners[teamName] === user){
                return util.format("Yeah, %s lost hard.", teamName);
            }
            else{
                return util.format("No, %s lost the most, you didn't lose quite as good.", teamName);
            }
        }
        if (args[0] === "payout"){
            if (soccerPlaces.paid === false && soccerPlaces.remaining.length === 0){
                var payout = {};

                var first = teamOwners[soccerPlaces.first];
                payout[first] = [];
                var second = teamOwners[soccerPlaces.second];
                payout[second] = [];
                var third = teamOwners[soccerPlaces.third];
                payout[third] = [];
                var fourth = teamOwners[soccerPlaces.fourth];
                payout[fourth] = [];
                var last = teamOwners[soccerPlaces.last];
                payout[last] = [];

                var memeTotal = memePool.length;
                var lastPrize = Math.floor(memeTotal * 0.08);
                var fourthPrize = Math.floor(memeTotal * 0.12);
                var thirdPrize = Math.floor(memeTotal * 0.15);
                var secondPrize = Math.floor(memeTotal * 0.25);
                var firstPrize = memeTotal - (secondPrize + thirdPrize + fourthPrize + lastPrize);

                payout[first] = payout[first].concat(getMemes(firstPrize));
                payout[second] = payout[second].concat(getMemes(secondPrize));
                payout[third] = payout[third].concat(getMemes(thirdPrize));
                payout[fourth] = payout[fourth].concat(getMemes(fourthPrize));
                payout[last] = payout[last].concat(getMemes(lastPrize));

                var winners = soccerWinners();

                var keys = Object.keys(payout);

                var payees = "";
                for (var winner of keys){
                    var memePayout = payout[winner].toString().replace(/,/g, ' ');
                    payees = util.format("%s%s: %s\n\n", payees, winner, memePayout);
                }
                soccerPlaces.paid = true;

                return util.format("%s\n\nPayout:\n%s", winners, payees);
            }
        }
        if (args[0] === "prizes"){
            var memeTotal = memePool.length;
            var lastPrize = Math.floor(memeTotal * 0.08);
            var fourthPrize = Math.floor(memeTotal * 0.12);
            var thirdPrize = Math.floor(memeTotal * 0.15);
            var secondPrize = Math.floor(memeTotal * 0.25);
            var firstPrize = memeTotal - (secondPrize + thirdPrize + fourthPrize + lastPrize);
            return "The meme pool will be split up amongst the owners of the teams who place 1st through 4th, there will also be a consolation prize for the team who comes last.\n"+
                    "Remember you can always donate more memes to the prize pool with \"!soccer pay <meme_link>\".\n"+
                    "Meme pool total: " + memeTotal + "\n"+
                    "First place prize: " + firstPrize + " memes\n"+
                    "Second place prize: " + secondPrize + " memes\n"+
                    "Third place prize: " + thirdPrize + " memes\n"+
                    "Fourth place prize: " + fourthPrize + " memes\n"+
                    "Last place consolation prize: " + lastPrize + " memes\n";
        }
        if (args[0] === "reload"){
            reloadSoccer();
            return "Reloading fixtures";
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
            for (var i = groups.groups.length - 1; i >= 0; i--) {
                var grp = groups.groups[i];
                if (grp.name === groupName){
                    var groupString = groupName + ":\n";
                    for (var j = 0; j < grp.standings.length; j++) {
                        var teamName = grp.standings[j].team.name;
                        var position = grp.standings[j].pos;
                        var played = grp.standings[j].played;
                        var won = grp.standings[j].won;
                        var draw = grp.standings[j].drawn;
                        var lost = grp.standings[j].lost;
                        var goals_for = grp.standings[j].goals_for;
                        var goals_against = grp.standings[j].goals_against;
                        var pts = grp.standings[j].pts;
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
            for (var i = groups.groups.length - 1; i >= 0; i--) {
                var grp = groups.groups[i];
                for (var j = 0; j < grp.standings.length; j++) {
                    if (grp.standings[j].team.name.toLowerCase().replace(/ /g,'') === teamName){
                        teamName = grp.standings[j].team.name;
                        var groupName = grp.name;
                        var position = grp.standings[j].pos;
                        var played = grp.standings[j].played;
                        var won = grp.standings[j].won;
                        var draw = grp.standings[j].drawn;
                        var lost = grp.standings[j].lost;
                        var goals_for = grp.standings[j].goals_for;
                        var goals_against = grp.standings[j].goals_against;
                        var pts = grp.standings[j].pts;
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

// werewolf vars
var dayMessages = JSON.parse(fs.readFileSync('.json', 'utf8'));

var game = 0;
var start = 0;
var night = 0;
var playerNames = [];
var players = {};
var roles = [];
var wolfChannel = "";
var killVotes = {};
var savedPlayers = [];
var loverPlayers = [];

var roles1 = ["woof"];
var roles2 = ["villager", "woof"];
var roles3 = ["villager", "villager", "woof"];
var roles4 = ["seer", "villager", "villager", "woof"];
var roles5 = ["seer", "doctor", "villager", "villager", "woof"];
var roles6 = ["seer", "doctor", "cupid", "villager", "woof", "woof"];
var roles7 = ["seer", "doctor", "cupid", "villager", "villager", "woof", "woof"];
var roles8 = ["seer", "doctor", "cupid", "villager", "villager", "villager", "woof", "woof"];

var rolesSet = [roles1, roles2, roles3, roles4, roles5, roles6, roles7, roles8];

function resetWolves(){
    game = 0;
    start = 0;
    night = 0;
    playerNames = [];
    players = {};
    roles = [];
    wolfChannel = "";
    killVotes = {};
    savedPlayers = [];
    loverPlayers = [];
    logger.info("Werewolf game reset");
}

function resetVotes(){
    killVotes = {};
    savedPlayers = [];
    var keys = Object.keys(players);

    for (var player of keys){
        players[player].voted = false;
    }
}

function getWolves(){
    var wolves = [];
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].role === "woof"){
            wolves.push(players[player].dname);
        }
    }
    return wolves;
}

function assignRoles(){
    var keys = Object.keys(players);
    roles = rolesSet[keys.length-1].slice(0);

    for (var player of keys){
        var index = getRandomInt(0, roles.length-1);
        var role = roles[index];
        roles.splice(index, 1);
        players[player].role = role;
    }
    for (var player of keys){
        var role = players[player].role;
        var roleMsg = util.format("########### NEW GAME ###########\nYou have been assigned the role: %s", role);
        if (role === "woof"){
            var wolves = getWolves();
            roleMsg = roleMsg + util.format("\nYou cannot kill on the first night, but perhaps you can consort with your wuffle buddies? Use \"!ready\" to progress.\nThe wolves are: %s", wolves);
        }
        if (role === "seer"){
            roleMsg = roleMsg + "\nYou have the gift and can sense one's true nature. Gather your crystal balls and incense and use \"!see <name>\" to determine the targets role in all this";
        }
        if (role === "doctor"){
            roleMsg = roleMsg + "\nYears in education and training mean you can now cheat death itself. Use\"!save <name>\" to prevent any harm coming to somebody, or yourself.";
        }
        if (role === "cupid"){
            roleMsg = roleMsg + "use \"!matchmake <name> <name>\" to select to select two players to be the secret lovers." +
                    "\n Players: " + playerNames.toString();
        }
        else{
            roleMsg = roleMsg + " use \"!ready\" to sleep peacefully through the night.";
        }
        bot.sendMessage({
            to: player,
            message: roleMsg
        });
    }
}

function sendDayMessage(){
    var keys = Object.keys(players);

    var ats = "";
    for (var player of keys){
        if (players[player].alive === true){
            ats = ats + util.format("<@%s> ", player);
        }
    }

    bot.sendMessage({
        to: wolfChannel,
        message: ats
    });
}

function sendNightMessages(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].alive === true){
            var role = players[player].role;
            var roleMsg = "It's night time, so I need you to ";
            if (role === "woof"){
                roleMsg = roleMsg + "use \"!kill <name>\" to select a player to kill. You could also just use \"!ready\" to not kill at all." +
                        "\n Players: " + playerNames.toString();
            }
            if (role === "seer"){
                roleMsg = roleMsg + "use \"!see <name>\" to select a player to spy on. You could also just use \"!ready\" to not view anyone." +
                        "\n Players: " + playerNames.toString();
            }
            if (role === "doctor"){
                roleMsg = roleMsg + "use \"!save <name>\" to select a player to heal, should any harm come to them. You could also just use \"!ready\" to abandon your duties." +
                        "\n Players: " + playerNames.toString();
            }
            else {
                roleMsg = roleMsg + " use \"!ready\" to sleep peacefully through the night.";
            }
            bot.sendMessage({
                to: player,
                message: roleMsg
            });
        }
        
    }
}

function switchToDay(){
    night = 0;
    resetVotes();

    var index = getRandomInt(0, dayMessages.length-1);
    var message = dayMessages[index];
    bot.sendMessage({
        to: wolfChannel,
        message: message
    });
    sendDayMessage();
}

function killPlayer(){
    var keys = Object.keys(killVotes);
    var deathMsg = "";

    if (keys.length > 0){
        var victim = keys[0];

        for (var potential of keys){
            if (killVotes[potential].length > killVotes[victim].length){
                victim = potential;
            }
            else if (killVotes[potential].length === killVotes[victim].length){
                // random, replace with tiebreaker
                var rand = getRandomInt(0, 1);
                if (rand === 1){
                    victim = potential;
                }
            }
        }
        if (savedPlayers.indexOf(victim) > -1){
            deathMsg = util.format("Everyone receives a message from %s. It contains a picture of them in a hospital bed and the tagline \"I lived bitch\".", players[victim].dname);
        }
        else{
            players[victim].alive = false;
            var index = playerNames.indexOf(players[victim].dname);
            if (index !== -1){
                playerNames.splice(index, 1);
            }  
            killVotes = {};

            deathMsg = util.format("%s is dead and they were a %s", players[victim].dname, players[victim].role);

            // Handle surviving lover
            if (loverPlayers.indexOf(victim) > -1){
                var widow = loverPlayers[0];
                if (widow === victim){
                    widow = loverPlayers[1];
                }

                players[widow].alive = false;
                index = playerNames.indexOf(players[widow].dname);
                if (index !== -1){
                    playerNames.splice(index, 1);
                }

                deathMsg = deathMsg + util.format("\nTheir lover, %s, dies of a broken heart. How romantic and sad. They were a %s.", players[widow].dname, players[widow].role);
            }
        }
    }
    else{
        deathMsg = "Nobody is dead. Strange, I'm fairly sure somebody should be dead. Anyway... ";
    }

    var dayChangeMsg = util.format("It's lynching time, everyone use \"!vote <name>\" to cast your vote.\nThe player list is: %s", playerNames);
    if (night === 0){
        dayChangeMsg = util.format("It's sleepy time, wolves use \"!kill <name>\" to pick dinner.\nThe player list is: %s", playerNames);
    }

    if (allWolvesDead()){       
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s\nCongrats Villagers, all the wolves are dead\nGAME OVER", deathMsg)
        });
        resetWolves();
    }
    else if (allVillagersDead()){       
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s\nCongrats Wuffles, you've eaten them all\nGAME OVER", deathMsg)
        });
        resetWolves();
    }
    else if (playerNames.length === 2 && players[loverPlayers[0]].alive && players[loverPlayers[1]].alive){
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s\nAll is quiet in the empty town except for the faint sound of Lady Gaga's _Bad Romance_ playing on the radio in one of the abandoned houses. " +
                "The lovers %s (a %s) and %s (a %s) find themselves alone in the town. Nobody left to judge their digusting romance.\nGAME OVER", deathMsg,
                players[loverPlayers[0]].dname, players[loverPlayers[0]].role, players[loverPlayers[1]].dname, players[loverPlayers[1]].role)
        });
        resetWolves();
    }
    else{
        resetVotes();
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s\n%s", deathMsg, dayChangeMsg)
        });
        if (night === 0){
            night = 1;
            sendNightMessages();
        }
        else{
            night = 0;
            sendDayMessage();
        }
    }
}

function victimVote(wolf, target, channel){
    if (night === 0 && channel !== wolfChannel){
        bot.sendMessage({
            to: wolf,
            message: "You can't hide your vote. You must \"!vote\" in public"
        });
        return;
    }
    var keys = Object.keys(players);
    var found = false;

    for (var player of keys){
        if (game === 0){
            break;
        }
        var displayName = players[player].dname;
        var name = displayName.toLowerCase();
        var victim = target.toLowerCase();
        if ((name === victim || name.indexOf(victim) > -1) && players[player].alive === true){
            found = true;
            if (player in killVotes){
                killVotes[player].push(wolf);
            }
            else{
                killVotes[player] = [wolf];
            }
            players[wolf].voted = true;
            if (night === 1){
                bot.sendMessage({
                    to: wolf,
                    message: util.format("You have voted to kill %s", displayName)
                });
            }
            else{
                bot.sendMessage({
                    to: wolfChannel,
                    message: util.format("Accept vote for %s", displayName)
                });
            }
            
            if (night === 1 && nightVotesDone()){
                killPlayer();
            }
            else if(night === 0 && dayVotesDone()){
                killPlayer();
            }
            break;
        }
    }
    if (found === false){
        bot.sendMessage({
            to: wolf,
            message: util.format("Cannot find player %s", target)
        });
    }
}

function seeRole(seer, subject){
    var keys = Object.keys(players);
    var found = false;

    for (var player of keys){
        var displayName = players[player].dname;
        var name = displayName.toLowerCase();
        var victim = subject.toLowerCase();
        if ((name === victim || name.indexOf(victim) > -1) && players[player].alive === true){
            found = true;
            players[seer].voted = true;
            
            bot.sendMessage({
                to: seer,
                message: util.format("Where there once was doubt, there is now certainty. %s is a %s", displayName, players[player].role)
            });
            
            if (night === 1 && nightVotesDone()){
                killPlayer();
            }
            else if(night === 2 && nightVotesDone()){
                switchToDay();
            }
            break;
        }
    }
    if (found === false){
        bot.sendMessage({
            to: seer,
            message: util.format("Cannot find player %s", subject)
        });
    }
}

function savePlayer(doctor, patient){
    var keys = Object.keys(players);
    var found = false;

    for (var player of keys){
        var displayName = players[player].dname;
        var name = displayName.toLowerCase();
        var victim = patient.toLowerCase();
        if ((name === victim || name.indexOf(victim) > -1) && players[player].alive === true){
            found = true;
            players[doctor].voted = true;
            savedPlayers.push(player);

            if (doctor == player){
                bot.sendMessage({
                    to: doctor,
                    message: "You have chosen to save yourself. How deliciously selfish."
                });
            }
            else{
                bot.sendMessage({
                    to: doctor,
                    message: util.format("You will check up on %s tonight, make sure they aren't bleeding to death. Maybe you'll even get paid, does this town have socialised healthcare?", displayName)
                });
            }
            
            
            if (night === 1 && nightVotesDone()){
                killPlayer();
            }
            else if(night === 2 && nightVotesDone()){
                //switch to day
                switchToDay();
            }
            break;
        }
    }
    if (found === false){
        bot.sendMessage({
            to: doctor,
            message: util.format("Cannot find player %s", subject)
        });
    }
}

function matchmake(cupid, loverOne, loverTwo){
    var lovers = [];
    lovers.push(loverOne);
    lovers.push(loverTwo);

    var loverNames = Object.keys(lovers);
    var success = true;
    for (var loverName of loverNames){
        var keys = Object.keys(players);
        var found = false;

        for (var player of keys){
            var displayName = players[player].dname;
            var name = displayName.toLowerCase();
            var lover = loverName.toLowerCase();
            if ((name === lover || name.indexOf(lover) > -1) && players[player].alive === true){
                found = true;
                loverPlayers.push(player);
                break;
            }
        }
        if (found === false){
            bot.sendMessage({
                to: cupid,
                message: util.format("Cannot find player %s", subject)
            });
            success = false;
            break;
        }
    }
    if (success === false){
        loverPlayers = [];
    }
    else{
        players[cupid].voted = true;
        players[cupid].role = "villager";

        bot.sendMessage({
            to: cupid,
            message: util.format("You have chosen %s and %s to be lovers. How scandalous, or not I don't know I'm just a robot.", players[loverPlayers[0]].dname, players[loverPlayers[1]].dname)
        });

        bot.sendMessage({
            to: loverPlayers[0],
            message: util.format("%s is your lover. Your parents would never approve. You must keep this blossoming romance a secret.", players[loverPlayers[1]].dname)
        });

        bot.sendMessage({
            to: loverPlayers[1],
            message: util.format("You never thought you would find love in this town. And yet here you are, dreaming of %s again. The others don't understand, you'd do anything for %s. You'd die for them, you'd kill for them.", players[loverPlayers[0]].dname, players[loverPlayers[0]].dname)
        });

        if (nightVotesDone()){
            switchToDay();
        }
    }
}

function readyVote(voter, channel){
    if (channel === wolfChannel){
        bot.sendMessage({
            to: wolfChannel,
            message: "We at Werewolf Inc would prefer if you used \"!ready\" from the privacy of your DM"
        });
    }

    players[voter].voted = true;
    bot.sendMessage({
        to: voter,
        message: "Ready status acknowledged."
    });
    
    if (nightVotesDone() || dayVotesDone()){
        if (night === 2){
            switchToDay();
        }
        else{
            killPlayer();
        }
    }

}

function unvote(voter, channel){
    players[voter].voted = false;

    var keys = Object.keys(killVotes);
    for (var nominee of keys){
        var index = killVotes[nominee].indexOf(voter);
        if (index > -1){
            killVotes[nominee].splice(index, 1);
            if (killVotes[nominee].length === 0){
                delete killVotes[nominee];
            }
        }
    }
}

function printVotes(){
    var votes = "";

    var keys = Object.keys(killVotes);
    for (var nominee of keys){
        var num = killVotes[nominee].length;
        var voters = "";
        for (var i = 0; i < num; i++){
            voters += players[killVotes[nominee][i]].dname + ", ";
        }
        voters = voters.slice(0, -2);

        votes += util.format("%s: %s votes (%s)\n", players[nominee].dname, num, voters);
    }
    votes = votes.slice(0, -1);
    return votes;
}

function prepFirstNight(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].role === "woof"){
            players[player].voted = true;
        }
    }
}

function nightVotesDone(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].alive === true && players[player].voted === false){
            return false;
        }
    }

    return true;
}

function dayVotesDone(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].alive === true && players[player].voted === false){
            return false;
        }
    }

    return true;
}

function allWolvesDead(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].role === "woof" && players[player].alive === true){
            return false;
        }
    }

    return true;
}

function allVillagersDead(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].role !== "woof" && players[player].alive === true){
            return false;
        }
    }

    night = 0;
    return true;
}

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
            case "soccer":
                if (soccerLoaded === 0){
                    loadSoccer();
                }
                bot.sendMessage({
                    to: channelID,
                    message: soccer(args, user)
                });
                break;
            case "werewolf":
                if (game === 0){
                    game = 1;
                    wolfChannel = channelID;

                    playerNames.push(user);
                    players[userID] = { "dname" : user, "role" : "", "alive" : true, "voted" : false };

                    bot.sendMessage({
                        to: channelID,
                        message: util.format("Werewolf game started, use !join to join or !start to start\nPlayers: %s", playerNames)
                    });
                }
                break;
            case "join":
                if (game === 1 && start === 0){
                    if (playerNames.indexOf(user) === -1){
                        playerNames.push(user);
                        players[userID] = { "dname" : user, "role" : "", "alive" : true, "voted" : false };
                    }
                    bot.sendMessage({
                        to: channelID,
                        message: util.format("Players: %s", playerNames)
                    });
                }
                break;
            case "start":
                if (game === 1 && start === 0 && playerNames.length > 2){
                    start = 1;
                    assignRoles();
                    //prepFirstNight();
                    night = 2;
                    bot.sendMessage({
                        to: channelID,
                        message: util.format("The roles are assigned and night falls. No murdering tonight, simply check your role. Special villagers can do their thing though.\n" +
                            "Everyone has to use !ready in their DMs to advance to day, please refrain from revealing any info you might have until dawn\n" +
                            "The player list is: %s", playerNames)
                    });
                }
                break;
            case "kill":
                if (game === 1 && start === 1 && night === 1 && userID in players && players[userID].role === "woof" && players[userID].alive === true){
                    var target = args[0];
                    if (target){
                        victimVote(userID, target, channelID);
                    }
                    else{
                        logger.info("target is undefined: " + target);
                    }
                }
                break;
            case "vote":
                if (game === 1 && start === 1 && night === 0 && userID in players && players[userID].alive === true){
                    var target = args[0];
                    if (target){
                        victimVote(userID, target, channelID);
                    }
                }
                break;
            case "see":
                if (game === 1 && start === 1 && (night === 1 || night === 2) && userID in players && players[userID].voted === false && 
                    players[userID].role === "seer" && players[userID].alive === true){
                    var subject = args[0];
                    if (subject){
                        seeRole(userID, subject);
                    }
                }
                break;
            case "save":
                if (game === 1 && start === 1 && (night === 1 || night === 2) && userID in players && players[userID].voted === false && 
                    players[userID].role === "doctor" && players[userID].alive === true){
                    var subject = args[0];
                    if (subject){
                        savePlayer(userID, subject);
                    }
                }
                break;
            case "ready":
                if (game === 1 && start === 1 && userID in players){
                    readyVote(userID, channelID);
                }
                break;
            case "unvote":
                if (game === 1 && start === 1 && userID in players && players[userID].voted === true){
                    unvote(userID, channelID);
                }
                break;
            case "players":
                if (game === 1){
                    bot.sendMessage({
                        to: channelID,
                        message: util.format("Players: %s", playerNames)
                    });
                }
                break;
            case "votes":
                if (game === 1 && start === 1 && night === 0){
                    bot.sendMessage({
                        to: channelID,
                        message: printVotes()
                    });
                }
                break;
            case "end":
                resetWolves();
                break;

            // Just add any case commands if you want to..
        }
    }
    else if (userID != 348179384580177922 && message.indexOf(bot_at) > -1){
        logger.info("I have been @");
        var messageContents = message.replace(bot_at, "");
        logger.info("@ with message contents: " + messageContents);
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
    else if (userID != 348179384580177922) {
        history = history.concat(message + "\n");
        fs.writeFile("chat.log", history, function(err) {
            if (err){
                throw err;
            }
        });

        timeSinceLast++;
        var chance = getRandomInt(1, timeSinceLast);
        if (chance > 30){
            logger.info("its been too long, time to pipe up");
            send_markov(channelID);
            timeSinceLast = 1;
        }

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
});
