let bot;

function getServerByChannel(channelID){
    for (let server of bot.guilds){
        for (let channel in server[1].channels){
            if (channel[0] === channelID){
                return server[1];
            }
        }
    }
}

function getMemberObject(userID, server) {
    console.log(server);
    for (let member of server.members){
        console.log("in loop");
        console.log(member);
        if (member[0] === userID){
            return member[1];
        }
    }
    return undefined;
}

// Gets Member object for a given user ID
function GetMember(client, userID, channelID="") {
    bot = client;
    if (channelID) {
        let currentServer = getServerByChannel(channelID);
        let member = getMemberObject(userID, currentServer);
        if (member) {
            return member;
        }
    }
    for (let server of bot.guilds){
        let memberObj = getMemberObject(userID, server[1]);
        if (memberObj) {
            return memberObj;
        }
    }

    return undefined;
}

exports.GetMember = GetMember;
