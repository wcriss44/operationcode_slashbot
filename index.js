/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ______    ______    ______   __  __    __    ______
 /\  == \  /\  __ \  /\__  _\ /\ \/ /   /\ \  /\__  _\
 \ \  __<  \ \ \/\ \ \/_/\ \/ \ \  _"-. \ \ \ \/_/\ \/
 \ \_____\ \ \_____\   \ \_\  \ \_\ \_\ \ \_\   \ \_\
 \/_____/  \/_____/    \/_/   \/_/\/_/  \/_/    \/_/


 This is a sample Slack Button application that provides a custom
 Slash command.

 This bot demonstrates many of the core features of Botkit:

 *
 * Authenticate users with Slack using OAuth
 * Receive messages using the slash_command event
 * Reply to Slash command both publicly and privately

 # RUN THE BOT:

 Create a Slack app. Make sure to configure at least one Slash command!

 -> https://api.slack.com/applications/new

 Run your bot from the command line:

 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js

 Note: you can test your oauth authentication locally, but to use Slash commands
 in Slack, the app must be hosted at a publicly reachable IP or host.


 # EXTEND THE BOT:

 Botkit is has many features for building cool and useful bots!

 Read all about it here:

 -> http://howdy.ai/botkit

 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');

/* load all environment variables from script .env */
require('env2')('.env');

/* Airtable Setup */
var Airtable = require('airtable');
var base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE);

/* Grab authentication info from env vars */
if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

var controller = Botkit.slackbot(config).configureSlackApp(
    {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands'],
    }
);

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});


//
// Slack slash commands, edit from here down
//


controller.on('slash_command', function (slashCommand, message) {

    switch (message.command) {
        case "/echo": //handle the `/echo` slash command. We might have others assigned to this app too!
            // The rules are simple: If there is no text following the command, treat it as though they had requested "help"
            // Otherwise just echo back to them what they sent us.

            // but first, let's make sure the token matches!
            if (message.token !== process.env.VERIFICATION_TOKEN) {
                console.log('Bad token', message.token);
                return; //just ignore it.
            }

            // if no text was supplied, treat it as a help command
            if (message.text === "" || message.text === "help") {
                slashCommand.replyPrivate(message,
                    "I echo back what you tell me. " +
                    "Try typing `/echo hello` to see.");
                return;
            }

            // If we made it here, just echo what the user typed back at them
            //TODO You do it!
            slashCommand.replyPrivate(message, "1", function() {
                slashCommand.replyPrivate(message, "2").then(slashCommand.replyPrivate(message, "3"));
            });

            break;

        /* Meetup Events */
        case "/oc": //handle the `\oc` command. This will build out into events
            if (message.token !== process.env.VERIFICATION_TOKEN) {
                console.log('Bad token', message.token);
                return;
            }
            // return all events from the Events airtable
            if (message.text == 'events'){
                let events = [];
                new Promise( ( resolve, reject ) => {
                    base('Events').select({
                        view: 'Main View'
                    }).firstPage(function(err, records) {
                        if (err) { console.error(err); reject( err ); }

                        records.forEach(function(record) {
                            if (record.get('Notes') === undefined){
                                console.log('Notes: undefined');
                            } else {
                                events.push(record.get('Name') + ': ' + record.get('Notes') + ', ' + record.get('Channel'));
                            }
                            
                        });

                        resolve( events );
                    });
                }).then( events => slashCommand.replyPublic(message, '*OC Events:*\n' + events.join("\n\n")));
            }

            break;

        /* example: /mentees <language> */
        // TODO: handle casing to reduce burden on correct syntax
        // TODO: Create standard function to build queries
        case "/mentees": 
            if (message.token !== process.env.VERIFICATION_TOKEN) {
                console.log('Bad token', message.token);
                return;
            }
            // return all events from the Events airtable
            if (message.text){
                let mentees = [];
                let languageFilter = message.text;
                new Promise( ( resolve, reject ) => {
                    base('Mentees').select({
                        view: 'Main View',
                        filterByFormula: `SEARCH("${languageFilter}", {Language}) >= 0`
                    }).firstPage(function(err, records) {
                        if (err) { console.error(err); reject( err ); }

                        records.forEach(function(record) {
                            mentees.push('@' + record.get('Slack User'));
                            
                        });

                        resolve( mentees );
                    });
                }).then( mentees => slashCommand.replyPublic(message, '*Mentees requesting ' +languageFilter+ ':*\n' + mentees.join("\n")));
            }

            break;


        /* example: /mentors <language> */
        case "/mentors": 
            if (message.token !== process.env.VERIFICATION_TOKEN) {
                console.log('Bad token', message.token);
                return;
            }
            // return all events from the Events airtable
            if (message.text){
                let mentors = [];
                let languageFilter = message.text;
                new Promise( ( resolve, reject ) => {
                    base('Mentors').select({
                        view: 'Main View',
                        // filterByFormula: `{Skillsets} = "${languageFilter}"`
                        filterByFormula: `SEARCH("${languageFilter}", {Skillsets}) >= 0`
                    }).firstPage(function(err, records) {
                        if (err) { console.error(err); reject( err ); }

                        records.forEach(function(record) {
                            mentors.push('@' + record.get('Slack Name'));
                            
                        });

                        resolve( mentors );
                    });
                }).then( mentors => slashCommand.replyPublic(message, '*Mentors for ' +languageFilter+ ':*\n' + mentors.join("\n")));
            }

            break;

        default:
            slashCommand.replyPublic(message, "I'm afraid I don't know how to " + message.command + " yet.");

    }

});

