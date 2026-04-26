// Gestion des cerveaux : sauvegarde, restauration, mode course

function saveBestBrain(name) {
    if (!name) name = 'Cerveau Gen' + generation;
    if (savedCars.length === 0 && cars.length === 0) {
        alert('Aucun cerveau disponible à sauvegarder');
        return;
    }
    let source = savedCars.length > 0 ? savedCars : cars;
    let best = source.reduce((a, b) => (a.fitness || a.score) > (b.fitness || b.score) ? a : b);
    let brainData = best.brain.toJSON();
    brainData.meta = {
        name: name,
        generation: generation,
        topology: `${NB_RAYS}r+${NB_WAYPOINTS}wp | ${NN_HIDDEN_LAYERS}x${NN_NEURONS_PER_LAYER} | ${NN_ACTIVATION}`,
        timestamp: new Date().toISOString()
    };
    savedBrains.push(brainData);
    updateBrainsList();
    saveBrainsToStorage();
}

function updateBrainsList() {
    let el = document.getElementById('brains-list');
    if (!el) return;
    el.innerHTML = '';
    savedBrains.forEach((b, i) => {
        let meta = b.meta || {};
        let div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div>
                <strong>${meta.name || 'Cerveau ' + i}</strong>
                <small>Gen ${meta.generation || '?'} | ${meta.topology || ''}</small>
            </div>
            <div class="item-btns">
                <button onclick="loadBrainForRace(${i})" title="Ajouter à la course">🏁</button>
                <button onclick="deleteBrain(${i})" title="Supprimer">🗑</button>
            </div>`;
        el.appendChild(div);
    });
}

function deleteBrain(idx) {
    savedBrains.splice(idx, 1);
    updateBrainsList();
    saveBrainsToStorage();
}

function saveBrainsToStorage() {
    try {
        localStorage.setItem('savedBrains', JSON.stringify(savedBrains));
    } catch (e) { console.warn('localStorage plein'); }
}

function loadBrainsFromStorage() {
    try {
        let data = localStorage.getItem('savedBrains');
        if (data) {
            savedBrains = JSON.parse(data);
            updateBrainsList();
        }
    } catch (e) {}
}

function exportBrains() {
    let blob = new Blob([JSON.stringify(savedBrains, null, 2)], { type: 'application/json' });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'brains.json';
    a.click();
}

function importBrains(file) {
    let reader = new FileReader();
    reader.onload = (e) => {
        try {
            let data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                savedBrains = [...savedBrains, ...data];
            } else {
                savedBrains.push(data);
            }
            updateBrainsList();
            saveBrainsToStorage();
        } catch (err) { alert('Fichier invalide'); }
    };
    reader.readAsText(file);
}

// Cerveaux sélectionnés pour la course
var raceBrainIndices = [];

function loadBrainForRace(idx) {
    if (!raceBrainIndices.includes(idx)) {
        raceBrainIndices.push(idx);
    }
    updateRaceList();
}

function updateRaceList() {
    let el = document.getElementById('race-list');
    if (!el) return;
    el.innerHTML = '';
    raceBrainIndices.forEach((bi, i) => {
        let b = savedBrains[bi];
        let meta = b ? (b.meta || {}) : {};
        let div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<span>${meta.name || 'Cerveau ' + bi}</span>
            <button onclick="removeFromRace(${i})">✕</button>`;
        el.appendChild(div);
    });
}

function removeFromRace(i) {
    raceBrainIndices.splice(i, 1);
    updateRaceList();
}

// Lancer la course
var CAR_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c77dff','#ff9a3c','#00d4ff','#ff61a6'];

function startRace() {
    if (raceBrainIndices.length === 0) {
        alert('Ajoutez au moins un cerveau à la course !');
        return;
    }

    raceMode = true;
    appMode = 'race';
    trainingFinished = true;
    cars = [];
    savedCars = [];

    for (let i = 0; i < raceBrainIndices.length; i++) {
        let bi = raceBrainIndices[i];
        let bd = savedBrains[bi];
        try {
            let brain = NeuralNetwork.fromJSON(bd);
            let car = new Car(brain, CAR_COLORS[i % CAR_COLORS.length]);
            car.label = (bd.meta && bd.meta.name) ? bd.meta.name.substring(0, 10) : 'Car ' + i;
            cars.push(car);
        } catch (e) {
            console.error('Erreur chargement cerveau', e);
        }
    }

    document.getElementById('race-results').innerHTML = '';
    document.getElementById('tab-race').click();
    updateUI();
}

function stopRace() {
    raceMode = false;
    appMode = 'train';
    resetTraining();
    updateUI();
}

function resetTraining() {
    generation = 0;
    trainingFinished = false;
    cars = [];
    savedCars = [];
    bestCar = null;
    obstacles = [];
    for (let i = 0; i < TOTAL_POP; i++) cars[i] = new Car();
    document.getElementById('success-overlay').style.display = 'none';
}

function showRaceResults() {
    let allCars = [...cars, ...savedCars];
    if (allCars.length === 0) return;
    allCars.sort((a, b) => b.score - a.score);
    let el = document.getElementById('race-results');
    if (!el) return;
    el.innerHTML = allCars.map((c, i) =>
        `<div style="color:${c.carColor || '#fff'}">${i + 1}. ${c.label || '?'} — ${c.score.toFixed(0)} pts${c.finished ? ' 🏆' : ''}</div>`
    ).join('');
}
