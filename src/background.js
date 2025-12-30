import { Game } from './logic/game.js';

// Setup alarms
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('gameLoop', { periodInMinutes: 1 }); // Tick every minute
    console.log("Chrometchi installed. Alarm created.");
    // Initialize game state if not present
    Game.load().then(game => {
        if (!game) {
            const newGame = new Game();
            newGame.save();
        }
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'gameLoop') {
        Game.load().then(game => {
            if (game) {
                game.tick();
                game.save();
            }
        });
    }
});
