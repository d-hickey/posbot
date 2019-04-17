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

    return util.format("%s%s \"%s\"", first, last, title);
}

function RaceGen(){
    var raceIndex = randomInt.Get(0, genParts.race.length-1);
    return genParts.race[raceIndex];
}

function ClassGen(){
    var classIndex = randomInt.Get(0, genParts.class.length-1);
    return genParts.class[classIndex];
}

function CreateCharacter(userID){
    var char = {};
    char.name = NameGen();
    char.race = RaceGen();
    char.class = ClassGen();

    chars[userID] = char;
}

function CharacterString(userID){
    var char = chars[userID];
    return util.format("You are %s, %s %s", char.name, char.race, char.class);
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