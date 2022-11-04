// Standard
const fs = require("fs");
const util = require("util");

// Local
const randomInt = require("../randomint");

// Discord client
let bot;

// filepaths
const SETTINGS_FILE = "./soccer/soccer.json";

// Soccer vars
let SoccerSettings;
let Sweepstakes;

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
            console.log(teams);
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

function Commands(client, userID, channelID, cmd, args){
    bot = client;

    switch(cmd){
    case "draw":
        Draw(userID, channelID);
        break;
    case "teams":
        Teams(userID, channelID);
        break;
    }
}

exports.Commands = Commands;
