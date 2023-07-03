// Standard
const fs = require("fs");
const util = require("util");

const logger = require("winston");

const DEFAULT_RESPONSE = "Welcome to burgers. Use !burg all to see full list of burgers. Use !burg todo to see burgers not eaten. " +
"Use !burg eaten to see the conquered burgers. Use !burg eater <name/id> to see a user's contributions. " +
"Use !burg info <restaurant> to get info on a particular culinary establishment. Use !burg at <location> to search for burgers by location. " +
"Use !burg score to see the burger leaderboard. Use !burg ate <restaurant> to record your visit to one of the entries. " +
"Use !burg unate <restaurant> to remove a recorded visit.";

// Discord client
let bot;

let burgers = JSON.parse(fs.readFileSync("./burgs/burgers.json", "utf8"));

function WriteBurgs() {
    let burgJson = JSON.stringify(burgers, null, 4);
    fs.writeFileSync("./burgs/burgers.json", burgJson);
}

function HasFailed(burger){
    return "failed" in burger && burger.failed;
}

function All() {
    let all = "";
    for (let burg of burgers.burgers) {
        let done = "-";
        if (burg.eaten.length > 0) {
            done = "+";
        }
        else if ("failed" in burg && burg.failed){
            done = "---";
        }
        let summary = util.format("%s %s. %s\n", done, burg.rank, burg.burger);

        all += summary;
    }
    let block = "```diff\n" + all + "```";
    return block;
}

function ToDo() {
    let todo = "";
    for (let burg of burgers.burgers) {
        if (burg.eaten.length === 0 && !HasFailed(burg)) {
            let summary = util.format("%s. %s - %s\n", burg.rank, burg.burger, burg.location);

            todo += summary;
        }
    }
    let block = "```" + todo + "```";
    return block;
}

function Done() {
    let done = "";
    for (let burg of burgers.burgers) {
        if (burg.eaten.length > 0) {
            let summary = util.format("%s. %s (%d)\n", burg.rank, burg.burger, burg.eaten.length);

            done += summary;
        }
    }
    let block = "```" + done + "```";
    return block;
}

function ByEater(name) {
    if (!name) {
        return "Please enter a username or ID";
    }
    let foundUser = {};
    for (let user of burgers.eaters) {
        if (user.name.toLowerCase().indexOf(name.toLowerCase()) > -1) {
            foundUser = user;
            break;
        }
        if (user.ID == name) {
            foundUser = user;
            break;
        }
    }
    if (IsEmpty(foundUser)) {
        return "No user found";
    }
    let done = [];
    for (let burg of burgers.burgers) {
        if (burg.eaten.indexOf(foundUser.ID) > -1) {
            done.push(burg.burger);
        }
    }
    let block = util.format("```%s has eaten %d burgs (%s)```", foundUser.name, done.length, done);
    return block;
}

function GetBurgerRestaurantByName(name) {
    let foundBurg = {};
    for (let burg of burgers.burgers) {
        if (burg.burger.toLowerCase() === name.toLowerCase()){
            return burg;
        }
        if (burg.burger.toLowerCase().indexOf(name.toLowerCase()) > -1) {
            if (IsEmpty(foundBurg)) {
                foundBurg = burg;
            } else {
                return {};
            }
        }
    }
    return foundBurg
}

function ByJoint(joint) {
    if (!joint) {
        return "Please enter a location";
    }
    let foundBurg = GetBurgerRestaurantByName(joint)
    if (IsEmpty(foundBurg)) {
        return "Burg joint not found or input too vague";
    }

    let eaten = "";
    if (foundBurg.eaten.length > 0) {
        eaten = "\nWhomst did eat here: " + EatenToUsers(foundBurg.eaten);
    }

    let info = util.format("```Name: %s\nLocation: %s\nRank: %s%s```", foundBurg.burger, foundBurg.location, foundBurg.rank, eaten);
    return info;
}

function ByLocation(location) {
    if (!location) {
        return "Please enter a location";
    }

    let locations = "";
    for (let burg of burgers.burgers) {
        if (burg.location.toLowerCase().indexOf(location.toLowerCase()) > -1) {
            let summary = util.format("%s. %s - %s\n", burg.rank, burg.burger, burg.location);
            locations += summary;
        }
    }
    if (locations === ""){
        return "Sorry, no burgers at " + location;
    }
    let block = "```" + locations + "```";
    return block;
}

function Scoreboard() {
    let scores = {};
    for (let user of burgers.eaters) {
        let count = GetBurgerCount(user.ID);
        if (!(count in scores)) {
            scores[count] = [];
        }
        scores[count].push(user.name);
    }

    let board = "Leaderboard\n```";
    let position = 1;
    let keys = Object.keys(scores);
    keys.sort((a, b) => b - a);

    for (let key of keys) {
        for (let name of scores[key]) {
            board = board + util.format("%d. %s - %d burgs\n", position, name, key);
        }
        position += scores[key].length;
    }
    board = board + "```";
    return board;
}

function Eaten(username, userID, consumed) {
    if (!consumed) {
        return "Please enter a location";
    }

    let foundBurg = GetBurgerRestaurantByName(consumed)

    if (IsEmpty(foundBurg)) {
        return "Burg joint not found or input too vague";
    }

    foundBurg.eaten.push(userID);

    if (!UserInPlay(userID)) {
        let newUser = {};
        newUser.name = username;
        newUser.ID = userID;
        burgers.eaters.push(newUser);
    }

    WriteBurgs();

    return "Successfully updated entry for " + foundBurg.burger;
}


function Uneaten(username, userID, consumed) {
    if (!UserInPlay(userID)){
        return "You've never even eaten a burger"
    }
    if (!consumed) {
        return "Please enter a location";
    }
    let foundBurg = GetBurgerRestaurantByName(consumed)

    if (IsEmpty(foundBurg)) {
        return "Burg joint not found or input too vague";
    }

    const index = foundBurg.eaten.indexOf(userID);
    if (index > -1) {
        foundBurg.eaten.splice(index, 1)
    }
    else {
        return "You haven't eaten " + foundBurg.burger;
    }

    WriteBurgs();

    return "Successfully updated entry for " + foundBurg.burger;
}


function Failed(failed) {
    if (!failed) {
        return "Please enter a location";
    }
    let foundBurg = {};
    for (let burg of burgers.burgers) {
        if (burg.burger.toLowerCase() === failed.toLowerCase()){
            foundBurg = burg;
            break;
        }
        if (burg.burger.toLowerCase().indexOf(failed.toLowerCase()) > -1) {
            if (IsEmpty(foundBurg)) {
                foundBurg = burg;
            } else {
                return "Input argument too vague";
            }
        }
    }
    if (IsEmpty(foundBurg)) {
        return "Burg joint not found";
    }

    foundBurg.failed = true;

    WriteBurgs();

    return "Successfully updated unsucces for " + foundBurg.burger;
}

function UserInPlay(userID) {
    for (let user of burgers.eaters) {
        if (user.ID == userID) {
            return true;
        }
    }
    return false;
}

function GetBurgerCount(userID) {
    let count = 0;
    for (let burg of burgers.burgers) {
        if (burg.eaten.indexOf(userID) > -1) {
            count++;
        }
    }
    return count;
}

function EatenToUsers(eaten) {
    let users = [];
    for (let userID of eaten) {
        for (let user of burgers.eaters) {
            logger.info(user.ID + " " + userID);
            if (user.ID == userID) {
                users.push(user.name);
                continue;
            }
        }
    }
    return users.join(", ");
}

function IsEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function Commands(client, user, userID, channelID, cmd, args) {
    bot = client;

    const allowed = ["burg", "burgs", "burger", "burgers"];

    if (allowed.indexOf(cmd) === -1){
        return;
    }

    if (args.length === 0){
        bot.createMessage(channelID, util.format("<@%s> %s", userID, DEFAULT_RESPONSE));
        return;
    }

    const action = args[0];
    args.splice(0, 1);

    switch (action) {
    case "burgers": // Fallthrough
    case "burg":{
        let message = 
        bot.createMessage(channelID, message);
        break;
    }
    case "check": // Fallthrough
    case "progress": // Fallthrough
    case "checklist":
    case "all":
        bot.createMessage(channelID, All());
        break;
    case "todo":
        bot.createMessage(channelID, ToDo());
        break;
    case "done-list": // Fallthrough
    case "eaten":
        bot.createMessage(channelID, Done());
        break;
    case "by": // Fallthrough
    case "eater":
        bot.createMessage(channelID, ByEater(args[0]));
        break;
    case "where": // Fallthrough
    case "at":
    case "location":
        bot.createMessage(channelID,ByLocation(args.join(" ")));
        break;
    case "joint": // Fallthrough
    case "info":
        bot.createMessage(channelID, ByJoint(args.join(" ")));
        break;
    case "score": // Fallthough
    case "leaderboard":
        bot.createMessage(channelID, Scoreboard());
        break;
    case "done": // Fallthrough
    case "ate":
        bot.createMessage(channelID, Eaten(user, userID, args.join(" ")));
        break;
    case "undone": // Fallthrough
    case "unate":
        bot.createMessage(channelID, Uneaten(user, userID, args.join(" ")));
        break;
    case "failed":
    case "fail":
        bot.createMessage(channelID, Failed(args.join(" ")));
        break;
    default:
        bot.createMessage(channelID, util.format("<@%s> %s", userID, DEFAULT_RESPONSE));
        break;
    }
}

exports.Commands = Commands;
