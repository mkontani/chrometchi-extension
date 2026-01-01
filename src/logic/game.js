import { EvolutionSystem } from './evolution.js';
import { Catalog } from './catalog.js';

export class Game {
    constructor(data = {}) {
        this.state = data.state || {
            stats: {
                hunger: 100, // 0-100, 100 is full
                happiness: 100,
                health: 100,
                age: 0
            },
            status: 'ALIVE', // EGG, ALIVE, SICK, DEAD
            evolutionStage: 'EGG', // EGG, BABY, ...
            lastTick: Date.now()
        };
        this.settings = data.settings || { notifications: true };
        // Catalog is shared/global usually, but for now we can store it in the same object or separate.
        // Let's store it separately in storage but load it here for convenience, or add it to state.
        // Actually, catalog should persist across restarts, so it shouldn't be reset when game is reset.
        // We'll handle catalog loading separately in static load().
        this.catalog = new Catalog(data.catalog || {});
    }

    static async load() {
        const result = await chrome.storage.local.get(['chrometchiState', 'chrometchiCatalog', 'chrometchiSettings']);
        const state = result.chrometchiState;
        const catalogData = result.chrometchiCatalog;
        const settings = result.chrometchiSettings;

        if (state) {
            return new Game({ state, catalog: catalogData, settings });
        }
        return null; // Or return new Game() if we want defaults always
    }

    async save() {
        await chrome.storage.local.set({
            chrometchiState: this.state,
            chrometchiCatalog: this.catalog,
            chrometchiSettings: this.settings
        });
    }

    tick() {
        if (this.state.status === 'DEAD') return;

        // Decay stats
        if (this.state.evolutionStage !== 'EGG') {
            let decayRate = 1;
            if (this.state.evolutionStage === 'BABY') decayRate = 5;
            else if (this.state.evolutionStage.startsWith('CHILD')) decayRate = 2;

            this.state.stats.hunger = Math.max(0, this.state.stats.hunger - decayRate);
            this.state.stats.happiness = Math.max(0, this.state.stats.happiness - decayRate);

            if (this.state.stats.hunger < 20 || this.state.stats.happiness < 20) {
                this.state.stats.health = Math.max(0, this.state.stats.health - 2);
            }

            this.state.stats.age += 1;

            if (this.state.stats.health === 0) {
                this.state.status = 'DEAD';
            }
        } else {
            // Egg ages too
            this.state.stats.age += 1;
        }

        // Check Evolution
        const nextStage = EvolutionSystem.checkEvolution(this.state);
        if (nextStage) {
            this.evolve(nextStage);
        }

        this.state.lastTick = Date.now();
        // console.log('Tick:', this.state);
    }

    evolve(nextStage) {
        this.state.evolutionStage = nextStage;
        this.state.stats.age = 0; // Reset age for the new stage? Or keep cumulative? 
        // EvolutionSystem logic seemed to rely on cumulative or stage age. 
        // Let's keep cumulative age but maybe we should track time in stage.
        // For this MVP, let's keep cumulative age and adjust EvolutionSystem values if needed, 
        // OR reset age and update EvolutionSystem to look for "age > 5" (meaning 5 ticks in this stage).
        // Let's reset age for simplicity of "stage duration".
        this.state.stats.age = 0;

        // Boost stats on evolution
        this.state.stats.hunger = 100;
        this.state.stats.happiness = 100;

        // Unlock in catalog
        this.catalog.unlock(nextStage);

        // Notify (optional)
        if (chrome.notifications) {
            chrome.notifications.create('evolution_' + Date.now(), {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('src/assets/icons/icon128.png'),
                title: 'Chrometchi Evolved!',
                message: `Your Chrometchi grew into a ${nextStage}!`
            });
        }
    }

    feed() {
        if (this.state.status === 'DEAD') return;
        this.state.stats.hunger = Math.min(100, this.state.stats.hunger + 20);
    }

    play() {
        if (this.state.status === 'DEAD') return;
        this.state.stats.happiness = Math.min(100, this.state.stats.happiness + 20);
    }

    restart() {
        this.state = {
            stats: {
                hunger: 100,
                happiness: 100,
                health: 100,
                age: 0
            },
            status: 'ALIVE',
            evolutionStage: 'EGG',
            lastTick: Date.now()
        };
        // Catalog persists
    }
}
