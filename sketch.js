/**
 * FishRace - Main p5.js Sketch
 * Simulateur de course neuro-évolutionnaire avec poissons
 */

let circuit;
let population;
let brainManager;
let circuitManager;
let configManager;
let stoppingCriteria;
let brainSession;

// Mode
let gameMode = 'training'; // 'training', 'competition'

// Graphe fitness
let fitnessCanvas = null;

const CANVAS_WIDTH  = 1200;
const CANVAS_HEIGHT = 780;

let fps = 0;

function setup() {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.parent('canvas-container');

  // TF sur CPU (plus stable pour petits réseaux)
  tf.setBackend('cpu');

  circuitManager   = new CircuitManager();
  brainManager     = new BrainManager();
  stoppingCriteria = new StoppingCriteria();
  brainSession     = new BrainSession();

  // ConfigManager en dernier (il lit les sliders déjà présents dans le DOM)
  configManager = new ConfigManager();

  // Circuit initial
  const difficulty = document.getElementById('circuitDifficulty')?.value || 'medium';
  circuit = new Circuit({ difficulty });

  // Population
  initializeTraining();

  // ML5
  initializeML5Controls();

  console.log('FishRace prêt !');
}

/**
 * Initialise une session d'entraînement
 */
function initializeTraining() {
  if (population) population.dispose();

  const config = configManager ? configManager.getNetworkConfig() : {};

  population = new Population(config.populationSize || 80, {
    mutationRate: config.mutationRate || 0.1,
    lifespan:     config.lifespan     || 400,
    sensorCount:  config.sensorCount  || 7,
    hiddenLayers: config.hiddenLayers || [16, 12],
    activation:   config.activation   || 'relu'
  });

  // Positionner tous les poissons au départ
  if (circuit && circuit.startPos) {
    population.setStartPos(circuit.startPos);
  }

  stoppingCriteria.reset();
  brainSession.reset();
  gameMode = 'training';

  if (configManager) {
    configManager.isTraining = false;
    configManager.updateStats();
  }
}

function draw() {
  background(20, 20, 28);

  fps = frameRate();

  // Simulation (plusieurs cycles si accélération)
  const cycles = (configManager?.simSpeed || 1);
  if (configManager?.isTraining && !configManager?.isPaused) {
    for (let c = 0; c < cycles; c++) {
      simulateStep();
    }
  }

  // Dessin
  circuit.show();
  if (population) population.show(configManager?.showDebug || false);

  // ML5
  updateML5Controls();
  drawML5Debug();

  // HUD
  drawHUD();

  // Graphe fitness (coin haut droit)
  drawFitnessGraph();

  // Conditions d'arrêt
  checkStoppingConditions();

  // Mise à jour UI (stats)
  if (configManager) configManager.updateStats();
  updateTrainButtonText();
}

function simulateStep() {
  if (!population || !circuit) return;
  population.evaluate(circuit);
}

function checkStoppingConditions() {
  if (!population || !configManager?.isTraining) return;

  const reason = {};
  if (stoppingCriteria.shouldStop(population.generation, population.stats, reason)) {
    configManager.isTraining = false;
    showNotification(`🏁 Entraînement terminé : ${reason.value}`);

    // Auto-sauvegarder le meilleur cerveau
    const best = population.getBestBrain();
    if (best && brainManager) {
      const name = `Auto_Gen${population.generation}`;
      brainManager.saveBrain(name, best, {
        generation: population.generation,
        fitness:    population.stats.maxFitness,
        circuit:    circuit?.difficulty
      });
      configManager.updateBrainsList();
      showNotification(`💾 Cerveau sauvegardé : ${name}`);
    }
  }
}

function updateTrainButtonText() {
  const btn = document.getElementById('trainButton');
  if (!btn || !configManager) return;
  const txt = configManager.isTraining
    ? (configManager.isPaused ? '▶ Continuer' : '⏸ Pause')
    : '▶ Entraîner';
  if (btn.textContent !== txt) btn.textContent = txt;
}

/**
 * HUD (génération, fps, etc.)
 */
function drawHUD() {
  push();
  fill(255, 255, 255, 200);
  noStroke();
  textSize(12);
  textAlign(LEFT);

  let y = 20;
  text(`FPS: ${fps.toFixed(1)}`, 10, y); y += 16;

  if (population) {
    const stats = population.getStats();
    text(`Génération : ${stats.generation}`, 10, y); y += 16;
    text(`Pop active : ${stats.populationSize} / ${stats.totalCount}`, 10, y); y += 16;

    if (stats.stats) {
      const mean = (stats.stats.meanFitness || 0).toFixed(1);
      const max  = (stats.stats.maxFitness  || 0).toFixed(1);
      text(`Fitness : ${mean} (max: ${max})`, 10, y); y += 16;

      const total = stats.savedCount || 0;
      const rate  = total > 0 ? ((stats.stats.successCount || 0) / total * 100).toFixed(1) : '0';
      text(`Taux réussite : ${rate}%`, 10, y); y += 16;
    }

    if (circuit) {
      const info = circuit.getInfo();
      text(`Circuit : ${info.difficulty} (${info.numCheckpoints} CPs)`, 10, y); y += 16;
    }
  }

  if (configManager?.isTraining) {
    fill(0, 220, 100, 220);
    text(configManager.isPaused ? '⏸ EN PAUSE' : '🟢 EN COURS', 10, y);
  } else {
    fill(200, 200, 200, 150);
    text('⏹ ARRÊTÉ', 10, y);
  }

  pop();
}

/**
 * Mini-graphe de l'évolution de la fitness
 */
function drawFitnessGraph() {
  if (!population || !population.stats.fitnessHistory) return;
  const history = population.stats.fitnessHistory;
  if (history.length < 2) return;

  const gx = width - 220, gy = 15, gw = 200, gh = 80;

  push();
  // Fond
  fill(0, 0, 0, 150);
  noStroke();
  rect(gx - 5, gy - 5, gw + 10, gh + 20, 4);

  // Axes
  stroke(100);
  strokeWeight(1);
  line(gx, gy, gx, gy + gh);
  line(gx, gy + gh, gx + gw, gy + gh);

  const maxVal = Math.max(...history.map(h => h.max), 1);

  // Courbe max fitness (jaune)
  stroke(255, 220, 0);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let i = 0; i < history.length; i++) {
    const x = map(i, 0, history.length - 1, gx, gx + gw);
    const y = map(history[i].max, 0, maxVal, gy + gh, gy);
    vertex(x, y);
  }
  endShape();

  // Courbe mean fitness (bleu)
  stroke(100, 180, 255);
  strokeWeight(1);
  noFill();
  beginShape();
  for (let i = 0; i < history.length; i++) {
    const x = map(i, 0, history.length - 1, gx, gx + gw);
    const y = map(history[i].mean, 0, maxVal, gy + gh, gy);
    vertex(x, y);
  }
  endShape();

  // Labels
  noStroke();
  textSize(9);
  textAlign(LEFT);
  fill(255, 220, 0);
  text('■ Max', gx, gy + gh + 14);
  fill(100, 180, 255);
  text('■ Moy', gx + 50, gy + gh + 14);
  fill(180);
  text(`Gen ${history[history.length-1].gen}`, gx + 120, gy + gh + 14);

  pop();
}

/**
 * Touches clavier
 */
function keyPressed() {
  switch (key.toLowerCase()) {
    case 't':
      if (configManager) {
        if (!configManager.isTraining) {
          configManager.isTraining = true;
          configManager.isPaused   = false;
        } else {
          configManager.isPaused = !configManager.isPaused;
        }
      }
      break;
    case ' ':
      if (configManager) configManager.isPaused = !configManager.isPaused;
      break;
    case 'd':
      if (configManager) configManager.showDebug = !configManager.showDebug;
      break;
    case 'r':
      initializeTraining();
      break;
    case 's':
      quickSaveBrain();
      break;
    case 'n':
      generateNewCircuit();
      break;
    case 'h':
      toggleHandControl();
      break;
  }
  return false;
}

function quickSaveBrain() {
  if (!population || !brainManager) return;
  const brain = population.getBestBrain();
  if (brain) {
    const name = `Brain_G${population.generation}_${Date.now() % 10000}`;
    brainManager.saveBrain(name, brain, {
      generation: population.generation,
      fitness:    population.stats.maxFitness
    });
    configManager?.updateBrainsList();
    showNotification(`💾 Cerveau sauvegardé : ${name}`);
  }
}

function generateNewCircuit() {
  const difficulty = document.getElementById('circuitDifficulty')?.value || 'medium';
  circuit = new Circuit({ difficulty });
  if (population) population.reset(circuit);
  showNotification(`🔄 Nouveau circuit ${difficulty} généré`);
}

/**
 * Clic souris : ajouter obstacle avec SHIFT, activer braquage manuel sinon
 */
function mousePressed() {
  // Vérifier qu'on est dans le canvas (pas dans le panneau de droite)
  if (mouseX > width - 350) return false;

  if (keyIsDown(SHIFT)) {
    circuit.addObstacle(mouseX, mouseY, 22);
    showNotification(`⛔ Obstacle ajouté en (${mouseX.toFixed(0)}, ${mouseY.toFixed(0)})`);
  }
  return false;
}

/**
 * Mode compétition
 */
function startCompetition(brainNames) {
  const brains = brainNames
    .map(name => brainManager.getBrainData(name))
    .filter(Boolean);

  if (brains.length < 2) {
    showNotification('⚠️ Sélectionnez au moins 2 cerveaux');
    return;
  }

  if (population) population.dispose();

  const config = configManager.getNetworkConfig();
  population = Population.createCompetition(brains, {
    lifespan:    config.lifespan,
    sensorCount: config.sensorCount,
    maxSpeed:    4,
    maxForce:    0.25
  });

  if (circuit && circuit.startPos) population.setStartPos(circuit.startPos);

  gameMode = 'competition';
  configManager.isTraining = true;
  configManager.isPaused   = false;

  showNotification(`🏆 Compétition : ${brains.length} cerveaux en lice !`);
}

/**
 * Met à jour la liste pour le modal compétition
 */
function updateCompetitionBrainsList() {
  const brainList = document.getElementById('competitionBrains');
  if (!brainList || !brainManager) return;

  const brains = brainManager.listBrains();

  if (brains.length === 0) {
    brainList.innerHTML = '<p>Aucun cerveau sauvegardé. Entraînez d\'abord une population.</p>';
    return;
  }

  let html = '<div style="max-height:200px;overflow-y:auto;">';
  for (const brain of brains) {
    const gen = brain.metadata?.generation || '?';
    const fit = brain.metadata?.fitness    ? brain.metadata.fitness.toFixed(0) : '?';
    html += `
      <label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer">
        <input type="checkbox" class="competition-brain-checkbox" value="${brain.name}">
        <strong>${brain.name}</strong>
        <small style="color:#aaa">Gen ${gen} | Fit ${fit}</small>
      </label>`;
  }
  html += '</div>';
  brainList.innerHTML = html;
}

// Gestion modales
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', e => e.target.closest('.modal').style.display = 'none');
  });
  window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
  });

  document.getElementById('competitionMode')?.addEventListener('click', () => {
    showModal('competitionModal');
    updateCompetitionBrainsList();
  });

  document.getElementById('startCompetition')?.addEventListener('click', () => {
    const checked  = document.querySelectorAll('.competition-brain-checkbox:checked');
    const selected = Array.from(checked).map(el => el.value);
    if (selected.length < 2) { alert('Sélectionnez au moins 2 cerveaux'); return; }
    startCompetition(selected);
    closeModal('competitionModal');
  });

  document.getElementById('exportBrains')?.addEventListener('click', () => {
    brainManager?.downloadJSON();
  });

  document.getElementById('loadCircuit')?.addEventListener('click', () => {
    const circuits = circuitManager.listCircuits();
    if (circuits.length === 0) { alert('Aucun circuit sauvegardé'); return; }
    const names = circuits.map(c => c.name).join('\n');
    const choice = prompt(`Circuits disponibles :\n${names}\n\nNom du circuit à charger :`);
    if (choice) {
      const loaded = circuitManager.getCircuit(choice);
      if (loaded) {
        circuit = loaded;
        if (population) population.reset(circuit);
        showNotification(`📂 Circuit "${choice}" chargé`);
      } else {
        alert(`Circuit "${choice}" introuvable`);
      }
    }
  });
});

// Instanciation p5.js
new p5((instance) => {
  _attachP5Globals(instance);
  instance.setup       = setup;
  instance.draw        = draw;
  instance.keyPressed  = keyPressed;
  instance.mousePressed = mousePressed;
});

function _attachP5Globals(instance) {
  const names = [
    'createCanvas','createVector','createGraphics','createCapture','image',
    'random','noise','map','constrain','dist','abs','floor','ceil',
    'push','pop','fill','stroke','noStroke','noFill','strokeWeight',
    'line','circle','rect','ellipse','beginShape','vertex','endShape',
    'background','frameRate','textSize','textAlign','textFont','text',
    'angleMode','translate','rotate','TWO_PI','PI','CLOSE','LEFT','CENTER','RIGHT',
    'mouseIsPressed','keyIsDown','mouseX','mouseY','VIDEO','SHIFT',
    'color','red','green','blue','lerpColor'
  ];
  names.forEach(name => {
    if (typeof instance[name] === 'function') {
      window[name] = instance[name].bind(instance);
    } else if (name in instance) {
      Object.defineProperty(window, name, { get() { return instance[name]; }, configurable: true });
    }
  });
  ['width','height','frameCount'].forEach(name => {
    Object.defineProperty(window, name, { get() { return instance[name]; }, configurable: true });
  });
}

// DEBUG console
window.DEBUG = {
  stats()     { return population?.getStats(); },
  bestBrain() { return population?.getBestFish()?.brain?.getInfo(); },
  exportAll() { return brainManager?.exportJSON(); },
  circuit()   { return circuit?.getInfo(); },
  tfMemory()  { return tf.memory(); }
};