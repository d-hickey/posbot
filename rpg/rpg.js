// Standard
var fs = require("fs");
var util = require("util");

// Local
var randomInt = require("../randomint");

// Discord client
var bot;

var genParts = JSON.parse(fs.readFileSync('./rpg/rpg_names.json', 'utf8'));
var chars = {};

// Character Gen
function NameGen(){
    var firstIndex = randomInt.Get(0, genParts.first.length-1);
    var first = genParts.first[firstIndex];

    var lastIndex = randomInt.Get(0, genParts.last.length-1);
    var last = genParts.last[lastIndex];

    var titleIndex = randomInt.Get(0, genParts.title.length-1);
    var title = genParts.title[titleIndex];
    if (title != ""){
        title = util.format(" \"%s\"", title);
    }

    return util.format("%s%s%s", first, last, title);
}

function RaceGen(){
    var raceIndex = randomInt.Get(0, genParts.race.length-1);
    return genParts.race[raceIndex];
}

function ClassGen(){
    var classIndex = randomInt.Get(0, genParts.class.length-1);
    return genParts.class[classIndex];
}

function StoryGen(){
    var bornIndex = randomInt.Get(0, genParts.born.length-1);
    var born = genParts.born[bornIndex];

    var parentsIndex = randomInt.Get(0, genParts.parents.length-1);
    var parents = genParts.parents[parentsIndex];

    var backgroundIndex = randomInt.Get(0, genParts.background.length-1);
    var background = genParts.background[backgroundIndex];

    var reasonIndex = randomInt.Get(0, genParts.reason.length-1);
    var reason = genParts.reason[reasonIndex];

    var destinyIndex = randomInt.Get(0, genParts.destiny.length-1);
    var destiny = genParts.destiny[destinyIndex];

    return util.format("You were born %s. Your parents were %s. You spent years %s but %s. Now you %s.", 
                        born, parents, background, reason, destiny);
}

function CreateCharacter(userID){
    var char = {};
    char.name = NameGen();
    char.race = RaceGen();
    char.class = ClassGen();
    char.story = StoryGen();

    chars[userID] = char;
}

function CharacterString(userID){
    var char = chars[userID];
    return util.format("You are %s, %s %s\n%s", char.name, char.race, char.class, char.story);
}

function Commands(client, userID, channelID, cmd, args){
    bot = client;

    switch (cmd){
        case "newchar": // Fallthrough
        case "rollchar":
            CreateCharacter(userID);
            bot.sendMessage({
                to: channelID,
                message: CharacterString(userID)
            });
            break;
    }
}

exports.Commands = Commands;