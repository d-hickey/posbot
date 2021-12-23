// Standard
const fs = require("fs");
const util = require("util");

// Local
const randomInt = require("../randomint");

// Discord client
let bot;

const parts = JSON.parse(fs.readFileSync("./horoscope/horoscope.json", "utf8"));
const birthdays = JSON.parse(fs.readFileSync("bdays.json", "utf8"));

const readings = JSON.parse(fs.readFileSync("./horoscope/readings.json", "utf8"));

function SaveReadings(){
    let readingsJson = JSON.stringify(readings, null, 4);
    fs.writeFileSync("./horoscope/readings.json", readingsJson);
}


function MonthToNumber (month){
    switch (month) {
    case "Jan":
        return 1;
    case "Feb":
        return 2;
    case "Mar":
        return 3;
    case "Apr":
        return 4;
    case "May":
        return 5;
    case "Jun":
        return 6;
    case "Jul":
        return 7;
    case "Aug":
        return 8;
    case "Sep":
        return 9;
    case "Oct":
        return 10;
    case "Nov":
        return 11;
    case "Dec":
        return 12;
    default:
        return -1;
    }
}


function FindSign(day, month) {
    month--;

    const days = [21, 20, 21, 21, 22, 22, 23, 24, 24, 24, 23, 22];
    const signs = ["Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn"];
    if (month == 0 && day <= 20) {
        month = 11;
    }
    else if (day < days[month]){
        month--;
    }
    return signs[month];
}


function GetSign(userID) {
    for (let birthday in birthdays) {
        if (birthday === "today" || birthdays[birthday] != userID){
            continue;
        }

        let dateParts = birthday.split(" ");
        let day = parseInt(dateParts[1]);
        let month = MonthToNumber(dateParts[0]);

        return FindSign(day, month);
    }
    return "";
}


function GetPart(name) {
    let index = randomInt.Get(0, parts[name].length - 1);
    return parts[name][index];
}


function GetMoonsign() {
    if (readings.moonsign) {
        return readings.moonsign;
    }

    let moonsign = GetPart("moonsign");
    readings.moonsign = moonsign;
    return moonsign;
}


function IncludePart(chance) {
    let roll = randomInt.Get(1, 100);
    return roll <= chance;
}


function GetDate() {
    let date_ob = new Date();

    // current date
    // adjust 0 before single digit date
    let date = ("0" + date_ob.getDate()).slice(-2);

    // current month
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    return `${date}/${month}`;
}


function Horoscope(userID, channelID){
    let sign = GetSign(userID);
    if (sign == ""){
        return;
    }

    let today = new Date().toDateString();
    if (!(readings.today) || readings.today != today) {
        readings.today = today;
        readings.moonsign = "";
        readings.signs = {};
    }

    if (readings.signs[sign]){
        bot.createMessage(channelID, util.format("<@%s> %s", userID, readings.signs[sign]));
        return;
    }

    let header = `**${sign}** - ${GetDate()}\n`;
    let horoscope = "";

    let replacements = {};

    // Moon
    if (IncludePart(50)) {
        let moon = GetPart("moon");
        let moonsign = GetMoonsign();

        horoscope += moon + " ";
        replacements["<moonsign>"] = moonsign;
    }

    // Sign Compliment
    if (IncludePart(20)) {
        let compliment = GetPart("compliment");

        horoscope += compliment + " ";
        replacements["<sign>"] = sign;
    }

    // Setup
    if (IncludePart(90)) {
        let setup = GetPart("setup");
        horoscope += setup + " ";

        let wit = GetPart("with");
        let plan = GetPart("plan");

        replacements["<with>"] = wit;
        replacements["<plan>"] = plan;
    }

    // Modifier
    if (IncludePart(70)) {
        let mod = GetPart("modifier");
        horoscope += mod + " ";

        let situation = GetPart("situation");

        replacements["<situation>"] = situation;
    }

    // Result
    if (IncludePart(70)) {
        let result = GetPart("result");
        horoscope += result + " ";

        let action = GetPart("action");
        let person = GetPart("person");

        replacements["<action>"] = action;
        replacements["<person>"] = person;
    }

    // Advice
    if (IncludePart(80)) {
        let advice = GetPart("advice");
        horoscope += advice + " ";
    }

    horoscope = horoscope.replace(/<\w+>/g, function(placeholder) {
        return replacements[placeholder] || placeholder;
    });

    horoscope = header + horoscope;

    readings.signs[sign] = horoscope;
    SaveReadings();
    
    bot.createMessage(channelID, util.format("<@%s> %s", userID, horoscope));
}


function Commands(client, userID, channelID, cmd){
    bot = client;

    switch(cmd){
    case "horo": // Fallthrough
    case "horoscope":
        Horoscope(userID, channelID);
        break;
    }
}

exports.Commands = Commands;
