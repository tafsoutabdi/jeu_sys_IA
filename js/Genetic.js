function nextGeneration() {
    calculateFitness();

    let finishedCount = savedCars.filter(c => c.finished).length;
    let successRate = finishedCount / TOTAL_POP;
    console.log(`Gen ${generation} — Succès: ${finishedCount}/${TOTAL_POP} (${(successRate * 100).toFixed(1)}%)`);

    // Condition d'arrêt paramétrable
    if (successRate >= STOP_CONDITION) {
        console.log(`OBJECTIF ATTEINT ! ${(STOP_CONDITION * 100)}% de réussite.`);
        trainingFinished = true;
        // Sauvegarder automatiquement le meilleur cerveau
        let best = savedCars.reduce((a, b) => a.fitness > b.fitness ? a : b);
        let brainData = best.brain.toJSON();
        brainData.meta = {
            generation: generation,
            successRate: (successRate * 100).toFixed(1) + '%',
            timestamp: new Date().toISOString(),
            circuit: 'auto_' + Date.now()
        };
        savedBrains.push(brainData);
        updateBrainsList();
        setTimeout(() => {
            document.getElementById('success-overlay').style.display = 'flex';
            document.getElementById('success-text').innerText =
                `Entraînement terminé !\nGénération ${generation} — ${(successRate * 100).toFixed(1)}% de réussite`;
        }, 100);
    }

    // Nouvelle population
    cars = [];
    for (let i = 0; i < TOTAL_POP; i++) {
        let parent = tournamentSelection(savedCars);
        let child = new Car(parent.brain);
        if (!trainingFinished) child.mutate(MUTATION_RATE);
        cars[i] = child;
    }

    for (let i = 0; i < savedCars.length; i++) savedCars[i].dispose();
    savedCars = [];
}

function calculateFitness() {
    for (let car of savedCars) {
        car.fitness = car.score;
        let nextCP = checkpoints[car.checkpointIndex];
        if (nextCP) {
            let cpCenter = p5.Vector.add(nextCP.a, nextCP.b).div(2);
            let d = p5.Vector.dist(car.pos, cpCenter);
            let proximityBonus = map(d, 0, 400, 50, 0);
            car.fitness += max(0, proximityBonus);
        }
    }
}

function tournamentSelection(population) {
    const TOURNAMENT_SIZE = 5;
    let best = null;
    for (let i = 0; i < TOURNAMENT_SIZE; i++) {
        let ind = Math.floor(random(population.length));
        let candidate = population[ind];
        if (best === null || candidate.fitness > best.fitness) best = candidate;
    }
    return best;
}
