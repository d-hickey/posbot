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

function GetLimit(){
    let settings = GetSettings();
    if (!("limit" in settings)){
        return 4;
    }
    return settings.limit;
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

function GetKnockout(){
    let stakes = GetSweepstakes();

    if (!("knockout" in stakes)){
        stakes.knockout = {};
    }

    return stakes.knockout;
}

function GetResults(){
    let stakes = GetSweepstakes();

    if (!("results" in stakes)){
        stakes.results = [];
    }

    return stakes.results;
}

function GetNextMatch(teamName){
    if (IsGroupStage()){
        return [];
    }
    let knockout = GetKnockout();
    for (let match in knockout){
        if (ArrayContainsIgnoreCase(knockout[match], teamName) && !ArrayContainsIgnoreCase(knockout[match], "played")){
            return ResolveMatchReferences(knockout[match]);
        }
    }
    return [];
}

function NextMatchString(teamName){
    let next = GetNextMatch(teamName);

    if (next.length === 0){
        return util.format(
            "We're in the knockout stages, and %s hasn't placed, but also has no upcoming match. Something went wrong?", 
            teamName,
        );
    }
    return util.format("Knockout stages, next match: %s vs %s", next[0], next[1]);
}

function GetTeamPositionInGroup(teamName){
    teamName = teamName.replace("_", " ").toLowerCase();
    const groups = GetGroups();
    for (let group in groups){
        let teams = groups[group];
        teams.sort(GroupSorter);
        let position = 0;
        for (let team of teams){
            if (team.name.toLowerCase() === teamName){
                return util.format("%s are currently %s in Group %s",team.name, ordinals[position], group);
            }
            position++;
        }
    }
    return "";
}

function GetTeamsKnockoutMatchIndex(teamNameA, teamNameB){
    teamNameA = teamNameA.replace("_", " ").toLowerCase();
    teamNameB = teamNameB.replace("_", " ").toLowerCase();

    let knockout = GetKnockout();
    for (let match in knockout){
        if (
            ArrayContainsIgnoreCase(knockout[match], teamNameA) && 
            ArrayContainsIgnoreCase(knockout[match], teamNameB) && 
            !ArrayContainsIgnoreCase(knockout[match], "played")
        ){
            return match;
        }
    }
    return "-1";
}

// Helpers
const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function ArrayContainsIgnoreCase(array, item){
    return array.some(element =>{
        return element.toLowerCase() === item.toLowerCase();
    });
}

function DoesTeamExist(team){
    team = team.replace("_", " ");
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

function ResolveMatchReferences(match){
    let resolved = [];
    let knockout = GetKnockout();
    for (let team of match){
        if (team.indexOf("-") !== -1){
            const matchNumber = team.split("-")[0];
            let reference = ResolveMatchReferences(knockout[matchNumber]);
            resolved.push(util.format("(Winner of %s vs %s)", reference[0], reference[1]));
        }
        else{
            resolved.push(team);
        }
    }
    return resolved;
}

function IsDuplicateResult(a, b){
    if (a[0].toLowerCase() === b[0].toLowerCase()){
        return (
            a[1] === b[1] &&
            a[2].toLowerCase() === b[2].toLowerCase() &&
            a[3] === b[3]
        );
    }
    if (a[0].toLowerCase() === b[2].toLowerCase()){
        return (
            a[1] === b[3] &&
            a[2].toLowerCase() === b[0].toLowerCase() &&
            a[3] === b[1]
        );
    }
    return false;
}

function ReplaceCode(array, code, replacement){
    let index = array.indexOf(code);
    if (index !== -1){
        array[index] = replacement;
    }
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
    let limit = GetLimit();
    if (teams.length == limit){
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
        RecordKnockoutStage(args);
    }

    let results = GetResults();
    results.push(args);

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
    else{
        if (IsGroupStage()){
            let results = GetResults();
            for (let result of results){
                if (IsDuplicateResult(result, args)){
                    message = "I already have this result, thanks!";
                }
                break;
            }
        }
        else{
            let knockoutIndex = GetTeamsKnockoutMatchIndex(args[0], args[2]);
            if (knockoutIndex == "-1"){
                message = "I don't have that match in my schedule";
            }
            else if (args[1] == args[3]){
                message = "Knockout matches can't end in a draw";
            }
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
    let team1 = args[0].replace("_", " ").toLowerCase();
    let team2 = args[2].replace("_", " ").toLowerCase();
    for (let group in groups){
        let teams = groups[group];
        for (let team of teams){
            if (team.name.toLowerCase() === team1){
                RecordGroupTeam(team, parseInt(args[1]), parseInt(args[3]));
            }
            else if (team.name.toLowerCase() === team2){
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

function RecordKnockoutStage(args){
    let knockout = GetKnockout();
    let knockoutIndex = GetTeamsKnockoutMatchIndex(args[0], args[2]);

    let winner, loser;
    if (parseInt(args[1]) > parseInt(args[3])){
        winner = args[0].replace("_", " ").toLowerCase();
        loser = args[2];
    }
    else{
        winner = args[2].replace("_", " ").toLowerCase();
        loser = args[0];
    }
    
    let match = knockout[knockoutIndex];
    if (match[0].toLowerCase() === winner){
        winner = match[0];
        loser = match[1];
    }
    else if (match[1].toLowerCase() === winner){
        winner = match[1];
        loser = match[0];
    }

    match.push("played");

    const winnerCode = knockoutIndex + "-1";
    const loserCode = knockoutIndex + "-2";

    for (let matchIndex in knockout){
        ReplaceCode(knockout[matchIndex], winnerCode, winner);
        ReplaceCode(knockout[matchIndex], loserCode, loser);
    }

    let places = GetPlaces();
    for (let position in places){
        ReplaceCode(places[position], winnerCode, winner);
        ReplaceCode(places[position], loserCode, loser);
    }
}

function Team(userID, channelID, args){
    if (args.length === 0){
        bot.createMessage(channelID, util.format("<@%s> Specify a team please", userID));
        return;
    }
    let teamName = args[0].replace("_", " ").toLowerCase();
    if (!DoesTeamExist(teamName)){
        bot.createMessage(channelID, util.format("<@%s> That is not a team in this tournament", userID));
        return;
    }

    if (IsGroupStage()){
        let position = GetTeamPositionInGroup(teamName);
        if (position === ""){
            bot.createMessage(
                channelID,
                util.format("<@%s> Your team exists but I couldn't find it in any group. Strange. This should be unreachable code!", userID)
            );
        }
        else{
            bot.createMessage(
                channelID,
                util.format("<@%s> %s", userID, position)
            );
        }
        return;
    }
    const places = GetPlaces();

    for (let place in places){
        if (ArrayContainsIgnoreCase(places[place], teamName)){
            bot.createMessage(channelID, util.format("<@%s> %s placed %s", userID, args[0], place));
            return;
        }
    }

    let next = NextMatchString(teamName);
    bot.createMessage(
        channelID,
        util.format("<@%s> %s", userID, next)
    );
}

function AmIWinning(userID, channelID){
    let teams = GetUserTeams(userID);
    if (teams.length === 0){
        bot.createMessage(channelID, util.format("<@%s> No 😒", userID));
        return;
    }

    const places = GetPlaces();
    let message = "Your teams:\n";

    for (let teamName of teams){
        let teamPlace = "";

        for (let place in places){
            if (places[place].indexOf(teamName) !== -1){
                teamPlace = place;
                break;
            }
        }

        if (teamPlace === ""){
            teamPlace = "Still in the running!";
            if (IsGroupStage()){
                teamPlace = GetTeamPositionInGroup(teamName);
            }
            else{
                teamPlace = NextMatchString(teamName);
            }
        }

        message += util.format("%s - %s\n", teamName, teamPlace);
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
    teams.sort(GroupSorter);

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

    message += rows.join("\n");

    message += "```";

    bot.createMessage(channelID, util.format("<@%s> message", userID, message));
}

function GroupSorter(teamA, teamB){
    if (teamA.points < teamB.points){
        return 1;
    }
    if (teamA.points > teamB.points){
        return -1;
    }
    // Same points, resolve by goal diff
    const aGD = teamA.gf - teamA.ga;
    const bGD = teamB.gf - teamB.ga;
    if (aGD < bGD){
        return 1;
    }
    if (aGD > bGD){
        return -1;
    }
    return 0;
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

function UpdateLimit(){
    let settings = GetSettings();
    if (!("newLimit" in settings)){
        return;
    }

    settings.limit = settings.newLimit;
    delete settings.newLimit;
    WriteSettings();
    return settings;
}

exports.Commands = Commands;
exports.ClearDrew = ClearDrewToday;
exports.UpdateLimit = UpdateLimit;
