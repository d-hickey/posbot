
// Gets Member object for a given user ID
function GetMember(bot, userID) {
    for (var serverKey in bot.servers){
        for (var memberID in bot.servers[serverKey].members){
            if (memberID === userID){
                return bot.servers[serverKey].members[memberID];
            }
        }
    }

    var fakemember = {};
    fakemember.nick = "Undefined User";
    return fakemember;
}

exports.GetMember = GetMember;