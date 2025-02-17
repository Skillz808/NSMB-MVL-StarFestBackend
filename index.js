const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Data storage paths
const DATA_DIR = './data';
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
const EVENT_STATS_FILE = path.join(DATA_DIR, 'event_stats.json');
const EVENTS_CONFIG_FILE = path.join(DATA_DIR, 'events-config.json');

// In-memory data
let matches = [];
let eventStats = {};
let eventsConfig = null;
let currentEvent = null;

// Initialize data storage
async function initializeDataStorage() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Load events configuration
        try {
            eventsConfig = JSON.parse(await fs.readFile(EVENTS_CONFIG_FILE, 'utf8'));
            currentEvent = eventsConfig.events.find(event => event.active);
            if (!currentEvent) {
                console.warn('No active event found in configuration');
            }
        } catch (e) {
            console.error('Error loading events configuration:', e);
            process.exit(1); // Exit if we can't load event configuration
        }

        // Load matches
        try {
            matches = JSON.parse(await fs.readFile(MATCHES_FILE, 'utf8'));
        } catch (e) {
            matches = [];
            await fs.writeFile(MATCHES_FILE, '[]');
        }

        // Load event stats
        try {
            eventStats = JSON.parse(await fs.readFile(EVENT_STATS_FILE, 'utf8'));
        } catch (e) {
            eventStats = {};
            await fs.writeFile(EVENT_STATS_FILE, '{}');
        }

        // Initialize stats for current event if needed
        if (currentEvent && !eventStats[currentEvent.id]) {
            eventStats[currentEvent.id] = {
                teams: {},
                playerStats: {}
            };

            // Initialize team stats
            Object.entries(currentEvent.teams).forEach(([teamId, team]) => {
                eventStats[currentEvent.id].teams[teamId] = {
                    name: team.name,
                    points: 0,
                    totalStars: 0,
                    matchesWon: 0
                };
            });

            await saveData();
        }

        console.log('Data storage initialized');
    } catch (error) {
        console.error('Error initializing data storage:', error);
    }
}

// Save data to files
async function saveData() {
    try {
        await fs.writeFile(MATCHES_FILE, JSON.stringify(matches, null, 2));
        await fs.writeFile(EVENT_STATS_FILE, JSON.stringify(eventStats, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

app.post('/match-results', async (req, res) => {
    if (!currentEvent) {
        return res.status(400).json({
            status: 'error',
            message: 'No active event'
        });
    }

    try {
        const matchData = req.body;
        console.log('Received match results:', matchData);

        // Store the complete match data
        matches.push({
            ...matchData,
            eventId: currentEvent.id,
            timestamp: new Date().toISOString()
        });

        const eventId = currentEvent.id;
        const eventData = eventStats[eventId];

        if (matchData.isTeamMode) {
            // Update team statistics
            matchData.teams.forEach(team => {
                const teamId = team.teamId;
                if (eventData.teams[teamId]) {
                    eventData.teams[teamId].totalStars += team.score;
                    if (team.rank === 1) {
                        eventData.teams[teamId].matchesWon++;
                        eventData.teams[teamId].points += 3;
                    } else if (team.rank === 2) {
                        eventData.teams[teamId].points += 2;
                    } else if (team.rank === 3) {
                        eventData.teams[teamId].points += 1;
                    }
                }
            });
        }

        // Update player statistics
        matchData.players.forEach(player => {
            const playerId = player.playerId;
            const teamId = player.team;
            
            if (!eventData.playerStats[playerId]) {
                eventData.playerStats[playerId] = {
                    nickname: player.nickname,
                    teams: {}
                };
            }

            if (!eventData.playerStats[playerId].teams[teamId]) {
                eventData.playerStats[playerId].teams[teamId] = {
                    matchesPlayed: 0,
                    totalStars: 0,
                    wins: 0,
                    topThree: 0
                };
            }

            const stats = eventData.playerStats[playerId].teams[teamId];
            stats.matchesPlayed++;
            stats.totalStars += player.stars;

            if (matchData.isTeamMode) {
                if (player.rank === 1) {
                    stats.wins++;
                    stats.topThree++;
                } else if (player.rank <= 3) {
                    stats.topThree++;
                }
            } else {
                if (player.rank === 1) {
                    stats.wins++;
                    stats.topThree++;
                } else if (player.rank <= 3) {
                    stats.topThree++;
                }
            }

            eventData.playerStats[playerId].nickname = player.nickname;
        });

        await saveData();

        res.json({
            status: 'success',
            message: 'Match results recorded',
            currentEvent: {
                info: currentEvent,
                stats: eventStats[eventId]
            }
        });
    } catch (error) {
        console.error('Error processing match results:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get current event information and statistics
app.get('/current-event', (req, res) => {
    if (!currentEvent) {
        return res.status(404).json({
            status: 'error',
            message: 'No active event'
        });
    }

    res.json({
        info: currentEvent,
        stats: eventStats[currentEvent.id]
    });
});

// Get specific player's current event statistics
app.get('/current-event/player/:playerId', (req, res) => {
    if (!currentEvent) {
        return res.status(404).json({
            status: 'error',
            message: 'No active event'
        });
    }

    const playerId = req.params.playerId;
    const playerStats = eventStats[currentEvent.id].playerStats[playerId];
    
    if (playerStats) {
        res.json(playerStats);
    } else {
        res.status(404).json({
            status: 'error',
            message: 'Player not found in current event'
        });
    }
});

// Get team statistics for current event
app.get('/current-event/team/:teamId', (req, res) => {
    if (!currentEvent) {
        return res.status(404).json({
            status: 'error',
            message: 'No active event'
        });
    }

    const teamId = req.params.teamId;
    const teamStats = eventStats[currentEvent.id].teams[teamId];
    
    if (teamStats) {
        // Get all players who have played for this team
        const teamPlayers = Object.entries(eventStats[currentEvent.id].playerStats)
            .filter(([_, playerData]) => playerData.teams[teamId])
            .map(([playerId, playerData]) => ({
                playerId,
                nickname: playerData.nickname,
                stats: playerData.teams[teamId]
            }));

        res.json({
            teamStats,
            players: teamPlayers
        });
    } else {
        res.status(404).json({
            status: 'error',
            message: 'Team not found in current event'
        });
    }
});

// Initialize data storage and start server
initializeDataStorage().then(() => {
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
});