const express = require('express')
const app = express()
const port = 3000

const starfests = require('./StarFestInfo.json')

app.get('/api/starfests', (req, res) => {
  console.log("request received");
  // Send the starfests data as JSON
  res.json(starfests)
})

app.put('/api/starfests/teamCount', (req, res) => {

  console.log("PUT request received");
  // Retrieve the team name and team count from the request body
  const teamName = req.body.teamName;
  const teamCount = req.body.teamCount;

  // Find the starfest with the corresponding team name
  const starfest = starfests.find(starfest => starfest.team1Name === teamName || starfest.team2Name === teamName);

  // If the starfest exists, update the team count for the corresponding team
  if (starfest) {
    if (starfest.team1Name === teamName) {
      starfest.team1Count = teamCount;
    } else if (starfest.team2Name === teamName) {
      starfest.team2Count = teamCount;
    }

    // Return the updated starfest as JSON
    res.json(starfest);
  } else {
    // If the starfest doesn't exist, return a 404 error
    res.status(404).send('Starfest not found');
  }
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`)
})
