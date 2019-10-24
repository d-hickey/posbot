// Standard
var fs = require("fs");
var util = require("util");

// Local
var randomInt = require("../randomint");
var user = require("../user");

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
    if (rarity >= 100){
        bonus = 5;
    }
    else if (rarity >= 95){
        bonus = 4;
    }
    if (rarity >= 85){
        bonus = 3;
    }
    else if (rarity >= 65){
        bonus = 2;
    }
    else if (rarity >= 40){
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
    // Standard stats
    for (var stat of genParts.stats) {
        if (stat in stats) {
            string += util.format("%s:%d ", stat, stats[stat]);
        }
    }
    // Additional stats
    for (var userStat in stats){
        if (genParts.stats.indexOf(userStat) < 0){
            string += util.format("%s:%d ", userStat, stats[userStat]);
        }
    }
    return string;
}

function CharGen(){
    var char = {};
    char.name = NameGen();
    char.race = RaceGen();
    char.class = ClassGen();
    char.story = StoryGen();
    char.weapon = WeaponGen();
    char.stats = StatsGen();
    char.time = 0;
    char.alive = true;
    return char;
}

function CreateCharacter(userID) {
    var char = CharGen();

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
    return util.format("You are %s, %s %s\nYour weapon of choice: %s\n%s\n%s", char.name, char.race, char.class, WeaponString(char.weapon), char.story, StatString(char.stats));
}

function BioString(userID){
    if (!(userID in save.chars)){
        return "";
    }
    var char = save.chars[userID];
    return util.format("You are %s, %s %s", char.name, char.race, char.class);
}

// Events
function RunEvent(userID, channelID){
    if (!save.chars[userID].alive){
        var resChance = randomInt.Get(0, 100);
        if (resChance >= 95){
            save.chars[userID].alive = true;
            save.chars[userID].stats.HP = randomInt.Get(1, 20);
            bot.sendMessage({
                to: channelID,
                message: util.format(
                    "<@%s> %s awakes in a field outside a quiet hamlet, alive and well. How did they get here? Didn't they die? Maybe it was all just a bad dream",
                    userID, save.chars[userID].name
                )
            });
        }
        return;
    }
    var index = randomInt.Get(0, genParts.events.length - 1);
    var ev = genParts.events[index];

    var summary = ev.summary;
    var item = {};
    var ally = "";
    for (var task of ev.setup){
        if (task === "weapon"){
            item = WeaponGen();
            summary = summary.replace("<weapon>", WeaponString(item));
        }
        if (task === "ally"){
            ally = GetAlly(userID, true);
            if (ally === ""){
                // No allies, run different event
                RunEvent(userID, channelID);
                return;
            }
            summary = summary.replace("<ally>", AllyDisplayName(ally));
        }
        if (task === "dead"){
            ally = GetAlly(userID, false);
            if (ally === ""){
                // No allies, run different event
                RunEvent(userID, channelID);
                return;
            }
            summary = summary.replace("<ally>", AllyDisplayName(ally));
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
    save.events[userID].ally = ally;
}

function GetAlly(userID, alive){
    var candidates = [];
    for (var id in save.chars){
        if (id != userID && save.chars[id].alive === alive){
            candidates.push(id);
        }
    }
    if (candidates.length === 0){
        return "";
    }

    var index = randomInt.Get(0, candidates.length - 1);
    return candidates[index];
}

function AllyDisplayName(userID){
    var name = save.chars[userID].name;
    var nick = user.GetMember(bot, userID).nick;
    return util.format("%s (%s)", name, nick);
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
        HandleResult(userID, channelID, char, choice.succeed, ev.item, ev.ally);
        return;
    }

    var stat = check[0];
    var dc = check[1];
    var mod = 0;
    if (stat === "ATT"){
        mod = char.weapon.bonus;
    }
    else if (stat === "FIGHT"){
        mod = char.weapon.bonus;
        dc = randomInt.Get(1, 20) + save.chars[ev.ally].weapon.bonus;
    }
    else if (stat === "TEAM"){
        mod = char.weapon.bonus + save.chars[ev.ally].weapon.bonus;
    }
    else{
        mod = char.stats[stat];
    }
    var roll = randomInt.Get(1, 20);
    if (stat === "GOLD"){
        roll = 0;
    }

    var result = choice.fail;
    if (roll + mod >= dc){
        result = choice.succeed;
    }
    HandleResult(userID, channelID, char, result, ev.item, ev.ally);
}

function HandleResult(userID, channelID, char, result, item, ally){
    delete save.events[userID];
    var outcomes = result[0].split(",");
    var message = result[1];
    message = message.replace("<attack>", genParts.weapon[char.weapon.type]);
    if (ally && ally != "" && ally in save.chars){
        message = message.replace("<ally>", AllyDisplayName(ally));
    }

    for (var outcome of outcomes){
        if (outcome === "die"){
            char.alive = false;
            message += " You died.";
        }
        else if (outcome === "allydie"){
            message += util.format(" %s dies.", AllyDisplayName(ally));
            save.chars[ally].alive = false;
            HandleAllyDeath(ally);
        }
        else if (outcome === "allyrevive"){
            save.chars[ally].alive = true;
            save.chars[ally].stats.HP = randomInt.Get(1, 20);
            message += util.format(" %s is returned from death.", AllyDisplayName(ally));
        }
        else if (outcome === "weapon" && char.alive){
            var weaponEvent = {};
            weaponEvent.choices = weaponChoices;
            weaponEvent.item = WeaponGen();
            save.events[userID] = weaponEvent;
            message += util.format(" You find a **%s**.\n%s", WeaponString(weaponEvent.item), ChoiceString(weaponEvent.choices));
        }
        else if (outcome === "take"){
            char.weapon = item;
        }
        else if (outcome === "swap"){
            message += Swap(userID, allyID);
            char = save.chars[userID];
        }
        else if (outcome === "gen"){
            var newchar = CharGen();
            newchar.name = char.name;
            newchar.weapon = char.weapon;
            save.chars[userID] = newchar;
            char = save.chars[userID];
            message += " You have been rebuilt. Generated from scratch.";
        }
        else if (outcome === "allygen"){
            var newally = CharGen();
            newally.name = save.chars[ally].name;
            newally.weapon = save.chars[ally].weapon;
            save.chars[ally] = newally;
            message += util.format(" %s has been completely remade. Somebody should tell them.", AllyDisplayName(ally));
        }
        else if (outcome !== ""){
            var parts = outcome.split(" ");
            var stat = parts[0];
            var amount = parseInt(parts[1]);
            if (stat === "title"){
                char.name += util.format(" \"%s\"", genParts.title[amount]);
                message += " You are given the title " + genParts.title[amount];
            }
            else if (stat === "stat"){
                var statIndex = randomInt.Get(0, genParts.stats.length - 1);
                var upgraded = genParts.stats[statIndex];
                var oldvalue = char.stats[upgraded];
                char.stats[upgraded] += amount;
                var direction = "increases";
                if (amount < 0){
                    direction = "decreases";
                }
                message += util.format(" Your %s %s from %d to %d.", upgraded, direction, oldvalue, char.stats[upgraded]);
            }
            else if (stat === "allyHP"){
                save.chars[ally].stats.HP += amount;
                message += util.format(" %s's HP changes by %d and is now %d.", AllyDisplayName(ally), amount, save.chars[ally].stats.HP);
                if (save.chars[ally].stats.HP < 1){
                    message += " They die.";
                    save.chars[ally].alive = false;
                    HandleAllyDeath(ally);
                }
            }
            else{
                if (!(stat in char.stats)){
                    char.stats[stat] = 0;
                }
                char.stats[stat] += amount;
                message += util.format(" Your %s changes by %d and is now %d.", stat, amount, char.stats[stat]);
                if (stat === "HP" && char.stats[stat] < 1){
                    message += " You die.";
                    char.alive = false;
                }
            }
        }
    }
    bot.sendMessage({
        to: channelID,
        message: message
    });

    SaveGame();
}

function HandleAllyDeath(userID){
    if (userID in save.events){
        delete save.events[userID];
    }
}

function Swap(userID, allyID){
    var temp = {};
    var char = save.chars[userID];
    var ally = save.chars[allyID];

    temp.race = char.race;
    temp.class = char.class;
    temp.story = char.story;
    temp.stats = char.stats;

    char.race = ally.race;
    char.class = ally.class;
    char.story = ally.story;
    char.stats = ally.stats;

    ally.race = temp.race;
    ally.class = temp.class;
    ally.story = temp.story;
    ally.stats = temp.stats;

    save.chars[userID] = char;
    save.chars[allyID] = ally;

    return util.format(" %s and %s have had their character sheets swapped.", char.name, ally.name);
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
        case "char": // Fallthrough
        case "showchar":
            if (userID in save.chars){
                bot.sendMessage({
                    to: channelID,
                    message: CharacterString(userID)
                });
            }
            break;
        case "showname":
            if (userID in save.chars){
                bot.sendMessage({
                    to: channelID,
                    message: BioString(userID)
                });
            }
            break;
        case "showweapon":
            if (userID in save.chars){
                bot.sendMessage({
                    to: channelID,
                    message: util.format("Your weapon is: %s", WeaponString(save.chars[userID].weapon))
                });
            }
            break;
        case "showstats":
            if (userID in save.chars){
                bot.sendMessage({
                    to: channelID,
                    message: StatString(save.chars[userID].stats)
                });
            }
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
        var rpgChan = channelID;
        if (save.channel){
            rpgChan = save.channel;
        }

        var time = save.chars[userID].time++;
        var chance = randomInt.Get(1, time);
        if (chance > save.chance){
            RunEvent(userID, rpgChan);
            save.chars[userID].time = 0;
        }
        SaveGame();
    }
}

exports.Commands = Commands;
exports.Update = Entry;
