const request = require("request");
const logger = require("winston");

// Local
const randomInt = require("../randomint");


// Reddit Functions
const subs = [
    "amiugly", "awesome", "aww", "beauty", "boastme", "FancyFollicles", "gonewild", "happy", "LadyBoners", "MakeupAddiction",
    "meirl", "me_irl", "Pareidolia", "PrequelMemes", "relationships", "RoastMe", "Tinder", "UpliftingNews"
];

function GetRedditComment(sub, callback) {
    let url = "http://old.reddit.com/r/" + sub + "/comments/.json?limit=50";
    logger.info(url);
    let comment = "<Insert reddit comment here>";

    const headers = {
        "User-Agent": "d-hickey/posbot",
    };

    request({uri: url, headers: headers}, function(error, response, body) {
        //console.log("error:", error); // Print the error if one occurred
        //console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
        //console.log("body:", body); // Print the HTML

        if (error){
            logger.error(error);
            return callback(comment);
        }

        let redditResponse = JSON.parse(body);
        let post = randomInt.Get(0, 49);

        comment = redditResponse.data.children[post].data.body;
        if (comment.length > 2000 || comment.indexOf("I am a bot") > -1) {
            return GetRedditComment(sub, callback);
        } else {
            logger.info(comment);
            return callback(comment);
        }

    });
}


function GetRandomRedditComment(callback){
    const subcount = subs.length;
    const subno = randomInt.Get(0, subcount - 1);
    const sub = subs[subno];
    GetRedditComment(sub, callback);
}


function GetRedditImage(sub, callback){
    let url = "https://old.reddit.com/r/" + sub + "/top/.json?t=month&limit=100";
    logger.info(url);
    let image = "<Oh I completely failed to get an image here>";

    const headers = {
        "User-Agent": "d-hickey/posbot",
    };

    request({uri: url, headers: headers}, function(error, response, body) {
        if (error){
            logger.error(error);
            return callback(image);
        }

        let redditResponse = JSON.parse(body);
        let post = randomInt.Get(0, redditResponse.data.children.length - 1);

        image = redditResponse.data.children[post].data.url;
        return callback(image);
    });
}

exports.GetRandomRedditComment = GetRandomRedditComment;
exports.GetRedditComment = GetRedditComment;
exports.GetRedditImage = GetRedditImage;
