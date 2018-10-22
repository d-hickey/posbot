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

// Determination
var savepoints = JSON.parse(fs.readFileSync('determination.json', 'utf8'));
var overwrite = 14;

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
                var userid = user.id;
                updateUserMsgCount(chanID, userid);
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
                var userid = user.id;
                updateUserMsgCount(chanID, userid);
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
                logger.info("found member");
                return bot.servers[serverKey].members[memberID];
            }
        }
    }
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

// werewolf vars
var dayMessages = JSON.parse(fs.readFileSync('daymessages.json', 'utf8'));
var sequels = JSON.parse(fs.readFileSync('sequels.json', 'utf8'));

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
    var index = getRandomInt(0, sequels.length-1);
    var sequel = sequels[index];
    var cast = "";

    var keys = Object.keys(players);
    for (var player of keys){
        cast += util.format("\n%s as the %s", players[player].dname, players[player].role);
    }

    bot.sendMessage({
        to: wolfChannel,
        message: util.format("THE END\n\nBut the Wuffles will return in Werewolf: %s\n\nCAST%s", sequel, cast)
    });

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

    if (loverPlayers.length === 2){
        bot.sendMessage({
            to: loverPlayers[0],
            message: util.format("%s is your lover. Your parents would never approve. You must keep this blossoming romance a secret.", players[loverPlayers[1]].dname)
        });

        bot.sendMessage({
            to: loverPlayers[1],
            message: util.format("You never thought you would find love in this town. And yet here you are, dreaming of %s again. The others don't understand, you'd do anything for %s. You'd die for them, you'd kill for them.", players[loverPlayers[0]].dname, players[loverPlayers[0]].dname)
        });
    }

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
            message: util.format("%s\nCongrats Villagers, all the wolves are dead", deathMsg)
        });
        setTimeout(resetWolves, 5000);
    }
    else if (allVillagersDead()){       
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s\nCongrats Wuffles, you've eaten them all", deathMsg)
        });
        setTimeout(resetWolves, 5000);
    }
    else if (loverPlayers.length === 2 && players[loverPlayers[0]].alive && players[loverPlayers[1]].alive){
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s\nAll is quiet in the empty town except for the faint sound of Lady Gaga's _Bad Romance_ playing on the radio in one of the abandoned houses. " +
                "The lovers %s (a %s) and %s (a %s) find themselves alone in the town. Nobody left to judge their digusting romance.", deathMsg,
                players[loverPlayers[0]].dname, players[loverPlayers[0]].role, players[loverPlayers[1]].dname, players[loverPlayers[1]].role)
        });
        setTimeout(resetWolves, 5000);
    }
    else if (playerNames.length === 2){
        var lastWolf = getLastWolf();
        var lastVillager = getLastVillager();
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s\nThe games are done now, the time for deception is over. A %s and a woof stand across from each other in the centre of town. %s readies their weapon, knowing it won't be enough. %s bares their fangs." + 
                "They run at each other, freeze frame just as they meet. Cut to credits with _Hungry like the wolf_ playing.", deathMsg, lastVillager.role, lastVillager.dname, lastWolf.dname)
        });
        setTimeout(resetWolves, 5000);
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

function getLastVillager(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].alive === true && players[player].role !== "woof"){
            return players[player];
        }
    }
}

function getLastWolf(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].alive === true && players[player].role === "woof"){
            return players[player];
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
            if (players[wolf].voted){
                unvote(wolf);
            }
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
            message: util.format("Cannot find player %s", patient)
        });
    }
}

function matchmake(cupid, loverOne, loverTwo){
    var lovers = [];
    lovers.push(loverOne);
    lovers.push(loverTwo);

    var success = true;
    for (var loverName of lovers){
        var keys = Object.keys(players);
        var found = false;

        for (var player of keys){
            var displayName = players[player].dname;
            var name = displayName.toLowerCase();
            var lover = loverName.toLowerCase();
            if ((name === lover || name.indexOf(lover) > -1) && players[player].alive === true && loverPlayers.indexOf(player) === -1){
                found = true;
                loverPlayers.push(player);
                break;
            }
        }
        if (found === false){
            bot.sendMessage({
                to: cupid,
                message: util.format("Cannot find player %s", loverName)
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

        if (nightVotesDone()){
            switchToDay();
        }
    }
}

function impatience(player){
    var num = playerNames.length;
    var threshold = Math.floor(num / 2);
    var success = false;

    var keys = Object.keys(killVotes);
    for (var nominee of keys){
        var votes = killVotes[nominee].length;
        if (votes > threshold){
            bot.sendMessage({
                to: wolfChannel,
                message: util.format("%s has had enough. They begin to walk away from the crowd gathered in the town square when suddenly then spin around, arm outstretched, hand in the form of a gun. They pull their forearm up simulating the kickback of the gun and they say \"pew pew\".", players[player].dname)
            });
            killPlayer();
            success = true;
            break;
        }
    }

    if (success === false){
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s tries to rally the crowd but there's nobody can agree on where to direct their anger.", players[player].dname)
        });
    }
}

function readyVote(voter, channel){
    if (channel === wolfChannel && night !== 0){
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

function unvote(voter){
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

    if (night === 0){
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
    }
    else{
        var ready = 0;
        var total = 0;

        var ids = Object.keys(players);
        for (var player of ids){
            if (players[player].alive){
                total++;
                if (players[player].voted){
                    ready++;
                }
            }
        }
        votes = util.format("%s ready out of a possible %s", ready, total);
    }

    
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
                    night = 2;
                    bot.sendMessage({
                        to: channelID,
                        message: util.format("The roles are assigned and night falls. No murdering tonight, simply check your role. Special villagers can do their thing though.\n" +
                            "Everyone has to use !ready in their DMs to advance to day, please refrain from revealing any info you might have until dawn\n" +
                            "The player list is: %s\nThe roles are: %s", playerNames, rolesSet[playerNames.length-1])
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
            case "matchmake":
                if (game === 1 && start === 1 && night === 2 && userID in players && players[userID].voted === false && 
                    players[userID].role === "cupid" && players[userID].alive === true){
                    var loverOne = args[0];
                    var loverTwo = args[1];
                    if (loverOne && loverTwo){
                        matchmake(userID, loverOne, loverTwo);
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
                    unvote(userID);
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
                if (game === 1 && start === 1){
                    bot.sendMessage({
                        to: channelID,
                        message: printVotes()
                    });
                }
                break;
            case "impatience":
                if (game === 1 && start === 1 && night === 0 && userID in players){
                    impatience(userID);
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
    updateUserMsgCount(channelID, userID, false);
});
