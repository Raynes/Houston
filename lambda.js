var http = require('http');
var querystring = require('querystring');

exports.handler = function (event, context) {

    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.[unique-value-here]") {
             context.fail("Invalid Application ID");
         }
        */

        if (event.request.type === "LaunchRequest") {
        }  else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     }
                    );
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

function onIntent(intentRequest, session, callback) {
    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if ("SetColor" === intentName) {
        return setColor(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

function postToServer(path, data, cardTitle, callback) {
  var opts = {
    "hostname": "1450.ddns.net",
    "port": 8080,
    "method": "POST",
    "path": path,
    "headers": {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Accept': 'text/plain'
    }
  };

  var output = "";

  var req = http.request(opts, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');

    res.on('data', function (chunk) {
      console.log('BODY: ' + chunk);
      output += chunk;
    });

    res.on('end', function() {
      callback({}, buildSpeechletResponse(cardTitle, output));
    });
  });

  req.on('error', function(err) {
    console.log(err);
  });

  console.log(data);
  req.write(data);

  req.end();
}

function setColor(intent, session, callback) {
    var cardTitle = intent.name;
    var groupSlot = intent.slots.Target.value;
    var colorSlot = intent.slots.Color.value;
    var sessionAttributes = {};
    var postData = JSON.stringify({
        color: colorSlot,
        target: groupSlot
    });

    postToServer('/setcolor', postData, cardTitle, callback)
}

function buildSpeechletResponse(title, output) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "Houston - " + title,
            content: "Houston - " + output
        },
        shouldEndSession: true
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}
