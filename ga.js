/**
 * Algorithme Génétique - Population, sélection, reproduction
 * Corrections : selectParent guard, élitisme, getBestFish null-safe
 */

class Population {
  constructor(size, config = {}) {
    this.size = size;
    this.generation = 0;
    this.population = [];
    this.savedFish = [];

    this.config = {
      mutationRate: config.mutationRate ?? 0.1,
      lifespan:     config.lifespan     ?? 400,
      sensorCount:  config.sensorCount  ?? 7,
      sensorRange:  config.sensorRange  ?? 150,
      hiddenLayers: config.hiddenLayers ?? [16, 12],
      activation:   config.activation   ?? 'relu',
      maxSpeed:     config.maxSpeed     ?? 4,
      maxForce:     config.maxForce     ?? 0.25,
      eliteCount:   config.eliteCount   ?? 2   // élitisme : garder les N meilleurs
    };

    this.stats = {
      meanFitness:     0,
      maxFitness:      0,
      minFitness:      Infinity,
      successCount:    0,
      checkpointRecord: 0,
      fitnessHistory:  []  // historique pour graphe
    };

    this.startPos = null;
    this.createPopulation();
  }

  createPopulation() {
    this.population = [];
    for (let i = 0; i < this.size; i++) {
      this.population.push(new Fish(null, this.config));
    }
  }

  /**
   * Met à jour la config et recrée la population si la topologie change
   */
  updateConfig(newConfig) {
    const topologyChanged =
      (newConfig.sensorCount  !== undefined && newConfig.sensorCount  !== this.config.sensorCount) ||
      (newConfig.hiddenLayers !== undefined && JSON.stringify(newConfig.hiddenLayers) !== JSON.stringify(this.config.hiddenLayers)) ||
      (newConfig.activation   !== undefined && newConfig.activation   !== this.config.activation);

    Object.assign(this.config, newConfig);

    if (topologyChanged) {
      this.dispose();
      this.createPopulation();
    }
  }

  /**
   * Positionne toute la population au point de départ
   */
  setStartPos(startPos) {
    this.startPos = startPos;
    for (let fish of this.population) {
      fish.setStartPos(startPos);
    }
  }

  /**
   * Évalue une frame d'entraînement
   */
  evaluate(circuit) {
    // Exposer les checkpoints pour le calcul "next checkpoint"
    window._circuitCheckpoints = circuit.checkpoints;

    for (let fish of this.population) {
      fish.applyBehaviors(circuit.walls, circuit.obstacles, this.population);
      fish.checkCheckpoints(circuit.checkpoints);
      fish.checkWallCollision(circuit.walls);
      fish.update();
    }

    // Retirer les poissons terminés ou morts
    for (let i = this.population.length - 1; i >= 0; i--) {
      const fish = this.population[i];
      if (fish.dead || fish.finished) {
        this.savedFish.push(this.population.splice(i, 1)[0]);
      }
    }

    if (this.population.length === 0) {
      this.nextGeneration();
    }
  }

  /**
   * Passe à la génération suivante
   */
  nextGeneration() {
    this.generation++;

    for (let fish of this.savedFish) {
      fish.calculateFitness();
    }

    this.calculateStats();

    // Trier par fitness décroissante
    this.savedFish.sort((a, b) => b.fitness - a.fitness);

    // Normaliser la fitness pour la roulette
    const total = this.savedFish.reduce((s, f) => s + Math.max(f.fitness, 0), 0);
    if (total > 0) {
      for (let fish of this.savedFish) {
        fish.fitness = Math.max(fish.fitness, 0) / total;
      }
    } else {
      // Fitness uniformes si tout est 0
      const uniform = 1 / this.savedFish.length;
      for (let fish of this.savedFish) fish.fitness = uniform;
    }

    const newPopulation = [];

    // Élitisme : copier les N meilleurs directement
    const eliteN = Math.min(this.config.eliteCount, this.savedFish.length);
    for (let i = 0; i < eliteN; i++) {
      const elite = this.savedFish[i].clone();
      if (this.startPos) elite.setStartPos(this.startPos);
      newPopulation.push(elite);
    }

    // Roulette pour le reste
    for (let i = eliteN; i < this.size; i++) {
      const parent = this.selectParent();
      const child  = parent.clone();
      child.mutate(this.config.mutationRate);
      if (this.startPos) child.setStartPos(this.startPos);
      newPopulation.push(child);
    }

    for (let fish of this.savedFish) fish.dispose();
    this.population = newPopulation;
    this.savedFish  = [];
  }

  /**
   * Sélection par roulette biaisée (fitness déjà normalisée)
   */
  selectParent() {
    if (this.savedFish.length === 0) return this.population[0];

    let r = Math.random();
    for (let i = 0; i < this.savedFish.length; i++) {
      r -= this.savedFish[i].fitness;
      if (r <= 0) return this.savedFish[i];
    }
    // Guard : retourner le dernier si aucun sélectionné (arrondi flottant)
    return this.savedFish[this.savedFish.length - 1];
  }

  calculateStats() {
    if (this.savedFish.length === 0) return;

    let sum = 0, maxF = 0, minF = Infinity, successCount = 0, cpRecord = 0;

    for (let fish of this.savedFish) {
      sum   += fish.fitness;
      maxF   = Math.max(maxF, fish.fitness);
      minF   = Math.min(minF, fish.fitness);
      cpRecord = Math.max(cpRecord, fish.checkpointsPassed || 0);

      if (fish.finished && fish.collisions === 0) successCount++;
    }

    this.stats.meanFitness      = sum / this.savedFish.length;
    this.stats.maxFitness       = maxF;
    this.stats.minFitness       = minF;
    this.stats.successCount     = successCount;
    this.stats.checkpointRecord = cpRecord;

    // Historique pour graphe (garder 200 points max)
    this.stats.fitnessHistory.push({
      gen:  this.generation,
      max:  maxF,
      mean: sum / this.savedFish.length
    });
    if (this.stats.fitnessHistory.length > 200) {
      this.stats.fitnessHistory.shift();
    }
  }

  getStats() {
    return {
      generation:    this.generation,
      populationSize: this.population.length,
      savedCount:    this.savedFish.length,
      totalCount:    this.population.length + this.savedFish.length,
      stats:         this.stats
    };
  }

  /**
   * Meilleur poisson (null-safe)
   */
  getBestFish() {
    const all = [...this.savedFish, ...this.population];
    if (all.length === 0) return null;

    let best = all[0];
    for (let fish of all) {
      if ((fish.fitness || 0) > (best.fitness || 0)) best = fish;
    }
    return best;
  }

  getBestBrain() {
    const best = this.getBestFish();
    return best ? best.brain.serialize() : null;
  }

  /**
   * Affiche les poissons
   */
  show(showDebug = false) {
    const best = this.getBestFish();

    for (let fish of this.population) {
      fish.show(fish === best);
      if (showDebug) fish.showRays();
    }
  }

  dispose() {
    [...this.population, ...this.savedFish].forEach(f => f.dispose());
    this.population = [];
    this.savedFish  = [];
  }

  reset(circuit) {
    this.startPos = circuit.startPos;
    for (let fish of this.population) {
      fish.reset(circuit.startPos);
    }
  }

  /**
   * Crée une population de compétition à partir de cerveaux chargés
   */
  static createCompetition(brains, config = {}) {
    const pop = new Population(brains.length, config);
    pop.dispose();
    pop.population = brains.map((brainData, i) => {
      const brain = NeuralNetwork.deserialize(brainData);
      const fish  = new Fish(brain, pop.config);
      fish.id     = i;
      fish.label  = `Brain ${i + 1}`;
      // libérer la copie créée dans le constructeur Fish
      return fish;
    });
    return pop;
  }
}

/**
 * Critères d'arrêt de l'entraînement
 */
class StoppingCriteria {
  constructor(config = {}) {
    this.maxGenerations      = config.maxGenerations      ?? 300;
    this.targetSuccessRate   = config.targetSuccessRate   ?? 0.6;
    this.stagnationThreshold = config.stagnationThreshold ?? 40;

    this.maxFitnessHistory = [];
  }

  shouldStop(generation, stats, reason = {}) {
    // 1. Nombre max de générations
    if (generation >= this.maxGenerations) {
      reason.value = `Max générations atteint (${generation})`;
      return true;
    }

    // 2. Taux de succès
    const total = (stats.savedCount || 0);
    if (total > 0) {
      const rate = (stats.successCount || 0) / total;
      if (rate >= this.targetSuccessRate) {
        reason.value = `Taux réussite ${(rate * 100).toFixed(1)}% ≥ ${(this.targetSuccessRate * 100)}%`;
        return true;
      }
    }

    // 3. Stagnation
    this.maxFitnessHistory.push(stats.maxFitness || 0);
    if (this.maxFitnessHistory.length > this.stagnationThreshold) {
      this.maxFitnessHistory.shift();

      const recent = this.maxFitnessHistory.slice(-10);
      const older  = this.maxFitnessHistory.slice(0, 10);

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg  = older.reduce((a, b) => a + b, 0)  / older.length;

      if (olderAvg > 0 && recentAvg <= olderAvg * 1.005) {
        reason.value = `Stagnation détectée (amélioration < 0.5% sur ${this.stagnationThreshold} gens)`;
        return true;
      }
    }

    return false;
  }

  reset() {
    this.maxFitnessHistory = [];
  }
}