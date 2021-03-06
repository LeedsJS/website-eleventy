const Twitter = require("twitter");
const moment = require("moment-timezone");

const client = new Twitter({
  consumer_key: process.env.twitter_consumer_key,
  consumer_secret: process.env.twitter_consumer_secret,
  access_token_key: process.env.twitter_access_token_key,
  access_token_secret: process.env.twitter_access_token_secret,
});

async function announce(eventData) {
  console.log("Sending announce tweet");
  const speakers = getSpeakers(eventData.talks);
  const message = `We've just announced our next event: ${eventData.title}

Join us on ${moment(eventData.date).format("Do MMM")} to hear from ${speakers}!

More details: https://leedsjs.com/events/${eventData.id}

#LeedsDevs`;

  await sendTweet(message);
  return;
}

async function ticket(eventData) {
  console.log("Sending ticket tweet");
  const speakers = getSpeakers(eventData.talks);

  const message = `We've just released the tickets for our next event: ${
    eventData.title
  }

Join us on ${moment(eventData.date).format("Do MMM")} to hear from ${speakers}!

More details and tickets: https://leedsjs.com/events/${eventData.id}

#LeedsDevs`;

  await sendTweet(message);
  return;
}

async function ticketRemind(eventData) {
  console.log("Sending ticketRemind tweet");
  const speakers = getSpeakers(eventData.talks);

  const message = `A few days ago we released the tickets for our next event: ${
    eventData.title
  }

Join us on ${moment(eventData.date).format("Do MMM")} to hear from ${speakers}!

More details and tickets: https://leedsjs.com/events/${eventData.id}

#LeedsDevs`;

  await sendTweet(message);
  return;
}

async function dayBefore(eventData) {
  console.log("Sending dayBefore tweet");
  const speakers = getSpeakers(eventData.talks);

  const message = `Our next event is tomorrow: ${eventData.title}

Join us from ${eventData.start_time} to hear from ${speakers}!

More details${
    eventData.is_remote ? "" : " and tickets"
  }: https://leedsjs.com/events/${eventData.id}

#LeedsDevs `;
  await sendTweet(message);
  return;
}

async function dayAfter(eventData) {
  console.log("Sending dayAfter tweet");
  const speakers = getSpeakers(eventData.talks);

  const sponsors = getSponsors(eventData.sponsors);

  const part1 = `Thanks to everyone who joined us last night!

Huge thanks to ${speakers} for their talks!`;

  const part2 = `And thank you to our sponsors ${sponsors}

We'll announce our next event soon!

#LeedsDevs`;

  const message = `${part1}
        
${part2}`;

  if (message.length > 280) {
    await sendTweet([part1, part2]);
  } else {
    await sendTweet(message);
  }
  return;
}

async function comms(id, content) {
  const message = `${content}

Read more: https://leedsjs.com/email/${id}

#LeedsDevs`;

  await sendTweet(message);
  return;
}

async function sendTweet(tweet, replyTo) {
  let currentTweet = Array.isArray(tweet) ? tweet.shift() : tweet;

  if (replyTo) {
    currentTweet = `@leedsjs ${currentTweet}`;
  }

  await client
    .post("statuses/update", {
      status: currentTweet,
      in_reply_to_status_id: replyTo,
    })
    .catch((error) => {
      return console.log(error);
    });

  if (Array.isArray(tweet) && tweet.length > 0) {
    await postTweet(tweet, postedTweet.id_str);
    return;
  }

  return;
}

function getSpeakers(talks) {
  return talks
    .reduce((acc, talk) => {
      acc.push(...talk.speaker);
      return acc;
    }, [])
    .map((speaker) => {
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
}

function getSponsors(sponsors) {
  return sponsors
    .map((sponsor) => {
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
}

module.exports = {
  announce,
  ticket,
  ticketRemind,
  dayBefore,
  dayAfter,
  comms,
};
