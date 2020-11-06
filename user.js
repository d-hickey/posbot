var bot;

function getServerKeyByChannel(channelID){
    for (var serverKey in bot.servers){
        for (var id in bot.servers[serverKey].channels){
            if (channelID === id){
                return serverKey;
            }
        }
    }
}

function getMemberObject(userID, serverKey) {
    for (var memberID in bot.servers[serverKey].members){
        if (memberID === userID){
            return bot.servers[serverKey].members[memberID];
        }
    }
    return undefined;
}

// Gets Member object for a given user ID
function GetMember(client, userID, channelID="") {
    bot = client;
    if (channelID) {
        var currentServer = getServerKeyByChannel(channelID);
        var member = getMemberObject(userID, currentServer);
        if (member) {
            return member;
        }
    }
    for (var serverKey in bot.servers){
        var memberObj = getMemberObject(userID, serverKey);
        if (memberObj) {
            return memberObj;
        }
    }

    var fakemember = {};
    fakemember.nick = "Undefined User";
    return fakemember;
}

exports.GetMember = GetMember;
