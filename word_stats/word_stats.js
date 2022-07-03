// Standard
const fs = require("fs");
const util = require("util");

// Discord client
let bot;

// filepaths
const GLOBAL_DICTIONARY = "./word_stats/global.json";
const USER_DICTIONARY = "./word_stats/user.json";

let GlobalDict;
let UserDict;

const BORING_WORDS = JSON.parse(fs.readFileSync("./word_stats/stop_words.json", "utf8"));

function GetGlobalDictionary(){
    if (GlobalDict){
        return GlobalDict;
    }
    if (!fs.existsSync(GLOBAL_DICTIONARY)){
        fs.writeFileSync(GLOBAL_DICTIONARY, "{}");
        GlobalDict = {};
        return GlobalDict;
    }
    GlobalDict = JSON.parse(fs.readFileSync(GLOBAL_DICTIONARY, "utf8"));
    return GlobalDict;
}

function WriteGlobalDictionary(){
    let dict = GetGlobalDictionary();
    let globalJson = JSON.stringify(dict, null, 4);
    fs.writeFileSync(GLOBAL_DICTIONARY, globalJson);
}

function GetUserDictionary(){
    if (UserDict){
        return UserDict;
    }
    if (!fs.existsSync(USER_DICTIONARY)){
        fs.writeFileSync(USER_DICTIONARY, "{}");
        UserDict = {};
        return UserDict;
    }
    UserDict = JSON.parse(fs.readFileSync(USER_DICTIONARY, "utf8"));
    return UserDict;
}

function WriteUserDictionary(){
    let dict = GetUserDictionary();
    let userJson = JSON.stringify(dict, null, 4);
    fs.writeFileSync(USER_DICTIONARY, userJson);
}

function ProcessMessage(message){
    let words = message.split(" ");
    let treated = [];
    for (let word of words){
        // Lower case the word
        word = word.toLowerCase();
        // Replace some punctuation
        word = word.replace(/[,.!?()[\]{}:;"]/g, "");

        treated.push(word);
    }
    return treated;
}

function UpdateWordsInDict(dict, words){
    for (let word of words){
        if (word in dict){
            dict[word]++;
        }
        else{
            dict[word] = 1;
        }
    }
}

function UpdateGlobal(words){
    let dictonary = GetGlobalDictionary();
    UpdateWordsInDict(dictonary, words);
}

function UpdateUser(userID, words){
    let dictionary = GetUserDictionary();
    if (!(userID in dictionary)){
        return;
    }
    let userLevel = dictionary[userID];
    UpdateWordsInDict(userLevel, words);
}

function OptIn(userID, channelID){
    let dictionary = GetUserDictionary();
    let message = "";
    if (userID in dictionary){
        message = "You have already opted in!";
    }
    else{
        dictionary[userID] = {};
        message = "You have successfully opted in to word counting!";
    }

    bot.createMessage(channelID, util.format("<@%s> %s", userID, message));
}

function OptOut(userID, channelID){
    let dictionary = GetUserDictionary();
    let message = "";
    if (userID in dictionary){
        delete dictionary[userID];
        message = "You have successfully opted out of word counting!";
    }
    else{
        message = "You gotta opt in first, in order to opt out!";
    }

    bot.createMessage(channelID, util.format("<@%s> %s", userID, message));
}

function GetTopFive(dictionary, interesting = false){
    // Create items array
    let items = Object.keys(dictionary).map(function(key) {
        return [key, dictionary[key]];
    });
  
    // Sort the array based on the second element
    items.sort(function(first, second) {
        return second[1] - first[1];
    });

    if (interesting){
        console.log(items);
        console.log(BORING_WORDS);
        items = items.filter(item => BORING_WORDS.indexOf(item[0]) === -1);
        console.log(items);
    }
    
    // Create a new array with only the first 5 items
    return items.slice(0, 5);
}

function TopWords(userID, channelID, interesting = false){
    let dictionary = GetGlobalDictionary();

    let top = GetTopFive(dictionary, interesting);

    let message = "Top 5 words used by everyone:\n";
    for (let word of top){
        message += util.format("- %s: %d uses\n", word[0], word[1]);
    }

    bot.createMessage(channelID, util.format("<@%s> %s", userID, message));
}

function UserTopWords(userID, channelID, interesting = false){
    let dictionary = GetUserDictionary();

    if (!(userID in dictionary)){
        bot.createMessage(channelID, util.format("<@%s> %s", userID, "You didn't opt in... I haven't been tracking your words."));
        return;
    }
    let userLevel = dictionary[userID];

    let top = GetTopFive(userLevel, interesting);

    let message = "Top 5 words used by you:\n";
    for (let word of top){
        message += util.format("- %s: %d uses\n", word[0], word[1]);
    }

    bot.createMessage(channelID, util.format("<@%s> %s", userID, message));
}

function Commands(client, userID, channelID, cmd){
    bot = client;

    switch(cmd){
    case "wordsoptin":
        OptIn(userID, channelID);
        break;
    case "wordsoptout":
        OptOut(userID, channelID);
        break;
    case "topwords":
        TopWords(userID, channelID);
        break;
    case "mytopwords":
        UserTopWords(userID, channelID);
        break;
    case "interestingwords":
        TopWords(userID, channelID, true);
        break;
    case "myinterestingwords":
        UserTopWords(userID, channelID, true);
        break;
    }
}

function UpdateWordStats(userID, message){
    let words = ProcessMessage(message);

    UpdateGlobal(words);

    UpdateUser(userID, words);
}

function WriteToFile(){
    WriteGlobalDictionary();
    WriteUserDictionary();
}

exports.Commands = Commands;
exports.Update = UpdateWordStats;
exports.Write = WriteToFile;
