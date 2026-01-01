export const EVOLUTIONS = {
    EGG: {
        next: ['BABY'],
        duration: 5
    },
    BABY: {
        next: ['CHILD_SOLAR', 'CHILD_LUNAR', 'CHILD_EARTH', 'CHILD_WATER', 'CHILD_WIND', 'CHILD_METAL'],
        duration: 10
    },
    CHILD_SOLAR: {
        next: ['ADULT_DRAGON', 'ADULT_BEAST', 'ADULT_PHOENIX'],
        duration: 20
    },
    CHILD_LUNAR: {
        next: ['ADULT_GHOST', 'ADULT_ALIEN', 'ADULT_VAMPIRE'],
        duration: 20
    },
    CHILD_ETHER: {
        next: ['ADULT_ASTRA', 'ADULT_NEXUS'],
        duration: 20
    },
    CHILD_EARTH: {
        next: ['ADULT_GOLEM', 'ADULT_TREE'],
        duration: 20
    },
    CHILD_WATER: {
        next: ['ADULT_SERPENT', 'ADULT_KRAKEN'],
        duration: 20
    },
    CHILD_WIND: {
        next: ['ADULT_GRIFFIN', 'ADULT_PEGASUS'],
        duration: 20
    },
    CHILD_METAL: {
        next: ['ADULT_ROBOT', 'ADULT_CYBORG'],
        duration: 20
    }
};

export class EvolutionSystem {
    static checkEvolution(gameState) {
        const { evolutionStage, stats } = gameState;
        const stageConfig = EVOLUTIONS[evolutionStage];

        if (!stageConfig) return null;

        let nextStage = null;
        const avgState = (stats.hunger + stats.happiness) / 2;
        const hunger = stats.hunger;
        const happy = stats.happiness;

        if (evolutionStage === 'EGG' && stats.age >= 5) {
            nextStage = 'BABY';
        }
        else if (evolutionStage === 'BABY' && stats.age >= 15) {
            // More agency: Balance determines path
            if (avgState >= 90) {
                // Elite path
                nextStage = 'CHILD_SOLAR';
            } else if (avgState < 40) {
                // Neglect path (With decay=5, 15 ticks drops 75 pts => 25. So <40 is safe)
                nextStage = 'CHILD_LUNAR';
            } else {
                // Balanced/Skewed paths (40-89)
                if (hunger > happy + 10) {
                    // Feed more than play
                    nextStage = 'CHILD_EARTH';
                } else if (happy > hunger + 10) {
                    // Play more than feed
                    nextStage = 'CHILD_WIND';
                } else {
                    // Balanced stats -> Water, Metal, or NEW ETHER (Mysterious)
                    const rand = Math.random();
                    if (rand < 0.33) nextStage = 'CHILD_WATER';
                    else if (rand < 0.66) nextStage = 'CHILD_METAL';
                    else nextStage = 'CHILD_ETHER'; // New mysterious path
                }
            }
        }
        else if (evolutionStage.startsWith('CHILD') && stats.age >= 35) {
            const rand = Math.random();
            const childType = evolutionStage;

            if (childType === 'CHILD_SOLAR') {
                if (avgState > 95 && rand < 0.3) nextStage = 'ADULT_PHOENIX'; // Very Rare
                else if (avgState > 70) nextStage = 'ADULT_DRAGON';
                else nextStage = 'ADULT_BEAST';
            }
            else if (childType === 'CHILD_LUNAR') {
                if (avgState < 15 && rand < 0.3) nextStage = 'ADULT_VAMPIRE'; // Very Rare
                else if (avgState < 40) nextStage = 'ADULT_GHOST';
                else nextStage = 'ADULT_ALIEN';
            }
            else if (childType === 'CHILD_EARTH') {
                // Hunger focus
                if (hunger > 80) nextStage = 'ADULT_GOLEM';
                else nextStage = 'ADULT_TREE';
            }
            else if (childType === 'CHILD_WATER') {
                // Balanced
                if (avgState > 60) nextStage = 'ADULT_SERPENT';
                else nextStage = 'ADULT_KRAKEN';
            }
            else if (childType === 'CHILD_WIND') {
                // Happiness focus
                if (happy > 80) nextStage = 'ADULT_PEGASUS';
                else nextStage = 'ADULT_GRIFFIN';
            }
            else if (childType === 'CHILD_METAL') {
                // Tech focus
                if (avgState > 70) nextStage = 'ADULT_CYBORG';
                else nextStage = 'ADULT_ROBOT';
            }
            else if (childType === 'CHILD_ETHER') {
                // New Branch
                if (avgState > 80) nextStage = 'ADULT_ASTRA'; // High states = Star Being
                else nextStage = 'ADULT_NEXUS'; // Low/Mid = Energy Core
            }
        }

        return nextStage;
    }
}
