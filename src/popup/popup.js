import { Game } from '../logic/game.js';
import { EVOLUTIONS } from '../logic/evolution.js';

let gameInstance = null;


// Flatten and unique
const MONSTER_LIST = [...new Set(['EGG', ...Object.keys(EVOLUTIONS), ...Object.values(EVOLUTIONS).flatMap(e => e.next)])];

async function init() {
    gameInstance = await Game.load();
    if (!gameInstance) {
        gameInstance = new Game();
        await gameInstance.save();
    }
    render();
    setupListeners();
}

function setupListeners() {
    document.getElementById('btn-feed').addEventListener('click', async () => {
        gameInstance.feed();
        await gameInstance.save();
        showEffect('🍖');
        triggerAnimation('anim-eating');
        render();
    });

    document.getElementById('btn-play').addEventListener('click', async () => {
        gameInstance.play();
        await gameInstance.save();
        showEffect('🎵');
        triggerAnimation('anim-happy');
        render();
    });

    document.getElementById('btn-clean').addEventListener('click', () => {
        showEffect('✨');
        triggerAnimation('anim-happy');
        // Todo: Implement clean
        console.log("Clean clicked");
    });

    document.getElementById('btn-heal').addEventListener('click', () => {
        showEffect('💊');
        triggerAnimation('anim-happy');
        // Todo: Implement heal
        console.log("Heal clicked");
    });

    document.getElementById('btn-restart').addEventListener('click', async () => {
        gameInstance.restart();
        await gameInstance.save();
        render();
    });

    // Encyclopedia
    const modal = document.getElementById('encyclopedia-modal');
    document.getElementById('btn-encyclopedia').addEventListener('click', () => {
        renderEncyclopedia();
        modal.classList.remove('hidden');
    });

    document.getElementById('close-encyclopedia').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}

function renderEncyclopedia() {
    const grid = document.getElementById('encyclopedia-grid');
    grid.innerHTML = '';

    MONSTER_LIST.forEach(id => {
        const div = document.createElement('div');
        div.className = 'enc-item';

        if (gameInstance.catalog.hasDiscovered(id)) {
            const img = document.createElement('img');
            img.src = getSpritePath(id);
            img.width = 64;
            img.height = 64;
            img.style.imageRendering = 'pixelated';
            div.appendChild(img);

            const label = document.createElement('div');
            label.textContent = id.replace('ADULT_', '').replace('CHILD_', ''); // Simplify names
            div.appendChild(label);
        } else {
            div.className += ' locked';
            div.textContent = '???';
        }
        grid.appendChild(div);
    });
}

function getSpritePath(id) {
    const map = {
        'EGG': '../assets/sprites/egg.svg',
        'BABY': '../assets/sprites/baby.svg',
        'CHILD_SOLAR': '../assets/sprites/child_solar.svg',
        'CHILD_LUNAR': '../assets/sprites/child_lunar.svg',
        'CHILD_EARTH': '../assets/sprites/child_earth.svg',
        'CHILD_WATER': '../assets/sprites/child_water.svg',
        'CHILD_WIND': '../assets/sprites/child_wind.svg',
        'CHILD_METAL': '../assets/sprites/child_metal.svg',
        'ADULT_DRAGON': '../assets/sprites/adult_dragon.svg',
        'ADULT_BEAST': '../assets/sprites/adult_beast.svg',
        'ADULT_PHOENIX': '../assets/sprites/adult_phoenix.svg',
        'ADULT_GHOST': '../assets/sprites/adult_ghost.svg',
        'ADULT_ALIEN': '../assets/sprites/adult_alien.svg',
        'ADULT_VAMPIRE': '../assets/sprites/adult_vampire.svg',
        'ADULT_GOLEM': '../assets/sprites/adult_golem.svg',
        'ADULT_TREE': '../assets/sprites/adult_tree.svg',
        'ADULT_SERPENT': '../assets/sprites/adult_serpent.svg',
        'ADULT_KRAKEN': '../assets/sprites/adult_kraken.svg',
        'ADULT_GRIFFIN': '../assets/sprites/adult_griffin.svg',
        'ADULT_PEGASUS': '../assets/sprites/adult_pegasus.svg',
        'ADULT_ROBOT': '../assets/sprites/adult_robot.svg',
        'ADULT_CYBORG': '../assets/sprites/adult_cyborg.svg',
        'DEAD': '../assets/sprites/dead.svg'
    };
    return map[id] || '../assets/sprites/egg.svg';
}

function showEffect(emoji) {
    const display = document.getElementById('creature-display');
    const effect = document.createElement('div');
    effect.className = 'effect-overlay';
    effect.textContent = emoji;
    display.appendChild(effect);

    // Remote after animation
    setTimeout(() => {
        effect.remove();
    }, 1000);
}

function triggerAnimation(className, duration = 1000) {
    const creature = document.getElementById('creature');
    // Remove idle/sick first to avoid collision
    creature.className = '';
    creature.classList.add(className);

    setTimeout(() => {
        creature.classList.remove(className);
        updateIdleAnimation(); // Return to normal state
    }, duration);
}

function updateIdleAnimation() {
    const creature = document.getElementById('creature');
    if (!gameInstance || gameInstance.state.status === 'DEAD') {
        creature.className = '';
        return;
    }

    // Check health for sick animation, otherwise idle
    if (gameInstance.state.stats.health < 40) {
        creature.className = 'anim-sick';
    } else {
        creature.className = 'anim-idle';
    }
}

function render() {
    const stats = gameInstance.state.stats;
    document.getElementById('hunger-val').textContent = stats.hunger;
    document.getElementById('happiness-val').textContent = stats.happiness;
    document.getElementById('health-val').textContent = stats.health;

    const creatureEl = document.getElementById('creature');
    const restartBtn = document.getElementById('btn-restart');
    const msgArea = document.getElementById('message-area');

    if (gameInstance.state.status === 'DEAD') {
        creatureEl.src = getSpritePath('DEAD');
        creatureEl.className = ''; // No animation for dead
        msgArea.textContent = 'Your Chrometchi has passed away...';
        restartBtn.style.display = 'inline-block';
    } else {
        restartBtn.style.display = 'none';
        msgArea.textContent = '';
        creatureEl.src = getSpritePath(gameInstance.state.evolutionStage);

        // Only update idle animation if we aren't currently playing a reaction animation
        // A simple way is to check if it has a specific reaction class, if not, update idle
        if (!creatureEl.classList.contains('anim-eating') && !creatureEl.classList.contains('anim-happy')) {
            updateIdleAnimation();
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
