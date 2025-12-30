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

        if (evolutionStage === 'EGG' && stats.age >= 5) {
            nextStage = 'BABY';
        }
        else if (evolutionStage === 'BABY' && stats.age >= 15) {
            // Expanded Randomness
            if (avgState > 80) nextStage = 'CHILD_SOLAR';
            else if (avgState < 20) nextStage = 'CHILD_LUNAR';
            else {
                const rand = Math.random();
                if (rand < 0.25) nextStage = 'CHILD_EARTH';
                else if (rand < 0.5) nextStage = 'CHILD_WATER';
                else if (rand < 0.75) nextStage = 'CHILD_WIND';
                else nextStage = 'CHILD_METAL';
            }
        }
        else if (evolutionStage.startsWith('CHILD') && stats.age >= 35) {
            const rand = Math.random();
            const childType = evolutionStage;

            if (childType === 'CHILD_SOLAR') {
                if (avgState > 90 && rand < 0.2) nextStage = 'ADULT_PHOENIX';
                else if (avgState > 60) nextStage = 'ADULT_DRAGON';
                else nextStage = 'ADULT_BEAST';
            }
            else if (childType === 'CHILD_LUNAR') {
                if (avgState < 20 && rand < 0.2) nextStage = 'ADULT_VAMPIRE';
                else if (avgState > 40) nextStage = 'ADULT_ALIEN';
                else nextStage = 'ADULT_GHOST';
            }
            else if (childType === 'CHILD_EARTH') {
                if (avgState > 50) nextStage = 'ADULT_TREE';
                else nextStage = 'ADULT_GOLEM';
            }
            else if (childType === 'CHILD_WATER') {
                if (avgState > 50) nextStage = 'ADULT_SERPENT';
                else nextStage = 'ADULT_KRAKEN';
            }
            else if (childType === 'CHILD_WIND') {
                if (avgState > 50) nextStage = 'ADULT_PEGASUS';
                else nextStage = 'ADULT_GRIFFIN';
            }
            else if (childType === 'CHILD_METAL') {
                if (avgState > 50) nextStage = 'ADULT_CYBORG';
                else nextStage = 'ADULT_ROBOT';
            }
        }

        return nextStage;
    }
}
