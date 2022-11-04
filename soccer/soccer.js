// Standard
const fs = require("fs");
const util = require("util");

// Local
const randomInt = require("../randomint");

// Discord client
let bot;

// filepaths
const SETTINGS_FILE = "./soccer/soccer.json";

// Messages
const HelpMessage = "Alright listen up, because I'm only going to say this once (unless you use this command again). This is posbot's fantastic fantasy football world cup sweepstakes.\n" +
"~~You stake your bet by using \"!soccer pay <meme_link>\", then~~ you can pull a team using \"!soccer draw\". Entries are limited to 4 per person.\n" +
"If you want to withdraw ~~your bet~~, you can use \"!soccer pullout\". If you want to check your teams, you can use \"!soccer teams\".\n" +
"To record a result use \"!soccer record <team> <score> <team> <score>\" e.g. \"!soccer record ireland 3 england 1\" \n" +
"Other commands available: \"!soccer group <group_letter>\", \"!soccer team <team_name>\", \"!soccer amiwinning\"~~, \"!soccer amilosing\", \"!soccer prizes\"~~";

const BadInputResponse = [
    "Maybe you should try \"!soccer help\"",
    "Okay, but like what action? I'm not a mind reader you know!",
    "Listen here m80, I'm not here to play games. This is serious business! Tell me what you want to do or I'll assign Italy as one of your teams."
];
const PulloutResponse = [
    "We're sorry, but due to technical difficulties we were unable to withdraw your entries. Please wait 6 to 8 weeks and try again.",
    "Don't pull out, senpai! 🤤",
    "Unfortunately, we cannot seem to find you in our system. Are you sure you have entries with PosBot Inc?"
];

// Soccer vars
let SoccerSettings;
let Sweepstakes;

// Get Data functions
function GetSettings(){
    if (SoccerSettings){
        return SoccerSettings;
    }
    if (!fs.existsSync(SETTINGS_FILE)){
        fs.writeFileSync(SETTINGS_FILE, "{}");
        SoccerSettings = {};
        return SoccerSettings;
    }
    SoccerSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    return SoccerSettings;
}

function GetStakesPath(){
    GetSettings();
    const current = SoccerSettings.current;
    return  "./soccer/" + current;
}

function GetSweepstakes(){
    if (Sweepstakes){
        return Sweepstakes;
    }
    
    const currentPath = GetStakesPath();

    if (!fs.existsSync(currentPath)){
        fs.writeFileSync(currentPath, "{}");
        Sweepstakes = {};
        return Sweepstakes;
    }
    Sweepstakes = JSON.parse(fs.readFileSync(currentPath, "utf8"));
    return Sweepstakes;
}

function WriteSweepstakes(){
    let stakes = GetSweepstakes();
    let json = JSON.stringify(stakes, null, 4);
    const path = GetStakesPath();
    fs.writeFileSync(path, json);
}

function GetUserTeams(userID){
    let stakes = GetSweepstakes();

    if (!("players" in stakes)){
        stakes.players = {};
    }

    if (!(userID in stakes.players)){
        stakes.players[userID] = [];
    }

    return stakes.players[userID];
}

function GetAvailableTeams(){
    let stakes = GetSweepstakes();

    if (!("teams" in stakes)){
        stakes.teams = [];
    }

    return stakes.teams;
}

function IsGroupStage(){
    let stakes = GetSweepstakes();
    if (!("groupStage" in stakes)){
        return false;
    }
    return stakes.groupStage;
}

function GetGroups(){
    let stakes = GetSweepstakes();

    if (!("groups" in stakes)){
        stakes.groups = {};
    }

    return stakes.groups;
}

// Message Generators
function GetMessage (choices) {
    const choice = randomInt.Get(0, choices.length - 1);
    return choices[choice];
}

// Commands
function Draw(userID, channelID){
    let teams = GetUserTeams(userID);
    let message = "";
    if (teams.length == 4){
        message = "You cannot hold any more team!";
    }
    else{
        let available = GetAvailableTeams();
        if (available.length == 0){
            message = "Oh no we're all out of teams!";
        }
        else{
            const index = randomInt.Get(0, available.length - 1);
            teams.push(available[index]);
            message = util.format("You've drawn %s! Good luck!", available[index]);

            available.splice(index, 1);
            WriteSweepstakes();
            // TODO Add draw to settings
        }
    }

    bot.createMessage(channelID, util.format("<@%s> %s", userID, message));
}

function Teams(userID, channelID){
    let teams = GetUserTeams(userID);
    let message = util.format("Your teams: %s", teams.join(", "));

    bot.createMessage(channelID, util.format("<@%s> %s", userID, message));
}

function Record(userID, channelID, args){
    if (!ValidateResult(userID, channelID, args)){
        return;
    }

    if (IsGroupStage()){
        RecordGroupStage(args);
    }
    else{
        RecordKnockoutStage();
    }

    WriteSweepstakes();
    bot.createMessage(channelID, util.format("<@%s> Done!", userID));
}

function ValidateResult(userID, channelID, args){
    let message = "";

    if (args.length !== 4){
        message = "Not enough inputs. It's \"!soccer record <team> <score> <team> <score>\"";
    }
    else if (Number.isNaN(args[1]) || Number.isNaN(args[3])){
        message = "Scores gotta be numbers dingus!";
    }
    else{
        let groups = GetGroups();
        let team1 = false;
        let team2 = false;
        for (let group in groups){
            let teams = groups[group];
            for (let team of teams){
                if (team.name.toLowerCase() === args[0].toLowerCase()){
                    team1 = true;
                }
                else if (team.name.toLowerCase() === args[2].toLowerCase()){
                    team2 = true;
                }
            }
        }
        if (!team1 || !team2){
            message = "Trying to pull wool over the eyes of ol' posbot eh? At least one of these teams is a fake! Keep it up and we'll see what happens.";
        }
    }

    if (message !== ""){
        bot.createMessage(channelID, util.format("<@%s> %s", userID, message));
        return false;
    }
    return true;
}

function RecordGroupStage(args){
    let groups = GetGroups();
    for (let group in groups){
        let teams = groups[group];
        for (let team of teams){
            if (team.name.toLowerCase() === args[0].toLowerCase()){
                RecordGroupTeam(team, parseInt(args[1]), parseInt(args[3]));
            }
            else if (team.name.toLowerCase() === args[2].toLowerCase()){
                RecordGroupTeam(team, parseInt(args[3]), parseInt(args[1]));
            }
        }
    }
}

function RecordGroupTeam(team, score, against){
    team.gf += score;
    team.ga += against;
    if (score > against){
        team.won++;
        team.points += 3;
    }
    else if (against > score){
        team.lost ++;
    }
    else{
        team.draw++;
        team.points++;
    }
}

function RecordKnockoutStage(){
    //Todo
}

function Commands(client, userID, channelID, cmd, args){
    bot = client;

    if (cmd !== "soccer"){
        return;
    }

    if (args.length === 0){
        bot.createMessage(channelID, util.format("<@%s> %s", userID, GetMessage(BadInputResponse)));
        return;
    }

    const action = args[0];
    args.splice(0, 1);

    switch(action){
    case "draw":
        Draw(userID, channelID);
        break;
    case "teams":
        Teams(userID, channelID);
        break;
    case "help":
        bot.createMessage(channelID, util.format("<@%s> %s", userID, HelpMessage));
        break;
    case "pullout":
        bot.createMessage(channelID, util.format("<@%s> %s", userID, PulloutResponse));
        break;
    case "amiwinning":
        break;
    case "record":
        Record(userID, channelID, args);
        break;
    }
}

exports.Commands = Commands;
