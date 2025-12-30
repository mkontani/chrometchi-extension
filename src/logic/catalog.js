export class Catalog {
    constructor(data = {}) {
        this.discovered = data.discovered || ['EGG']; // Array of monster IDs
    }

    unlock(monsterId) {
        if (!this.discovered.includes(monsterId)) {
            this.discovered.push(monsterId);
            return true; // New discovery
        }
        return false;
    }

    hasDiscovered(monsterId) {
        return this.discovered.includes(monsterId);
    }

    getDiscoveredCount() {
        return this.discovered.length;
    }
}
