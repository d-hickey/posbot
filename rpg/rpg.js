// Standard
var fs = require("fs");
var util = require("util");

// Local
var randomInt = require("../randomint");

// Discord client
var bot;

var genParts = JSON.parse(fs.readFileSync('./rpg/rpg_names.json', 'utf8'));
var save = JSON.parse(fs.readFileSync('./rpg/save.json', 'utf8'));

var weaponChoices = {
    "A": {
        "action": "Take the weapon.",
        "check": [],
        "succeed": ["take", "New weapon have you!"]
    },
    "B": {
        "action": "Keep your weapon.",
        "check": [],
        "succeed": ["", "You're too attached to your current weapon, and you can only hold one."]
    }
};

function SaveGame() {
    var saveJson = JSON.stringify(save, null, 4);
    fs.writeFileSync('./rpg/save.json', saveJson);
}

// Character Gen
function NameGen() {
    var firstIndex = randomInt.Get(0, genParts.first.length - 1);
    var first = genParts.first[firstIndex];

    var lastIndex = randomInt.Get(0, genParts.last.length - 1);
    var last = genParts.last[lastIndex];

    var title = "";
    var titleChance = randomInt.Get(0, 100);
    if (titleChance > 60){
        var titleIndex = randomInt.Get(0, genParts.title.length - 1);
        title = genParts.title[titleIndex];
    }
    if (title != "") {
        title = util.format(" \"%s\"", title);
    }

    return util.format("%s%s%s", first, last, title);
}

function RaceGen() {
    var raceIndex = randomInt.Get(0, genParts.race.length - 1);
    return genParts.race[raceIndex];
}

function ClassGen() {
    var classIndex = randomInt.Get(0, genParts.class.length - 1);
    return genParts.class[classIndex];
}

function StoryGen() {
    var bornIndex = randomInt.Get(0, genParts.born.length - 1);
    var born = genParts.born[bornIndex];

    var parentsIndex = randomInt.Get(0, genParts.parents.length - 1);
    var parents = genParts.parents[parentsIndex];

    var backgroundIndex = randomInt.Get(0, genParts.background.length - 1);
    var background = genParts.background[backgroundIndex];

    var reasonIndex = randomInt.Get(0, genParts.reason.length - 1);
    var reason = genParts.reason[reasonIndex];

    var destinyIndex = randomInt.Get(0, genParts.destiny.length - 1);
    var destiny = genParts.destiny[destinyIndex];

    return util.format("They say you were born %s. Your parents were %s. You spent years %s. But %s. Now you %s.",
        born, parents, background, reason, destiny);
}

function WeaponGen() {
    var weapons = Object.keys(genParts.weapon);
    var index = randomInt.Get(0, weapons.length - 1);
    var type = weapons[index];
    var rarity = randomInt.Get(0, 100);
    var bonus = 0;
    if (rarity > 90){
        bonus = 3;
    }
    else if (rarity > 75){
        bonus = 2;
    }
    else if (rarity > 50){
        bonus = 1;
    }

    var adjectives = [];
    var source = genParts.adjective.slice(0);
    for (var i = 0; i < bonus; i++){
        var adjIndex = randomInt.Get(0, source.length - 1);
        adjectives.push(source[adjIndex]);
        source.splice(adjIndex, 1);
    }

    var weapon = {};
    weapon.type = type;
    weapon.bonus = bonus;
    weapon.adjectives = adjectives.join(", ");
    return weapon;
}

function WeaponString(weapon){
    if (weapon.adjectives !== ""){
        return util.format("%s %s", weapon.adjectives, weapon.type);
    }
    else{
        return weapon.type;
    }
}

function StatsGen() {
    stats = {};
    for (var stat of genParts.stats) {
        var score = randomInt.Get(1, 20);
        stats[stat] = score;
    }
    return stats;
}

function StatString(stats) {
    var string = "";
    for (var stat of genParts.stats) {
        if (stat in stats) {
            string += util.format("%s:%d ", stat, stats[stat]);
        }
    }
    return string;
}

function CreateCharacter(userID) {
    var char = {};
    char.name = NameGen();
    char.race = RaceGen();
    char.class = ClassGen();
    char.story = StoryGen();
    char.weapon = WeaponGen();
    char.stats = StatsGen();
    char.time = 0;
    char.alive = true;

    save.chars[userID] = char;
    SaveGame();
}

function CharacterString(userID) {
    if (!(userID in save.chars)){
        return "";
    }
    var char = save.chars[userID];
    if (!char.alive){
        return util.format("You were %s. But now you are dead. You can use !rollchar for another chance at life.", char.name);
    }
    return util.format("You are %s, %s %s\nYou're weapon of choice: %s\n%s\n%s", char.name, char.race, char.class, WeaponString(char.weapon), char.story, StatString(char.stats));
}

// Events
function RunEvent(userID, channelID){
    if (!save.chars[userID].alive){
        return;
    }
    var index = randomInt.Get(0, genParts.events.length - 1);
    var ev = genParts.events[index];

    var summary = ev.summary;
    var item = {};
    for (var task of ev.setup){
        if (task === "weapon"){
            item = WeaponGen();
            summary = summary.replace("<weapon>", WeaponString(item));
        }
    }

    var alert = util.format("<@%s> %s\n%s", userID, summary, ChoiceString(ev.choices));
    bot.sendMessage({
        to: channelID,
        message: alert
    });
    save.events[userID] = {};
    save.events[userID].choices = ev.choices;
    save.events[userID].item = item;
}

function ChoiceString(choices){
    var strings = [];
    for (var letter in choices){
        strings.push(util.format("%s: %s", letter, choices[letter].action));
    }
    return strings.join("\n");
}

function Action(userID, channelID, letter){
    if (!(userID in save.events) || !letter){
        return;
    }
    letter = letter.toUpperCase();
    if (!(letter in save.events[userID].choices)){
        bot.sendMessage({
            to: channelID,
            message: letter + " is not an option"
        });
    }

    var char = save.chars[userID];
    var ev = save.events[userID];
    var choice = ev.choices[letter];
    var check = choice.check;

    if (check.length === 0){
        HandleResult(userID, channelID, char, choice.succeed, ev.item);
        return;
    }

    var stat = check[0];
    var dc = check[1];
    var mod = 0;
    if (stat === "ATT"){
        mod = char.weapon.bonus;
    }
    else{
        mod = char.stats[stat];
    }
    var roll = randomInt.Get(1, 20);

    var result = choice.fail;
    if (roll + mod > dc){
        result = choice.succeed;
    }
    HandleResult(userID, channelID, char, result, ev.item);
}

function HandleResult(userID, channelID, char, result, item){
    delete save.events[userID];
    var outcome = result[0];
    var message = result[1];
    message = message.replace("<attack>", genParts.weapon[char.weapon.type]);

    if (outcome === "die"){
        char.alive = false;
        message += " You died.";
    }
    else if (outcome === "weapon"){
        var weaponEvent = {};
        weaponEvent.choices = weaponChoices;
        weaponEvent.item = WeaponGen();
        save.events[userID] = weaponEvent;
        message += util.format(" You find a %s.\n%s", WeaponString(weaponEvent.item), ChoiceString(weaponEvent.choices));
    }
    else if (outcome === "take"){
        char.weapon = item;
    }
    else if (outcome !== ""){
        var parts = outcome.split(" ");
        var stat = parts[0];
        var amount = parseInt(parts[1]);
        char.stats[stat] += amount;
        message += util.format(" Your %s changes by %d and is now %d.", stat, amount, char.stats[stat]);
        if (stat === "HP" && char.stats[stat] < 1){
            message += " You die.";
            char.alive = false;
        }
    }
    bot.sendMessage({
        to: channelID,
        message: message
    });

    SaveGame();
}

function Commands(client, userID, channelID, cmd, args) {
    bot = client;

    switch (cmd) {
        case "newchar": // Fallthrough
        case "rollchar":
            CreateCharacter(userID);
            bot.sendMessage({
                to: channelID,
                message: CharacterString(userID)
            });
            break;
        case "showchar":
            bot.sendMessage({
                to: channelID,
                message: CharacterString(userID)
            });
            break;
        case "choose":
            Action(userID, channelID, args[0]);
            break;
        case "a": // Fallthrough
        case "A":
            Action(userID, channelID, 'A');
            break;
        case "b": // Fallthrough
        case "B":
            Action(userID, channelID, 'B');
            break;
        case "c": // Fallthrough
        case "C":
            Action(userID, channelID, 'C');
            break;
        case "d": // Fallthrough
        case "D":
            Action(userID, channelID, 'D');
            break;
    }
}

function Entry(client, userID, channelID){
    bot = client;

    if (userID in save.chars && !(userID in save.events)){
        var time = save.chars[userID].time++;
        var chance = randomInt.Get(1, time);
        if (chance > save.chance){
            RunEvent(userID, channelID);
        }
        SaveGame();
    }
}

exports.Commands = Commands;
exports.Update = Entry;
