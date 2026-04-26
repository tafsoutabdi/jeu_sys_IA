// Éditeur de circuits
var editPoints = [];
var editDragging = -1;
var editMode = false;

function startCircuitEditor() {
    editMode = true;
    editPoints = [];
    appMode = 'edit';
    // Copier le circuit actuel comme base
    if (currentTrackPath.length > 0) {
        // On prend les points de contrôle (tous les 20 points environ)
        for (let i = 0; i < currentTrackPath.length; i += 20) {
            editPoints.push({ x: currentTrackPath[i][0], y: currentTrackPath[i][1] });
        }
    }
    updateUI();
}

function drawEditor() {
    if (!editMode) return;

    // Fond
    background(20, 30, 40);

    // Instructions
    fill(255, 200);
    noStroke();
    textSize(14);
    textAlign(CENTER);
    text('ÉDITEUR DE CIRCUIT — Clic gauche: ajouter point | Clic droit: supprimer | Glisser: déplacer', width / 2, 30);

    if (editPoints.length < 2) {
        fill(150, 200);
        text('Cliquez pour placer des points de contrôle (minimum 4)', width / 2, height / 2);
        return;
    }

    // Dessiner la courbe de preview
    noFill();
    stroke(56, 189, 248, 180);
    strokeWeight(TRACK_WIDTH);
    beginShape();
    curveVertex(editPoints[editPoints.length - 1].x, editPoints[editPoints.length - 1].y);
    for (let p of editPoints) curveVertex(p.x, p.y);
    curveVertex(editPoints[0].x, editPoints[0].y);
    curveVertex(editPoints[1].x, editPoints[1].y);
    endShape(CLOSE);

    // Ligne centrale
    stroke(255, 255, 100, 200);
    strokeWeight(2);
    beginShape();
    curveVertex(editPoints[editPoints.length - 1].x, editPoints[editPoints.length - 1].y);
    for (let p of editPoints) curveVertex(p.x, p.y);
    curveVertex(editPoints[0].x, editPoints[0].y);
    curveVertex(editPoints[1].x, editPoints[1].y);
    endShape(CLOSE);

    // Points de contrôle
    for (let i = 0; i < editPoints.length; i++) {
        let p = editPoints[i];
        stroke(255);
        fill(editDragging === i ? '#ff6b6b' : '#38bdf8');
        strokeWeight(2);
        circle(p.x, p.y, 18);
        fill(255);
        noStroke();
        textSize(10);
        textAlign(CENTER, CENTER);
        text(i, p.x, p.y);
    }
}

function editorMousePressed() {
    if (!editMode) return;

    // Vérifier si on clique sur un point existant
    for (let i = 0; i < editPoints.length; i++) {
        let p = editPoints[i];
        if (dist(mouseX, mouseY, p.x, p.y) < 15) {
            if (mouseButton === RIGHT) {
                editPoints.splice(i, 1);
                return;
            }
            editDragging = i;
            return;
        }
    }

    // Ajouter un nouveau point si clic gauche
    if (mouseButton === LEFT) {
        editPoints.push({ x: mouseX, y: mouseY });
    }
}

function editorMouseDragged() {
    if (!editMode || editDragging === -1) return;
    editPoints[editDragging].x = mouseX;
    editPoints[editDragging].y = mouseY;
}

function editorMouseReleased() {
    editDragging = -1;
}

function applyEditorToTrack() {
    if (editPoints.length < 4) return;

    // Convertir les points de contrôle en chemin lisse
    let rawPoints = editPoints.map(p => [p.x, p.y]);
    let smooth = interpolatePoints(rawPoints, 15);
    smooth = smoothPoints(smooth, 0.4, 5);
    currentTrackPath = resamplePoints(smooth, 8);

    // Reconstruire murs et checkpoints
    rebuildTrackFromPath();

    editMode = false;
    appMode = 'train';
    resetTraining();
    updateUI();
}

function rebuildTrackFromPath() {
    walls = [];
    checkpoints = [];
    let centerPoints = currentTrackPath;
    const innerPoints = [], outerPoints = [];

    for (let i = 0; i < centerPoints.length; i++) {
        let p1 = centerPoints[(i - 15 + centerPoints.length) % centerPoints.length];
        let p2 = centerPoints[(i + 15) % centerPoints.length];
        let normal = createVector(-(p2[1] - p1[1]), p2[0] - p1[0]).normalize();
        let pCurr = centerPoints[i];
        let halfW = TRACK_WIDTH / 2;
        innerPoints.push([pCurr[0] + normal.x * halfW, pCurr[1] + normal.y * halfW]);
        outerPoints.push([pCurr[0] - normal.x * halfW, pCurr[1] - normal.y * halfW]);
    }

    const cpStep = 4;
    for (let i = 0; i < innerPoints.length; i++) {
        let pi1 = innerPoints[i], pi2 = innerPoints[(i + 1) % innerPoints.length];
        walls.push(new Boundary(pi1[0], pi1[1], pi2[0], pi2[1], "wall"));
        let po1 = outerPoints[i], po2 = outerPoints[(i + 1) % outerPoints.length];
        walls.push(new Boundary(po1[0], po1[1], po2[0], po2[1], "wall"));
        if (i % cpStep === 0) {
            checkpoints.push(new Boundary(innerPoints[i][0], innerPoints[i][1], outerPoints[i][0], outerPoints[i][1], "checkpoint"));
        }
    }

    let startIdx = floor(centerPoints.length * 0.05);
    startX = centerPoints[startIdx][0];
    startY = centerPoints[startIdx][1];
    let nextIdx = (startIdx + 10) % centerPoints.length;
    window.startAngle = Math.atan2(centerPoints[nextIdx][1] - startY, centerPoints[nextIdx][0] - startX);
    window.startCheckpointIndex = (Math.floor(startIdx / cpStep) + 1) % checkpoints.length;
}

// Sauvegarde / Restauration de circuits
function saveCurrentCircuit(name) {
    if (!name) name = 'Circuit ' + (savedCircuits.length + 1);
    savedCircuits.push({
        name: name,
        path: JSON.parse(JSON.stringify(currentTrackPath)),
        difficulty: TRACK_DIFFICULTY,
        width: TRACK_WIDTH,
        timestamp: new Date().toISOString()
    });
    updateCircuitList();
    localStorage.setItem('savedCircuits', JSON.stringify(savedCircuits));
}

function loadCircuit(idx) {
    if (idx < 0 || idx >= savedCircuits.length) return;
    let c = savedCircuits[idx];
    currentTrackPath = c.path;
    TRACK_DIFFICULTY = c.difficulty;
    TRACK_WIDTH = c.width;
    rebuildTrackFromPath();
    resetTraining();
}

function loadCircuitsFromStorage() {
    try {
        let data = localStorage.getItem('savedCircuits');
        if (data) {
            savedCircuits = JSON.parse(data);
            updateCircuitList();
        }
    } catch (e) {}
}

function deleteCircuit(idx) {
    savedCircuits.splice(idx, 1);
    updateCircuitList();
    localStorage.setItem('savedCircuits', JSON.stringify(savedCircuits));
}

function exportCircuits() {
    let blob = new Blob([JSON.stringify(savedCircuits, null, 2)], { type: 'application/json' });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'circuits.json';
    a.click();
}

function importCircuits(file) {
    let reader = new FileReader();
    reader.onload = (e) => {
        try {
            let data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                savedCircuits = [...savedCircuits, ...data];
                updateCircuitList();
                localStorage.setItem('savedCircuits', JSON.stringify(savedCircuits));
            }
        } catch (err) { alert('Fichier invalide'); }
    };
    reader.readAsText(file);
}

function updateCircuitList() {
    let el = document.getElementById('circuit-list');
    if (!el) return;
    el.innerHTML = '';
    savedCircuits.forEach((c, i) => {
        let div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<span>${c.name}</span>
            <div class="item-btns">
                <button onclick="loadCircuit(${i})">▶</button>
                <button onclick="deleteCircuit(${i})">🗑</button>
            </div>`;
        el.appendChild(div);
    });
}
