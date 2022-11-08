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

function WriteSettings(){
    let settings = GetSettings();
    let json = JSON.stringify(settings, null, 4);
    fs.writeFileSync(SETTINGS_FILE, json);
}

function GetDrewToday(){
    let settings = GetSettings();
    if (!("drew_today" in settings)){
        settings.drew_today = [];
    }

    return settings.drew_today;
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

function GetPlayers(){
    let stakes = GetSweepstakes();

    if (!("players" in stakes)){
        stakes.players = {};
    }

    return stakes.players;
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

function GetPlaces(){
    let stakes = GetSweepstakes();

    if (!("places" in stakes)){
        stakes.places = {};
    }

    return stakes.places;
}

// Helpers
function ArrayContainsIgnoreCase(array, item){
    return array.some(element =>{
        return element.toLowerCase() === item.toLowerCase();
    });
}

function DoesTeamExist(team){
    const available = GetAvailableTeams();
    if (ArrayContainsIgnoreCase(available, team)){
        return true;
    }

    const players = GetPlayers();
    for (let id in players){
        if (ArrayContainsIgnoreCase(players[id], team)){
            return true;
        }
    }

    return false;
}

// Message Generators
function GetMessage (choices) {
    const choice = randomInt.Get(0, choices.length - 1);
    return choices[choice];
}

// Commands
function Draw(userID, channelID){
    let drew = GetDrewToday();
    if (drew.indexOf(userID) !== -1){
        bot.createMessage(channelID, util.format("<@%s> Limiting to one draw per day for added tension.", userID));
        return;
    }

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
            
            drew.push(userID);
            WriteSettings();
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

    let settings = GetSettings();
    
    if ("no_update_players" in settings && settings.no_update_players.indexOf(userID) !== -1){
        message = "Yeah, I just don't trust you with this command.";
    }
    else if (args.length !== 4){
        message = "Not enough inputs. It's \"!soccer record <team> <score> <team> <score>\"";
    }
    else if (Number.isNaN(parseInt(args[1])) || Number.isNaN(parseInt(args[3]))){
        message = "Scores gotta be numbers dingus!";
    }
    else if (!DoesTeamExist(args[0]) || !DoesTeamExist(args[2])){
        message = "Trying to pull wool over the eyes of ol' posbot eh? At least one of these teams is a fake! Keep it up and we'll see what happens.";
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

function Team(userID, channelID, args){
    if (args.length === 0){
        bot.createMessage(channelID, util.format("<@%s> Specify a team please", userID));
        return;
    }
    if (!DoesTeamExist(args[0])){
        bot.createMessage(channelID, util.format("<@%s> That is not a team in this tournament", userID));
        return;
    }

    if (IsGroupStage()){
        const groups = GetGroups();
        for (let group in groups){
            let teams = groups[group];
            for (let team of teams){
                if (team.name.toLowerCase() === args[0].toLowerCase()){
                    bot.createMessage(channelID, util.format("<@%s> %s are currently in Group %s", userID, team.name, group));
                    return;
                }
            }
        }
        bot.createMessage(channelID, util.format("<@%s> Your team exists but I couldn't find it in any group. Strange. This should be unreachable code!", userID));
        return;
    }
    else{
        //Todo
    }
}

function AmIWinning(userID, channelID){
    let teams = GetUserTeams(userID);
    if (teams.length === 0){
        bot.createMessage(channelID, util.format("<@%s> No 😒", userID));
        return;
    }

    const places = GetPlaces();
    let message = "Your teams:\n";

    for (let team of teams){
        let teamPlace = "";

        for (let place in places){
            if (places[place].indexOf(team) !== -1){
                teamPlace = place;
                break;
            }
        }

        if (teamPlace === ""){
            teamPlace = "Still in the running!";
        }

        message += util.format("%s - %s\n", team, teamPlace);
    }

    bot.createMessage(channelID, util.format("<@%s> message", userID, message));
}

function GroupInfo(userID, channelID, group){
    if (!group){
        bot.createMessage(channelID, util.format("<@%s> You gotta at least specify a group, sweet child.", userID));
        return;
    }

    group = group.toUpperCase();

    let groups = GetGroups();

    if (!(group in groups)){
        bot.createMessage(channelID, util.format("<@%s> That's not a real group, is it?", userID));
        return;
    }

    let teams = groups[group];
    let message = util.format("Table for Group %s:\n", group);
    message += "```Country             W  D  L  GF  GA  Pts\n";

    let rows = [];
    for (let team of teams){
        let name = BuildCell(team.name, 19);
        let wins = BuildCell(team.won, 2);
        let draws = BuildCell(team.draw, 2);
        let losses = BuildCell(team.lost, 2);
        let gf = BuildCell(team.gf, 3);
        let ga = BuildCell(team.ga, 3);
        let points = BuildCell(team.points, 3);
        let row = util.format("%s %s %s %s %s %s %s", name, wins, draws, losses, gf, ga, points).trim();
        rows.push(row);
    }

    rows.sort(RowSorter);

    message += rows.join("\n");

    message += "```";

    bot.createMessage(channelID, util.format("<@%s> message", userID, message));
}

function RowSorter(a, b){
    const aPoints = ExtractPoints(a);
    const bPoints = ExtractPoints(b);
    if ( aPoints <bPoints ){
        return 1;
    }
    if ( aPoints > bPoints ){
        return -1;
    }
    return 0;
}

function ExtractPoints(row){
    const cells = row.split(" ");
    const points = cells[cells.length - 1];
    return parseInt(points);
}

function BuildCell(item, totalSpace){
    let stringified = item.toString();
    let spaces = totalSpace - stringified.length;
    return util.format("%s%s", stringified, " ".repeat(spaces));
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
    case "list":
    case "check":
    case "teams":
        Teams(userID, channelID);
        break;
    case "team":
        Team(userID, channelID, args);
        break;
    case "help":
        bot.createMessage(channelID, util.format("<@%s> %s", userID, HelpMessage));
        break;
    case "pullout":
        bot.createMessage(channelID, util.format("<@%s> %s", userID, GetMessage(PulloutResponse)));
        break;
    case "amiwinning":
        AmIWinning(userID, channelID);
        break;
    case "group":
        GroupInfo(userID, channelID, args[0]);
        break;
    case "record":
        Record(userID, channelID, args);
        break;
    }
}

function ClearDrewToday(){
    let settings = GetSettings();
    settings.drew_today = [];
    WriteSettings();
    return settings;
}

exports.Commands = Commands;
exports.ClearDrew = ClearDrewToday;
