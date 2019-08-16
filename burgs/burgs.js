// Standard
var fs = require("fs");
var util = require("util");

var logger = require("winston");

// Discord client
var bot;

var burgers = JSON.parse(fs.readFileSync('./burgs/burgers.json', 'utf8'));

function WriteBurgs() {
    var burgJson = JSON.stringify(burgers, null, 4);
    fs.writeFileSync('./burgs/burgers.json', burgJson);
}

function All() {
    var all = "";
    for (var burg of burgers.burgers) {
        var done = "-";
        if (burg.eaten.length > 0) {
            done = "+";
        }
        var summary = util.format("%s %s. %s\n", done, burg.rank, burg.burger);

        all += summary;
    }
    var block = "```diff\n" + all + "```";
    return block;
}

function ToDo() {
    var todo = "";
    for (var burg of burgers.burgers) {
        if (burg.eaten.length === 0) {
            var summary = util.format("%s. %s - %s\n", burg.rank, burg.burger, burg.location);

            todo += summary;
        }
    }
    var block = "```" + todo + "```";
    return block;
}

function Done() {
    var done = "";
    for (var burg of burgers.burgers) {
        if (burg.eaten.length > 0) {
            var summary = util.format("%s. %s (%d)\n", burg.rank, burg.burger, burg.eaten.length);

            done += summary;
        }
    }
    var block = "```" + done + "```";
    return block;
}

function ByEater(name) {
    if (!name) {
        return "Please enter a username or ID";
    }
    var foundUser = {};
    for (var user of burgers.eaters) {
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
    var done = [];
    for (var burg of burgers.burgers) {
        if (burg.eaten.indexOf(foundUser.ID) > -1) {
            done.push(burg.burger);
        }
    }
    var block = util.format("```%s has eaten %d burgs (%s)```", foundUser.name, done.length, done);
    return block;
}

function ByJoint(joint) {
    if (!joint) {
        return "Please enter a location";
    }
    var foundBurg = {};
    for (var burg of burgers.burgers) {
        if (burg.burger.toLowerCase().indexOf(joint.toLowerCase()) > -1) {
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

    var eaten = "";
    if (foundBurg.eaten.length > 0) {
        eaten = "\nWhomst did eat here: " + EatenToUsers(foundBurg.eaten);
    }

    var info = util.format("```Name: %s\nLocation: %s\nRank: %s%s```", foundBurg.burger, foundBurg.location, foundBurg.rank, eaten);
    return info;
}

function ByLocation(location) {
    if (!location) {
        return "Please enter a location";
    }

    var locations = "";
    for (var burg of burgers.burgers) {
        if (burg.location.toLowerCase().indexOf(location.toLowerCase()) > -1) {
            var summary = util.format("%s. %s - %s\n", burg.rank, burg.burger, burg.location);
            locations += summary;
        }
    }
    if (locations === ""){
        return "Sorry, no burgers at " + location;
    }
    var block = "```" + locations + "```";
    return block;
}

function Scoreboard() {
    var scores = {};
    for (var user of burgers.eaters) {
        var count = GetBurgerCount(user.ID);
        if (!(count in scores)) {
            scores[count] = [];
        }
        scores[count].push(user.name);
    }

    var board = "Leaderboard\n```";
    var position = 1;
    var keys = Object.keys(scores);
    keys.sort((a, b) => b - a);

    for (var key of keys) {
        for (var name of scores[key]) {
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
    var foundBurg = {};
    for (var burg of burgers.burgers) {
        if (burg.burger.toLowerCase().indexOf(consumed.toLowerCase()) > -1) {
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

    foundBurg.eaten.push(userID);

    if (!UserInPlay(userID)) {
        newUser = {};
        newUser.name = username;
        newUser.ID = userID;
        burgers.eaters.push(newUser);
    }

    WriteBurgs();

    return "Successfully updated entry for " + foundBurg.burger;
}

function UserInPlay(userID) {
    for (var user of burgers.eaters) {
        if (user.ID == userID) {
            return true;
        }
    }
    return false;
}

function GetBurgerCount(userID) {
    var count = 0;
    for (var burg of burgers.burgers) {
        if (burg.eaten.indexOf(userID) > -1) {
            count++;
        }
    }
    return count;
}

function EatenToUsers(eaten) {
    users = [];
    for (var userID of eaten) {
        for (var user of burgers.eaters) {
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

    switch (cmd) {
        case "burgers": // Fallthrough
        case "burg":
            var message = "Welcome to burgers. Use !burg-checklist to see full list of burgers. Use !burg-todo to see burgers not eaten. " +
                "Use !burg-eaten to see the conquered burgers. Use !burg-eater <name/id> to see a user's contributions. " +
                "Use !burg-info <restaurant> to get info on a particular culinary establishment. Use !burg-at <location> to search for burgers by location. " +
                "Use !burg-score to see the burger leaderboard. Use !burg-ate <restaurant> to record your visit to one of the entries.";
            bot.sendMessage({
                    to: channelID,
                    message: message
                },
                function(err) {
                    logger.info(err);
                });
            break;
        case "burg-check": // Fallthrough
        case "burg-progress": // Fallthrough
        case "burg-checklist":
            bot.sendMessage({
                    to: channelID,
                    message: All()
                },
                function(err) {
                    logger.info(err);
                });
            break;
        case "burg-todo":
            bot.sendMessage({
                    to: channelID,
                    message: ToDo()
                },
                function(err) {
                    logger.info(err);
                });
            break;
        case "burg-done-list": // Fallthrough
        case "burg-eaten":
            bot.sendMessage({
                    to: channelID,
                    message: Done()
                },
                function(err) {
                    logger.info(err);
                });
            break;
        case "burg-by": // Fallthrough
        case "burg-eater":
            bot.sendMessage({
                    to: channelID,
                    message: ByEater(args[0])
                },
                function(err) {
                    logger.info(err);
                });
            break;
        case "burg-where": // Fallthrough
        case "burg-at":
            bot.sendMessage({
                    to: channelID,
                    message: ByLocation(args.join(" "))
                },
                function(err) {
                    logger.info(err);
                });
            break;
        case "burg-joint": // Fallthrough
        case "burg-info":
            bot.sendMessage({
                    to: channelID,
                    message: ByJoint(args.join(" "))
                },
                function(err) {
                    logger.info(err);
                });
            break;
        case "burg-score": // Fallthough
        case "burg-leaderboard":
            bot.sendMessage({
                    to: channelID,
                    message: Scoreboard()
                },
                function(err) {
                    logger.info(err);
                });
            break;
        case "burg-done": // Fallthrough
        case "burg-ate":
            bot.sendMessage({
                    to: channelID,
                    message: Eaten(user, userID, args.join(" "))
                },
                function(err) {
                    logger.info(err);
                });
            break;
    }
}

exports.Commands = Commands;