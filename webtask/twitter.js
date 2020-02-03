const Twitter = require("twitter");
const https = require("https");
const moment = require("moment-timezone");

module.exports = function(context, cb) {
  const client = new Twitter({
    consumer_key: context.secrets.twitter_consumer_key,
    consumer_secret: context.secrets.twitter_consumer_secret,
    access_token_key: context.secrets.twitter_access_token_key,
    access_token_secret: context.secrets.twitter_access_token_secret
  });

  makeRequest(
    {
      host: "leedsjs.com",
      path: "/automation/next-event.json",
      method: "GET"
    },
    null,
    eventData => {
      eventData = JSON.parse(eventData);

      if (!eventData.id) {
        return commsMessages(client, cb);
      }

      const today = moment().tz("Europe/London");
      const tomorrow = moment()
        .tz("Europe/London")
        .add(1, "days");
      const yesterday = moment()
        .tz("Europe/London")
        .subtract(1, "days");

      const event = moment(eventData.date);

      const speakers = eventData.talks
        .reduce((acc, talk) => {
          acc.push(...talk.speaker);
          return acc;
        }, [])
        .map(speaker => {
          return speaker.twitter ? `@${speaker.twitter}` : speaker.name;
        })
        .reduce((acc, val, i, arr) => {
          if (acc.length === 0) {
            return val;
          } else if (i === arr.length - 1) {
            return `${acc} and ${val}`;
          } else {
            return `${acc}, ${val}`;
          }
        }, "");

      const sponsors = eventData.sponsors
        .map(sponsor => {
          return sponsor.twitter ? `@${sponsor.twitter}` : sponsor.name;
        })
        .reduce((acc, val, i, arr) => {
          if (acc.length === 0) {
            return val;
          } else if (i === arr.length - 1) {
            return `${acc} and ${val}`;
          } else {
            return `${acc}, ${val}`;
          }
        }, "");

      let message;
      if (today.isSame(eventData.announce_date, "day")) {
        console.log(`It's announcement day!`);
        message = `We've just announced our next event: ${eventData.title}

Join us on ${event.format("Do MMM")} to hear from ${speakers}!

More details: https://leedsjs.com/events/${eventData.id}

#LeedsDevs`;
      } else if (today.isSame(eventData.ticket_date, "day")) {
        console.log(`It's ticket day!`);
        message = `We've just released the tickets for our next event: ${
          eventData.title
        }

Join us on ${event.format("Do MMM")} to hear from ${speakers}!

More details and tickets: https://leedsjs.com/events/${eventData.id}

#LeedsDevs `;
      } else if (
        today.subtract(2, "days").isSame(eventData.ticket_date, "day")
      ) {
        console.log(`It's ticket reminder day!`);
        message = `A few days ago we released the tickets for our next event: ${
          eventData.title
        }

Join us on ${event.format("Do MMM")} to hear from ${speakers}!

More details and tickets: https://leedsjs.com/events/${eventData.id}

#LeedsDevs`;
      } else if (tomorrow.isSame(eventData.date, "day")) {
        console.log(`It's the day before the event!`);
        message = `Our next event is tomorrow: ${eventData.title}

Join us from ${eventData.start_time} to hear from ${speakers}!

More details and tickets: https://leedsjs.com/events/${eventData.id}

#LeedsDevs `;
      } else if (yesterday.isSame(eventData.date, "day")) {
        console.log(`It's the day after the event!`);
        const part1 = `Thanks to everyone who joined us last night!

Huge thanks to ${speakers} for their talks!`;
        const part2 = `And thank you to our sponsors ${sponsors}

We'll announce our next event soon!

#LeedsDevs`;
        message = `${part1}
        
${part2}`;

        if (message.length > 280) {
          message = [part1, part2];
        }
      }

      if (message) {
        console.log(message);
        postTweet(client, message, undefined, cb);
      } else {
        commsMessages(client, cb);
      }
    }
  );
};

function commsMessages(client, cb) {
  makeRequest(
    {
      host: "leedsjs.com",
      path: "/automation/next-comm.json",
      method: "GET"
    },
    null,
    commData => {
      commData = JSON.parse(commData);

      if (!commData.id) {
        return cb(null, {});
      }

      const today = moment().tz("Europe/London");

      if (today.isSame(commData.date, "day")) {
        const message = `${commData.tweet}

Read more: https://leedsjs.com/email/${commData.id}`;

        client.post("statuses/update", { status: message }, function(
          error,
          tweet,
          response
        ) {
          if (error) {
            console.log(error);
          }
          console.log(tweet);
          cb(null, {});
        });
      } else {
        console.log("no tweet today");
        return cb(null, {});
      }
    }
  );
}

function postTweet(client, tweet, replyTo, cb) {
  let currentTweet = Array.isArray(tweet) ? tweet.shift() : tweet;

  if (replyTo) {
    currentTweet = `@leedsjs ${currentTweet}`;
  }

  client.post(
    "statuses/update",
    { status: currentTweet, in_reply_to_status_id: replyTo },
    function(error, postedTweet, response) {
      if (error) {
        return console.log(error);
      }
      if (Array.isArray(tweet) && tweet.length > 0) {
        postTweet(client, tweet, postedTweet.id_str, cb);
      } else {
        cb(null, {});
      }
    }
  );
}

function makeRequest(options, body, cb) {
  const req = https.request(options, res => {
    let data = "";
    res.setEncoding("utf8");
    res.on("data", chunk => {
      data += chunk;
    });
    res.on("end", () => {
      cb(data);
    });
  });

  if (body) {
    req.write(JSON.stringify(body));
  }

  req.end();
}
