var fs = require("fs");
var util = require("util");

var logger = require("winston");

var randomInt = require("../randomint");

// Discord client
var bot;

// werewolf vars
var dayMessages = JSON.parse(fs.readFileSync('./werewolf/daymessages.json', 'utf8'));
var sequels = JSON.parse(fs.readFileSync('./werewolf/sequels.json', 'utf8'));

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
var hunters = [];
var visits = [];

var woofRole = "woof";
var villagerRole = "villager";
var seerRole = "seer";
var doctorRole = "doctor";
var cupidRole = "cupid";
var hunterRole = "hunter";
var harlotRole = "harlot";

var roles1 = [woofRole];
var roles2 = [villagerRole , woofRole];
var roles3 = [villagerRole , villagerRole , woofRole];
var roles4 = [seerRole , villagerRole , villagerRole , woofRole];
var roles5 = [seerRole , doctorRole , villagerRole , villagerRole , woofRole];
var roles6 = [seerRole , doctorRole , cupidRole , villagerRole , woofRole, woofRole];
var roles7 = [seerRole , doctorRole , cupidRole , villagerRole , villagerRole , woofRole, woofRole];
var roles8 = [seerRole , doctorRole , cupidRole , villagerRole , villagerRole , villagerRole , woofRole, woofRole];

var rolesSet = [roles1, roles2, roles3, roles4, roles5, roles6, roles7, roles8];

var randomRoles = [seerRole , doctorRole , cupidRole , hunterRole , harlotRole, villagerRole , woofRole];

function resetWolves(){
    var index = randomInt.Get(0, sequels.length-1);
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
    visits = [];
    var keys = Object.keys(players);

    for (var player of keys){
        players[player].voted = false;
    }
}

// Role assignment
function assignRoles(){
    var keys = Object.keys(players);
    roles = rolesSet[keys.length-1].slice(0);

    for (var key of keys){
        var index = randomInt.Get(0, roles.length-1);
        var newRole = roles[index];
        roles.splice(index, 1);
        players[key].role = newRole;
    }
    informPlayersOfRoles();
}

function assignRandomRoles(){
    var keys = Object.keys(players);
    roles = randomRoles.slice(0);

    for (var key of keys){
        var index = randomInt.Get(0, roles.length-1);
        var newRole = roles[index];

        // Can't have multiple cupids
        if (newRole === cupidRole){
            roles.splice(index, 1);
        }
        
        players[key].role = newRole;
    }
    
    informPlayersOfRoles();
}

function informPlayersOfRoles(){
    for (var player in players){
        var role = players[player].role;
        var roleMsg = util.format("########### NEW GAME ###########\nYou have been assigned the role: %s", role);
        if (role === woofRole){
            var wolves = getWolves();
            roleMsg = roleMsg + util.format("\nYou cannot kill on the first night, but perhaps you can consort with your wuffle buddies? Use \"!ready\" to progress.\nThe wolves are: %s", wolves);
        }
        else if (role === seerRole){
            roleMsg = roleMsg + "\nYou have the gift and can sense one's true nature. Gather your crystal balls and incense and use \"!see <name>\" to determine the targets role in all this";
        }
        else if (role === doctorRole){
            roleMsg = roleMsg + "\nYears in education and training mean you can now cheat death itself. Use\"!save <name>\" to prevent any harm coming to somebody, or yourself.";
        }
        else if (role === cupidRole){
            roleMsg = roleMsg + ", use \"!matchmake <name> <name>\" to select to select two players to be the secret lovers." +
                    "\n Players: " + playerNames.toString();
        }
        else if (role === hunterRole){
            hunters.push(player);
            roleMsg = roleMsg + "\nOnce per game, during the day, you can use \"!shoot <name>\" to kill another player. For now just use \"!ready\" to sleep peacefully through the night.";
        }
        else if (role === harlotRole){
            roleMsg = roleMsg + "\nDuring the night you can use \"!visit <name>\" to spend the night with someone, you'll gain some info too, just avoid the wuffles." +
                      "\nOr use \"!ready\" to spend the night at home.";
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

// Send messages
function sendDayMessage(){
    var keys = Object.keys(players);

    var ats = "";
    for (var player of keys){
        if (players[player].alive === true){
            ats = ats + util.format("<@%s> ", player);
        }
    }

    var index = randomInt.Get(0, dayMessages.length-1);
    var message = dayMessages[index];

    bot.sendMessage({
        to: wolfChannel,
        message: util.format("%s %s\nThe player list is: %s", ats, message, playerNames)
    });
}

function sendNightMessages(){
    bot.sendMessage({
        to: wolfChannel,
        message: util.format("It's sleepy time, wolves use \"!kill <name>\" to pick dinner.\nThe player list is: %s", playerNames)
    });

    for (var player of players){
        if (players[player].alive === true){
            var role = players[player].role;
            var roleMsg = "It's night time, so I need you to ";
            if (role === woofRole){
                roleMsg = roleMsg + "use \"!kill <name>\" to select a player to kill. You could also just use \"!ready\" to not kill at all." +
                        "\n Players: " + playerNames.toString();
            }
            else if (role === seerRole){
                roleMsg = roleMsg + "use \"!see <name>\" to select a player to spy on. You could also just use \"!ready\" to not view anyone." +
                        "\n Players: " + playerNames.toString();
            }
            else if (role === doctorRole){
                roleMsg = roleMsg + "use \"!save <name>\" to select a player to heal, should any harm come to them. You could also just use \"!ready\" to abandon your duties." +
                        "\n Players: " + playerNames.toString();
            }
            else if (role === harlotRole){
                roleMsg = roleMsg + "use \"!visit <name>\" to select a player to spend some quality time with. You could also just use \"!ready\" to take the night off." +
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

function sendLoverMessages(){
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
}

function sendHarlotMessages(){
    for (var visit in visits){
        var harlot = visits[visit].harlot;
        var paramour = visits[visit].visitee;

        bot.sendMessage({
            to: harlot,
            message: util.format("The pillow talk with %s was very revealing. They're a %s.", players[paramour].dname, getRole(players[paramour]))
        });

        bot.sendMessage({
            to: paramour,
            message: util.format("You got a surprise visit from %s last night. At first you thought they were a wolf, but it was just their fur suit ;).",
                                 players[harlot].dname)
        });

        if (players[paramour].role === woofRole && !areLovers(harlot, paramour)){
            players[harlot].alive = false;
            var index = playerNames.indexOf(players[harlot].dname);
            if (index !== -1){
                playerNames.splice(index, 1);
            }

            var deathMsg = util.format("%s visited a woof last night. That was a mistake.", players[harlot].dname);

            deathMsg = handleLoverDeath(harlot, deathMsg);

            bot.sendMessage({
                to: wolfChannel,
                message: deathMsg
            });
        }
    }
}

// Progress game state
function advanceTime(){
    if (night === 0){
        setTimeout(killPlayer, 2000);
    }
    else{
        switchToDay();
    }
}

function updateGameState(){
    if (checkEndStates()){
        setTimeout(resetWolves, 5000);
    }
    else{
        resetVotes();
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

function postShoot(){
    if (checkEndStates()){
        setTimeout(resetWolves, 5000);
    }
    else if (votesDone()){
        setTimeout(killPlayer, 2000);
    }
}

function switchToDay(){
    if (night === 1){
        setTimeout(sendHarlotMessages, 2000);
        setTimeout(killPlayer, 5000);
    }
    else if (night === 2){
        night = 0;
        resetVotes();
        setTimeout(sendLoverMessages, 2000);
        setTimeout(sendHarlotMessages, 4000);
        setTimeout(sendDayMessage, 6000);
    }
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
                var rand = randomInt.Get(0, 1);
                if (rand === 1){
                    victim = potential;
                }
            }
        }
        if (savedPlayers.indexOf(victim) > -1){
            deathMsg = util.format("Everyone receives a message from %s. It contains a picture of them in a hospital bed and the tagline \"I lived bitch\".", players[victim].dname);
        }
        else if (wasOut(victim)){
            deathMsg = "The wuffles' target wasn't at home last night. What could they have been doing out at that hour.";
        }
        else{
            players[victim].alive = false;
            var index = playerNames.indexOf(players[victim].dname);
            if (index !== -1){
                playerNames.splice(index, 1);
            }
            killVotes = {};

            deathMsg = util.format("%s is dead and they were a %s", players[victim].dname, getRole(players[victim]));

            deathMsg = handleGuests(victim, deathMsg);

            // Handle surviving lover
            deathMsg = handleLoverDeath(victim, deathMsg);
        }
    }
    else{
        deathMsg = "Nobody is dead. Strange, I'm fairly sure somebody should be dead. Anyway... ";
    }

    bot.sendMessage({
        to: wolfChannel,
        message: deathMsg
    });

    setTimeout(updateGameState, 3000);
}

function handleLoverDeath(victim, deathMsg){
    if (loverPlayers.indexOf(victim) > -1){
        var widow = loverPlayers[0];
        if (widow === victim){
            widow = loverPlayers[1];
        }

        players[widow].alive = false;
        var index = playerNames.indexOf(players[widow].dname);
        if (index !== -1){
            playerNames.splice(index, 1);
        }

        deathMsg = deathMsg + util.format("\nTheir lover, %s, dies of a broken heart. How romantic and sad. They were a %s.", players[widow].dname, getRole(players[widow]));
    }

    return deathMsg;
}

function handleGuests(victim, deathMsg){
    for (var visit in visits){
        if (victim === visits[visit].visitee){
            var guest = visits[visit].visitee;

            players[guest].alive = false;
            var index = playerNames.indexOf(players[guest].dname);
            if (index !== -1){
                playerNames.splice(index, 1);
            }

            deathMsg = deathMsg + util.format("\nAnd they had %s over as a guest at the time. How unfortunate.", players[guest].dname);
        }
    }

    return deathMsg;
}

function checkEndStates(){
    if (allWolvesDead()){
        bot.sendMessage({
            to: wolfChannel,
            message: "Congrats Villagers, all the wolves are dead"
        });
        return true;
    }
    if (allVillagersDead()){
        bot.sendMessage({
            to: wolfChannel,
            message: "Congrats Wuffles, you've eaten them all"
        });
        return true;
    }
    if (loverPlayers.length === 2 && players[loverPlayers[0]].alive && players[loverPlayers[1]].alive){
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("All is quiet in the empty town except for the faint sound of Lady Gaga's _Bad Romance_ playing on the radio in one of the abandoned houses. " +
                "The lovers %s (a %s) and %s (a %s) find themselves alone in the town. Nobody left to judge their digusting romance.",
                players[loverPlayers[0]].dname, getRole(players[loverPlayers[0]]), players[loverPlayers[1]].dname, getRole(players[loverPlayers[1]]))
        });
        return true;
    }
    if (playerNames.length === 2){
        var lastWolf = getLastWolf();
        var lastVillager = getLastVillager();
        var channelMsg = util.format(
            "The games are done now, the time for deception is over. A %s and a woof stand across from each other in the centre of town." +
            " %s readies their weapon, knowing it won't be enough. %s bares their fangs. " +
            "They run at each other, freeze frame just as they meet. Cut to credits with _Hungry like the wolf_ playing.",
            getRole(lastVillager), lastVillager.dname, lastWolf.dname
        );
        if (lastVillager.role == hunterRole){
            channelMsg = util.format("%s has %s cornered, all hope is lost for the village.\n" +
                "But what's this, a flash of light and %s, the hunter, has teleported behind the woof.\n" +
                "\"Psssh... nothin personnel kid\".", lastWolf.dname, lastVillager.dname, lastVillager.dname);
        }
        bot.sendMessage({
            to: wolfChannel,
            message: channelMsg
        });
        return true;
    }
    return false;
}

// Player checks
function wasOut(player){
    for (var visit in visits){
        if (player === visits[visit].harlot){
            return true;
        }
    }
    return false;
}

function areLovers(one, two){
    if (loverPlayers.indexOf(one) > -1 && loverPlayers.indexOf(two) > -1){
        return true;
    }

    return false;
}

// Get player objects
function getWolves(){
    var wolves = [];
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].role === woofRole){
            wolves.push(players[player].dname);
        }
    }
    return wolves;
}

function getLastVillager(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].alive === true && players[player].role !== woofRole){
            return players[player];
        }
    }
}

function getLastWolf(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].alive === true && players[player].role === woofRole){
            return players[player];
        }
    }
}

function getRole(player){
    if (player.role === cupidRole){
        return villagerRole;
    }
    return player.role;
}

// Votes and role actions
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
            
            if (votesDone()){
                advanceTime();
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
                message: util.format("Where there once was doubt, there is now certainty. %s is a %s", displayName, getRole(players[player]))
            });
            
            if (votesDone()){
                advanceTime();
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
            
            
            if (votesDone()){
                advanceTime();
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

        bot.sendMessage({
            to: cupid,
            message: util.format("You have chosen %s and %s to be lovers. How scandalous! Or not? I don't know I'm just a robot.", players[loverPlayers[0]].dname, players[loverPlayers[1]].dname)
        });

        if (votesDone()){
            advanceTime();
        }
    }
}

function shoot(shooter, target){
    var shot = false;

    for (var player in players){
        var displayName = players[player].dname;
        var name = displayName.toLowerCase();
        var victim = target.toLowerCase();
        if ((name === victim || name.indexOf(victim) > -1) && players[player].alive === true){
            shot = true;
            var hunterIndex = hunters.indexOf(shooter);
            hunters.splice(hunterIndex, 1);

            var chance = randomInt.Get(1, 100);
            var dead = player;
            var deathMsg = util.format("%s shoots %s. Now that they're dead it's actually really obvious they were a %s",
                                       players[shooter].dname, displayName, getRole(players[player]));

            if (chance < 21){
                dead = shooter;
                deathMsg = util.format("%s! You're holding the gun backwards! Oh no, they have air pods in, they can't hear us!" +
                                       "\nWell they _were_ a hunter if that wasn't obvious",
                                       players[shooter].dname);
            }

            players[dead].alive = false;
            var index = playerNames.indexOf(players[dead].dname);
            if (index !== -1){
                playerNames.splice(index, 1);
            }
            unvote(dead, wolfChannel, false);

            deathMsg = handleLoverDeath(dead, deathMsg);

            bot.sendMessage({
                to: wolfChannel,
                message: deathMsg
            });

            setTimeout(postShoot, 2000);

            break;
        }
    }
    if (shot === false){
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("Cannot find player %s", subject)
        });
    }
}

function visitPlayer(harlot, paramour){
    var visited = false;

    for (var player in players){
        var displayName = players[player].dname;
        var name = displayName.toLowerCase();
        var visitee = paramour.toLowerCase();

        if ((name === visitee || name.indexOf(visitee) > -1) && players[player].alive === true && player !== harlot){
            visited = true;
            players[harlot].voted = true;

            var visitObj = {};
            visitObj.harlot = harlot;
            visitObj.visitee = player;
            visits.push(visitObj);
            
            bot.sendMessage({
                to: harlot,
                message: util.format("You'll be staying with %s tonight. Listen, I don't want any details, just make sure you use protection.", displayName)
            });
            
            if (votesDone()){
                advanceTime();
            }
            break;
        }
    }
    if (visited === false){
        bot.sendMessage({
            to: harlot,
            message: util.format("Cannot find player %s", paramour)
        });
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
            message: "Acknowledged, but we at Werewolf Inc would prefer if you used \"!ready\" from the privacy of your DM"
        });
    }
    else if (night === 0){
        bot.sendMessage({
            to: wolfChannel,
            message: util.format("%s has abstained from voting.", players[voter].dname)
        });
    }
    else{
        bot.sendMessage({
            to: voter,
            message: "Ready status acknowledged."
        });
    }
    
    players[voter].voted = true;
    
    if (votesDone()){
        advanceTime();
    }
}

function unvote(voter, channelID, notify=true){
    players[voter].voted = false;

    var keys = Object.keys(killVotes);
    for (var nominee of keys){
        var index = killVotes[nominee].indexOf(voter);
        if (index > -1){
            killVotes[nominee].splice(index, 1);
            if (killVotes[nominee].length === 0){
                delete killVotes[nominee];
            }
            if (notify){
                bot.sendMessage({
                    to: channelID,
                    message: "Vote Rescinded."
                });
            }
            break;
        }
    }
}

function printVotes(){
    var votes = "";
    var ready = 0;

    if (night === 0){
        var voted = 0;
        var keys = Object.keys(killVotes);
        for (var nominee of keys){
            var num = killVotes[nominee].length;
            voted += num;
            var voters = "";
            for (var i = 0; i < num; i++){
                voters += players[killVotes[nominee][i]].dname + ", ";
            }
            voters = voters.slice(0, -2);

            votes += util.format("%s: %s votes (%s)\n", players[nominee].dname, num, voters);
        }
        for (var id in players){
            if (players[id].voted){
                ready++;
            }
        }
        var passed = ready - voted;
        if (passed > 0){
            votes += util.format("Abstained: %s", passed);
        }
        else{
            votes = votes.slice(0, -1);
        }
    }
    else{
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

// Setup and state checking
function prepFirstNight(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].role === woofRole){
            players[player].voted = true;
        }
    }
}

function votesDone(){
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
        if (players[player].role === woofRole && players[player].alive === true){
            return false;
        }
    }

    return true;
}

function allVillagersDead(){
    var keys = Object.keys(players);

    for (var player of keys){
        if (players[player].role !== woofRole && players[player].alive === true){
            return false;
        }
    }

    night = 0;
    return true;
}

function Werewolf(client, user, userID, channelID, cmd, args){
    bot = client;

    switch(cmd){
        case "play": // Fallthrough
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
            else if (game === 0){
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
        case "random": // Fallthrough
        case "start-random":
            if (game === 1 && start === 0 && playerNames.length > 0){
                start = 1;
                assignRandomRoles();
                night = 2;
                bot.sendMessage({
                    to: channelID,
                    message: util.format("The roles have been randomised, maybe everyone is a woof, maybe there's two cupids, look in your DMs to find out!\n" +
                        "Everyone has to use !ready in their DMs to advance to day, please refrain from revealing any info you might have until dawn\n" +
                        "The player list is: %s\nThe roles are: UNKNOWN", playerNames)
                });
            }
            break;
        case "kill":
            if (game === 1 && start === 1 && night === 1 && userID in players && players[userID].role === woofRole && players[userID].alive === true){
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
                var votee = args[0];
                if (votee){
                    victimVote(userID, votee, channelID);
                }
            }
            break;
        case "see":
            if (game === 1 && start === 1 && (night === 1 || night === 2) && userID in players && players[userID].voted === false && 
                players[userID].role === seerRole && players[userID].alive === true){
                var subject = args[0];
                if (subject){
                    seeRole(userID, subject);
                }
            }
            break;
        case "save":
            if (game === 1 && start === 1 && (night === 1 || night === 2) && userID in players && players[userID].voted === false && 
                players[userID].role === doctorRole && players[userID].alive === true){
                var patient = args[0];
                if (patient){
                    savePlayer(userID, patient);
                }
            }
            break;
        case "match": // Fallthrough
        case "matchmake":
            if (game === 1 && start === 1 && night === 2 && userID in players && players[userID].voted === false && 
                players[userID].role === cupidRole && players[userID].alive === true){
                var loverOne = args[0];
                var loverTwo = args[1];
                if (loverOne && loverTwo){
                    matchmake(userID, loverOne, loverTwo);
                }
            }
            break;
        case "shoot":
            if (game === 1 && start === 1 && night === 0 && userID in players &&
                players[userID].alive === true && players[userID].role === hunterRole &&
                hunters.indexOf(userID) > -1){
                var victim = args[0];
                if (victim){
                    shoot(userID, victim);
                }
            }
            break;
        case "bang": // Fallthrough
        case "visit":
            if (game === 1 && start === 1 && (night === 1 || night === 2) && userID in players &&
                players[userID].voted === false && players[userID].role === harlotRole && players[userID].alive === true){
                var paramour = args[0];
                if (paramour){
                    visitPlayer(userID, paramour);
                }
            }
            break;
        case "pass": //Fallthrough
        case "ready":
            if (game === 1 && start === 1 && userID in players){
                readyVote(userID, channelID);
            }
            break;
        case "cancel": // Fallthrough
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
    }
}

exports.Commands = Werewolf;