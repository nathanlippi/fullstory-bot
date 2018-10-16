var debug = require('debug')('botkit:slash_command');
var string = require('extract-data-from-text')
var superagent = require('superagent');

module.exports = function(controller) {
    controller.on('slash_command',function(bot,message) {
        var email = string.emails(message.text)[0];

        if(!email) {
            return bot.replyPublic(message,
                "The `/fullstory <email>` command requires an email address.");
        }

        getLatestRecording(email, function(err, recordingList) {
            if(err) {
                var msg = "We're having trouble retrieving FullStory recordings for " + email + " :(.";

                console.error(msg, err);

                return bot.replyPrivate(message, msg);
            }

            if(!recordingList.length) {
                return bot.replyPrivate(message,
                    email + " does not have any associated FullStory recordings :(.");
            }

            var recording_url = recordingList[0].url;
            bot.replyPublic(message,
                "`/fullstory " + email + "` latest user recordings:" + `\n${recording_url}`);
        });
    });
}

function getLatestRecording(email, callback) {
    superagent.get("https://www.fullstory.com/api/v1/sessions?email=" + encodeURI(email))
        .set('Content-Type', "application/json")
        // Ultimately, this should not be passed like this because it
        // would be configurable in a general Slackbot app
        .set('Authorization', 'Basic ' + process.env.fullstoryAPIKey)
        .end((err, res) => {
            if(err) {
                console.error("Problem getting latest recording: ", err);

                return callback(err);
            }

            var ret = [];

            for(var ii = 0;ii<res.body.length;ii++) {
                ret.push({
                    url: res.body[ii].FsUrl,
                    createdAt: res.body[ii].CreatedTime
                });
            }

            return callback(null, ret);
        });
}
