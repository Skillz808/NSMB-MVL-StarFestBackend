const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');

const starfestsFile = './StarFestInfo.json';

app.use(express.json());

app.get('/api/starfests', (req, res) => {
  console.log("request received");
  // Read the starfests data from the file
  fs.readFile(starfestsFile, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
      return;
    }

    // Parse the JSON data from the file and send it as the response
    res.json(JSON.parse(data));
  });
});

app.put('/starfests/increment-team1-count', (req, res) => {
  fs.readFile(starfestsFile, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
      return;
    }

    // Parse the JSON data from the file
    const starfests = JSON.parse(data);

    // Find the current ongoing starfest
    const currentStarfest = starfests.starfests.find(starfest => {
      const now = new Date();
      const startTime = new Date(starfest.startTime);
      const endTime = new Date(starfest.endTime);
      return now >= startTime && now <= endTime;
    });

    if (!currentStarfest) {
      res.status(400).send('No ongoing starfest found');
      return;
    }

    // Increment the team1Count property of the current ongoing starfest
    currentStarfest.team1Count++;

    // Save the updated data to the file
    fs.writeFile(starfestsFile, JSON.stringify(starfests), (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
        return;
      }

      // Send a success response
      res.status(200).send('Team 1 count incremented successfully');
    });
  });
});

app.put('/starfests/increment-team2-count', (req, res) => {
  fs.readFile(starfestsFile, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
      return;
    }

    // Parse the JSON data from the file
    const starfests = JSON.parse(data);

    // Find the current ongoing starfest
    const currentStarfest = starfests.starfests.find(starfest => {
      const now = new Date();
      const startTime = new Date(starfest.startTime);
      const endTime = new Date(starfest.endTime);
      return now >= startTime && now <= endTime;
    });

    if (!currentStarfest) {
      res.status(400).send('No ongoing starfest found');
      return;
    }

    // Increment the team2Count property of the current ongoing starfest
    currentStarfest.team2Count++;

    // Save the updated data to the file
    fs.writeFile(starfestsFile, JSON.stringify(starfests), (err) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal server error');
        return;
      }

      // Send a success response
      res.status(200).send('Team 2 count incremented successfully');
    });
  });
});
app.listen(process.env.PORT || port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
