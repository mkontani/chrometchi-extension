
# Chrometchi Extension 🥚👾

Chrometchi is a retro-style virtual pet game that lives in your Chrome browser! Raise your creature from an egg, feed it, play with it, and discover various evolution paths.

![Chrometchi1 Icon](src/assets/sprites/egg.svg)
![Chrometchi1 Icon](src/assets/sprites/baby.svg)
![Chrometchi2 Icon](src/assets/sprites/child_solar.svg)
![Chrometchi2 Icon](src/assets/sprites/adult_dragon.svg)

## Features

-   **Deep Evolution System**: 16 unique monsters to discover!
    -   Your care style (Stats) and a bit of luck (RNG) determine evolution.
    -   Branches include Solar, Lunar, Earth, and Water paths.
-   **Retro Pixel Art**: Original SVG-based pixel art for every character.
-   **Encyclopedia (Zukan)**: Automatically records every monster you discover. Can you complete the collection?
-   **Dynamic Stats**: Manage Hunger, Happiness, and Health. Neglect leads to sickness and death!
-   **Persistent World**: Your Chrometchi grows even when the popup is closed (via background alarms).

## Installation

1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (toggle in the top right).
4.  Click **Load unpacked** and select this directory.
5.  Pin the extension icon to your toolbar and start raising your egg!

## How to Play

1.  **Start**: Click the extension icon. You'll start with an Egg.
2.  **Care**:
    -   **Feed** (🍖): Reduces hunger.
    -   **Play** (🎵): Increases happiness.
    -   **Heal** (💊): Cures sickness if health gets low.
    -   **Clean** (✨): Keeps the environment clean (Visual effect).
3.  **Evolve**:
    -   Egg hatches after 5 minutes.
    -   Baby evolves after 15 minutes.
    -   Child evolves into Adult after 35 minutes.
    -   *Time flies when you're having fun!*
4.  **Collection**: Click the **Zukan** button to see your discovered monsters.

## Development

-   **Run Tests**: Open `src/test/test.html` in your browser (may require a local server due to CORS).
    ```bash
    python3 -m http.server 8000
    # Open http://localhost:8000/src/test/test.html
    ```
