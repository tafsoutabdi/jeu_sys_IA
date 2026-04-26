// ===== MAIN =====

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');
    tf.setBackend('cpu');

    setupTrack(true);

    for (let i = 0; i < TOTAL_POP; i++) cars[i] = new Car();

    loadBrainsFromStorage();
    loadCircuitsFromStorage();

    setupUIListeners();
    updateUI();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    setupTrack(false);
}

function draw() {
    if (editMode) {
        drawEditor();
        return;
    }

    background(30);
    showTiles();

    // Obstacles
    for (let obs of obstacles) {
        obs.show();
        fill(255, 100, 0, 150);
        noStroke();
        circle((obs.a.x + obs.b.x) / 2, (obs.a.y + obs.b.y) / 2, 20);
    }

    // Checkpoints
    for (let i = 0; i < checkpoints.length; i++) {
        checkpoints[i].show();
    }

    // Murs
    for (let wall of walls) wall.show();

    // Logique voitures
    let maxScore = -1;
    let bestDist = Infinity;
    bestCar = null;

    if (raceMode) {
        // Mode course : toutes les voitures continuent (pas de mort définitive)
        for (let car of cars) {
            car.look(walls);
            car.think(walls);
            car.update();
            car.checkCheckpoints(checkpoints);
            checkCollisionsCar(car);

            let distToNext = Infinity;
            if (checkpoints.length > 0) {
                let goal = checkpoints[car.checkpointIndex % checkpoints.length];
                let center = p5.Vector.add(goal.a, goal.b).div(2);
                distToNext = p5.Vector.dist(car.pos, center);
            }
            if (car.score > maxScore || (car.score === maxScore && distToNext < bestDist)) {
                maxScore = car.score;
                bestDist = distToNext;
                bestCar = car;
            }
        }

        // Afficher toutes les voitures
        for (let car of cars) car.show(car === bestCar);
        showRaceResults();

    } else {
        // Mode entraînement
        for (let i = cars.length - 1; i >= 0; i--) {
            let car = cars[i];
            car.look(walls);
            car.think(walls);
            car.update();
            car.checkCheckpoints(checkpoints);
            checkCollisionsCar(car);

            if (car.dead) {
                savedCars.push(cars.splice(i, 1)[0]);
            } else {
                let distToNext = Infinity;
                if (checkpoints.length > 0) {
                    let goal = checkpoints[car.checkpointIndex % checkpoints.length];
                    let center = p5.Vector.add(goal.a, goal.b).div(2);
                    distToNext = p5.Vector.dist(car.pos, center);
                }
                if (car.score > maxScore || (car.score === maxScore && distToNext < bestDist)) {
                    maxScore = car.score;
                    bestDist = distToNext;
                    bestCar = car;
                }
            }
        }

        if (cars.length === 0 && !trainingFinished) {
            nextGeneration();
            generation++;
            updateUI();
        }

        // Dessin voitures
        for (let car of cars) {
            if (car !== bestCar) car.show(false);
        }
        if (bestCar) {
            bestCar.show(true);
            // Ligne vers prochain waypoint
            for (let w = 0; w < NB_WAYPOINTS; w++) {
                let cpIdx = (bestCar.checkpointIndex + w) % checkpoints.length;
                let target = checkpoints[cpIdx];
                let center = p5.Vector.add(target.a, target.b).div(2);
                stroke(0, 80, 255, 120 - w * 40);
                strokeWeight(1);
                line(bestCar.pos.x, bestCar.pos.y, center.x, center.y);
            }
        }
    }

    drawHUD();

    // ML5 overlay info
    if (ml5Active && bestCar && !raceMode) {
        fill(56, 189, 248, 200);
        noStroke();
        textSize(12);
        textAlign(LEFT);
        text(`ML5 ACTIF — Steer: ${ml5HandControl.steer.toFixed(2)} | Throttle: ${ml5HandControl.throttle.toFixed(2)}`, 50, height - 20);
    }
}

function checkCollisionsCar(car) {
    for (let w of walls) {
        if (distPointToSegment(car.pos, w.a, w.b) < car.width / 1.8) {
            car.dead = true;
            return;
        }
    }
    for (let obs of obstacles) {
        if (distPointToSegment(car.pos, obs.a, obs.b) < car.width * 2) {
            car.dead = true;
            return;
        }
    }
    if (car.pos.x < 0 || car.pos.x > width || car.pos.y < 0 || car.pos.y > height) {
        car.dead = true;
    }
}

function drawHUD() {
    fill(0, 150);
    noStroke();
    textSize(16);
    textAlign(LEFT);

    const marginX = 50;
    const baseY = 32;
    const spacing = 22;

    if (raceMode) {
        fill(255, 200, 0);
        text('🏁 MODE COURSE', marginX, baseY);
        fill(255);
        text(`Voitures: ${cars.length}`, marginX, baseY + spacing);
        return;
    }

    fill(0, 150);
    text(`Génération: ${generation}`, marginX + 1, baseY + 1);
    text(`En vie: ${cars.filter(c => !c.dead).length}/${TOTAL_POP}`, marginX + 1, baseY + spacing + 1);

    let bestScore = 0;
    if (cars.length > 0) bestScore = Math.max(...cars.map(c => c.score));
    text(`Meilleur score: ${bestScore.toFixed(0)}`, marginX + 1, baseY + spacing * 2 + 1);

    fill(255);
    text(`Génération: ${generation}`, marginX, baseY);
    text(`En vie: ${cars.filter(c => !c.dead).length}/${TOTAL_POP}`, marginX, baseY + spacing);
    text(`Meilleur score: ${bestScore.toFixed(0)}`, marginX, baseY + spacing * 2);

    // Barre de progression stop condition
    let rate = savedCars.filter(c => c.finished).length / TOTAL_POP;
    fill(40, 200, 40, 180);
    rect(marginX, baseY + spacing * 3 + 5, rate * 150, 8, 4);
    fill(255, 50);
    noFill();
    stroke(255, 50);
    rect(marginX, baseY + spacing * 3 + 5, 150, 8, 4);
    fill(150);
    noStroke();
    textSize(10);
    text(`Succès: ${(rate * 100).toFixed(0)}% / cible: ${(STOP_CONDITION * 100).toFixed(0)}%`, marginX, baseY + spacing * 3 + 22);

    if (trainingFinished) {
        textAlign(CENTER, CENTER);
        textSize(40);
        fill(0, 255, 0);
        stroke(0); strokeWeight(3);
        text('ENTRAÎNEMENT TERMINÉ ✅', width / 2, height / 2);
        noStroke();
        textAlign(LEFT);
        textSize(16);
    }
}

// ===== INTERACTIONS =====

function mousePressed() {
    if (editMode) {
        editorMousePressed();
        return;
    }

    // Ajout d'obstacle (Ctrl+clic)
    if (keyIsDown(CONTROL)) {
        let a = createVector(mouseX - 15, mouseY);
        let b = createVector(mouseX + 15, mouseY);
        obstacles.push(new Boundary(a.x, a.y, b.x, b.y, 'obstacle'));
    }
}

function mouseDragged() {
    if (editMode) editorMouseDragged();
}

function mouseReleased() {
    if (editMode) editorMouseReleased();
}

function keyPressed() {
    if (key === 'r' || key === 'R') resetTraining();
    if (key === 'n' || key === 'N') setupTrack(true);
    if (key === 'o' || key === 'O') obstacles = [];
    if (key === 'm' || key === 'M') toggleML5();
}

// ===== UI =====

function setupUIListeners() {
    // Sliders Entraînement
    bindSlider('speedSlider', 'speedVal', v => { GAME_SPEED_LIMIT = v; });
    bindSlider('diffSlider', 'diffVal', v => {
        TRACK_DIFFICULTY = v;
        trainingFinished = false;
        setupTrack(true);
        resetTraining();
    });
    bindSlider('widthSlider', 'widthVal', v => {
        TRACK_WIDTH = v;
        trainingFinished = false;
        setupTrack(true);
        resetTraining();
    });
    bindSlider('popSlider', 'popVal', v => { TOTAL_POP = v; });
    bindSlider('mutSlider', 'mutVal', v => { MUTATION_RATE = v / 100; }, true, 100);
    bindSlider('stopSlider', 'stopVal', v => { STOP_CONDITION = v / 100; }, true, 100);

    // Réseau de neurones
    bindSlider('raysSlider', 'raysVal', v => {
        NB_RAYS = v;
        NB_ASSETS = NB_RAYS + NB_WAYPOINTS * 2 + (USE_SPEED ? 1 : 0);
        resetTraining();
    });
    bindSlider('waypointsSlider', 'waypointsVal', v => {
        NB_WAYPOINTS = v;
        NB_ASSETS = NB_RAYS + NB_WAYPOINTS * 2 + (USE_SPEED ? 1 : 0);
        resetTraining();
    });
    bindSlider('hiddenSlider', 'hiddenVal', v => {
        NN_HIDDEN_LAYERS = v;
        resetTraining();
    });
    bindSlider('neuronsSlider', 'neuronsVal', v => {
        NN_NEURONS_PER_LAYER = v;
        resetTraining();
    });

    // Activation
    document.getElementById('activationSelect').addEventListener('change', e => {
        NN_ACTIVATION = e.target.value;
        resetTraining();
    });

    // Speed checkbox
    document.getElementById('useSpeedCheck').addEventListener('change', e => {
        USE_SPEED = e.target.checked;
        NB_ASSETS = NB_RAYS + NB_WAYPOINTS * 2 + (USE_SPEED ? 1 : 0);
        resetTraining();
    });

    // Boutons
    document.getElementById('btn-reset').addEventListener('click', resetTraining);
    document.getElementById('btn-new-track').addEventListener('click', () => {
        setupTrack(true);
        resetTraining();
    });
    document.getElementById('btn-save-brain').addEventListener('click', () => {
        let name = document.getElementById('brain-name').value || ('Cerveau Gen' + generation);
        saveBestBrain(name);
    });
    document.getElementById('btn-save-circuit').addEventListener('click', () => {
        let name = document.getElementById('circuit-name').value || ('Circuit ' + (savedCircuits.length + 1));
        saveCurrentCircuit(name);
    });
    document.getElementById('btn-start-race').addEventListener('click', startRace);
    document.getElementById('btn-stop-race').addEventListener('click', stopRace);
    document.getElementById('btn-edit-track').addEventListener('click', startCircuitEditor);
    document.getElementById('btn-apply-track').addEventListener('click', applyEditorToTrack);
    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
        editMode = false;
        appMode = 'train';
        updateUI();
    });
    document.getElementById('btn-export-brains').addEventListener('click', exportBrains);
    document.getElementById('btn-export-circuits').addEventListener('click', exportCircuits);
    document.getElementById('btn-ml5').addEventListener('click', toggleML5);
    document.getElementById('btn-clear-obstacles').addEventListener('click', () => { obstacles = []; });

    // Import fichiers
    document.getElementById('import-brains').addEventListener('change', e => {
        if (e.target.files[0]) importBrains(e.target.files[0]);
    });
    document.getElementById('import-circuits').addEventListener('change', e => {
        if (e.target.files[0]) importCircuits(e.target.files[0]);
    });

    // Onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
        });
    });

    // Fermer overlay succès
    document.getElementById('success-overlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) {
            document.getElementById('success-overlay').style.display = 'none';
        }
    });
}

function bindSlider(id, valId, callback, isFloat = false, divisor = 1) {
    let el = document.getElementById(id);
    let valEl = document.getElementById(valId);
    if (!el) return;
    el.addEventListener('input', () => {
        let v = isFloat ? parseFloat(el.value) : parseInt(el.value);
        let display = isFloat ? (v / divisor).toFixed(2) : v;
        if (valEl) valEl.innerText = display;
        callback(v);
    });
}

function updateUI() {
    let isEdit = editMode;
    let isRace = raceMode;

    document.getElementById('edit-controls').style.display = isEdit ? 'flex' : 'none';
    document.getElementById('btn-edit-track').style.display = isEdit ? 'none' : 'block';
    document.getElementById('btn-stop-race').style.display = isRace ? 'block' : 'none';
    document.getElementById('btn-start-race').style.display = isRace ? 'none' : 'block';

    // Info topologie
    let inputs = NB_RAYS + NB_WAYPOINTS * 2 + (USE_SPEED ? 1 : 0);
    let topo = `[${inputs}→${Array(NN_HIDDEN_LAYERS).fill(NN_NEURONS_PER_LAYER).join('→')}→2]`;
    let el = document.getElementById('topo-info');
    if (el) el.innerText = topo;
}
