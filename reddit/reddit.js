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
    const temp = "Reddit won't let me find you a compliment so you'll have to do it yourself, please go here and find a comment " + url;
    return callback(temp); 
    let comment = "<Insert reddit comment here>";

    const headers = {
        "User-Agent": "d-hickey/posbot",
    };

    (async () => {
        try {
            const response = await fetch(url, { headers: headers });
            const body = await response.text();

            if (!response.ok) {
                logger.error("Reddit API error: " + response.status);
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
        } catch (error) {
            logger.error(error);
            return callback(comment);
        }
    })();
}


function GetRandomRedditComment(callback){
    const subcount = subs.length;
    const subno = randomInt.Get(0, subcount - 1);
    const sub = subs[subno];
    GetRedditComment(sub, callback);
}


function GetRedditImage(sub, callback){
    return callback("reddit doesn't want me, a positivity bot, anonymously scraping their website so i got no image for ya");
    let url = "https://old.reddit.com/r/" + sub + "/top/.json?t=month&limit=100";
    logger.info(url);
    let image = "<Oh I completely failed to get an image here>";

    const headers = {
        "User-Agent": "d-hickey/posbot",
    };

    (async () => {
        try {
            const response = await fetch(url, { headers: headers });
            const body = await response.text();

            if (!response.ok) {
                logger.error("Reddit API error: " + response.status);
                return callback(image);
            }

            let redditResponse = JSON.parse(body);
            let post = randomInt.Get(0, redditResponse.data.children.length - 1);

            image = redditResponse.data.children[post].data.url;
            return callback(image);
        } catch (error) {
            logger.error(error);
            return callback(image);
        }
    })();
}

exports.GetRandomRedditComment = GetRandomRedditComment;
exports.GetRedditComment = GetRedditComment;
exports.GetRedditImage = GetRedditImage;
