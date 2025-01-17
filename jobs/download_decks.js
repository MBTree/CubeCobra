/* eslint-disable no-await-in-loop */
// run with: node --max-old-space-size=8192 populate_analytics.js
// will oom without the added tag

// Load Environment Variables
require('dotenv').config();

const mongoose = require('mongoose');

const AWS = require('aws-sdk');
const Deck = require('../models/deck');
const carddb = require('../serverjs/cards');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const batchSize = 10000;

const processDeck = (deck) => {
  const main = [];
  const side = [];

  try {
    if (deck.seats[0] && deck.seats[0].deck) {
      for (const row of deck.seats[0].deck) {
        for (const col of row) {
          for (const cardIndex of col) {
            const card = deck.cards[cardIndex];
            if (card && card.cardID) {
              main.push(card.cardID);
            }
          }
        }
      }
    }

    if (deck.seats[0] && deck.seats[0].sideboard) {
      for (const row of deck.seats[0].deck) {
        for (const col of row) {
          for (const cardIndex of col) {
            const card = deck.cards[cardIndex];
            if (card && card.cardID) {
              side.push(card.cardID);
            }
          }
        }
      }
    }
  } catch (e) {
    console.log(`Error processing deck ${deck._id}: ${e}`);
  }

  return { main, side };
};

try {
  (async () => {
    await carddb.initializeCardDb();
    await mongoose.connect(process.env.MONGODB_URL);

    // process all deck objects
    console.log('Started');
    const count = await Deck.countDocuments();
    console.log(`Counted ${count} documents`);
    const cursor = Deck.find().lean().cursor();

    for (let i = 0; i < count; i += batchSize) {
      const decks = [];
      for (let j = 0; j < batchSize; j++) {
        if (i + j < count) {
          const deck = await cursor.next(); // eslint-disable-line no-await-in-loop
          if (deck) {
            decks.push(processDeck(deck));
          }
        }
      }
      const params = {
        Bucket: 'cubecobra', // pass your bucket name
        Key: `deck_exports/${i / batchSize}.json`, // file will be saved as testBucket/contacts.csv
        Body: JSON.stringify(decks),
      };
      await s3.upload(params).promise();
      console.log(`Finished: ${Math.min(count, i + batchSize)} of ${count} decks`);
    }
    await mongoose.disconnect();

    const params = {
      Bucket: 'cubecobra',
      Key: `deck_exports/manifest.json`,
      Body: JSON.stringify({ date_exported: new Date() }),
    };
    await s3.upload(params).promise();

    console.log('done');
    process.exit();
  })();
} catch (err) {
  console.error(err);
  process.exit();
}
