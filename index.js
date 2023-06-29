const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));

const apiKeys = config.apiKey;

const starfestsFile = './StarFestInfo.json';

app.use(express.json());

// Middleware to check the API key
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey && apiKey === apiKeys) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

// Route to get the list of starfests
app.get('/api/starfests', requireApiKey, async (req, res) => {
  const starfests = await readStarfestsFromFile();

  res.json(starfests);
});

// Route to get the current date and time
app.get('/api/currentDateTime', requireApiKey, (req, res) => {
  const dateTime = new Date().toISOString();
  res.send(dateTime);
});

// Route to increment the team1 count
app.put('/starfests/increment-team1-count', requireApiKey, async (req, res) => {
  const starfests = await readStarfestsFromFile();

  const currentStarfest = findCurrentStarfest(starfests);

  if (!currentStarfest) {
    res.status(400).send('No ongoing starfest found');
    return;
  }

  currentStarfest.team1Count++;

  await writeStarfestsToFile(starfests);

  res.status(200).send('Team 1 count incremented successfully');
});

// Route to increment the team2 count
app.put('/starfests/increment-team2-count', requireApiKey, async (req, res) => {
  const starfests = await readStarfestsFromFile();

  const currentStarfest = findCurrentStarfest(starfests);

  if (!currentStarfest) {
    res.status(400).send('No ongoing starfest found');
    return;
  }

  currentStarfest.team2Count++;

  await writeStarfestsToFile(starfests);

  res.status(200).send('Team 2 count incremented successfully');
});

// Helper function to read the starfests data from the file
async function readStarfestsFromFile() {
  const data = await fs.readFileSync(starfestsFile, 'utf8');
  return JSON.parse(data);
}

// Helper function to find the current ongoing starfest
function findCurrentStarfest(starfests) {
  const now = new Date();

  for (const starfest of starfests.starfests) {
    const startTime = new Date(starfest.startTime);
    const endTime = new Date(starfest.endTime);

    if (now >= startTime && now <= endTime) {
      return starfest;
    }
  }

  return null;
}

// Helper function to write the starfests data to the file
async function writeStarfestsToFile(starfests) {
  const data = JSON.stringify(starfests, null, 2);
  await fs.writeFileSync(starfestsFile, data);
}

app.listen(process.env.PORT || port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
