const util = require("util");

const randomInt = require("../randomint");

// Discord client
let bot;

const improvements = [
    "Sometimes withholding the truth, whether it be with a close friend or family member, can hold you back from having a genuine relationship. Have the conversation.",
    "There's nothing wrong with feeling good about yourself, and you can always use that positive energy to help others as well. Compliment yourself, and others.",
    "Little grooming habits do wonders for your overall look. It also shows you've gone the extra mile to take care of yourself, which reinforces the idea that you'll do the same in other facets of your life and for those you care most about.",
    "While it's not always a bad thing to cherish the past, it can be damaging when its an anchor keeping you from moving forward. Sometimes you need to let go, physically and emotionally.",
    "Wear clothes that fit your style. You should feel comfortable and confident in the clothes you're in.",
    "If you can't deal with something emotionally, clean up instead. A tidy living space can heal the mind.",
    "If tidying up works for Marie Kondo, it could work for you too.",
    "Try cooking. Something new or interesting, or something simple. Cook for somebody. Taking the time to prepare a thoughtful meal for someone you love goes a long way, and adds a personal touch to a meal.",
    "Establishing good skincare routine is important. Besides looking fresh and clean, you also feel it, giving you an extra boost of confidence to conquer the day knowing your skin is flawless.",
    "It's important to have values, but practicing acceptance of others is just as crucial. Keeping an open mind allows us to grow closer as a culture, even though we each bring something different to the table.",
    "Love yourself! This is much easier said than done. Loving yourself is a journey. Happiness doesn't come from trying to impress others, but from being your own best self and doing things for _you_.",
    "Drinking enough water will keep your skin clear and crops flourishing. Stay hydrated!",
    "Try yoga.",
    "Try _hot_ yoga."
];

function Improve(userID, channelID){
    let index = randomInt.Get(0, improvements.length-1);
    
    bot.createMessage(channelID, util.format("<@%s> %s", userID, improvements[index]));
}

function Commands(client, userID, channelID, cmd){
    bot = client;

    switch(cmd){
    case "improve":
        Improve(userID, channelID);
        break;
    }
}

exports.Commands = Commands;