/**
 * Configuration et UI - Gestion de l'interface utilisateur
 * Corrections : hiddenLayers et populationSize appliqués, loadCircuit, pause unifiée
 */

class ConfigManager {
  constructor() {
    this.isTraining = false;
    this.isPaused   = false;
    this.showDebug  = false;
    this.simSpeed   = 1;

    this._setupUIListeners();
    // updateStats() sera appelé dans draw() dès que population existe
  }

  _setupUIListeners() {
    // ── Réseau de neurones ──────────────────────────────────────
    this._bind('sensorCount', 'input', (val) => {
      const n = parseInt(val);
      if (window.population) population.updateConfig({ sensorCount: n });
    }, v => v);

    this._bind('hiddenLayers', 'input', () => {
      // Appliqué au prochain reset (topologie complète)
      this._applyTopology();
    });

    this._bind('hiddenNeurons', 'input', () => {
      this._applyTopology();
    });

    document.getElementById('activationFunction')?.addEventListener('change', (e) => {
      if (window.population) population.updateConfig({ activation: e.target.value });
    });

    // ── Génétique ───────────────────────────────────────────────
    this._bind('mutationRate', 'input', (val) => {
      if (window.population) population.config.mutationRate = parseFloat(val);
    }, v => parseFloat(v).toFixed(2));

    this._bind('populationSize', 'input', (val) => {
      // Taille appliquée au prochain reset seulement (pas en live)
      // afficher un indicateur
      const span = document.getElementById('populationSizeValue');
      if (span) span.textContent = val + ' (reset requis)';
    }, null, false); // ne pas setter le span dans _bind

    this._bind('lifespan', 'input', (val) => {
      if (window.population) population.config.lifespan = parseInt(val);
    });

    // ── Circuit ─────────────────────────────────────────────────
    document.getElementById('generateNewCircuit')?.addEventListener('click', () => {
      if (window.generateNewCircuit) generateNewCircuit();
    });

    document.getElementById('saveCircuit')?.addEventListener('click', () => {
      const name = prompt('Nom du circuit :');
      if (name && window.circuitManager && window.circuit) {
        circuitManager.saveCurrentCircuit(name, circuit);
        showNotification(`💾 Circuit "${name}" sauvegardé`);
      }
    });

    // loadCircuit géré dans sketch.js (après DOMContentLoaded)

    // ── Contrôles ────────────────────────────────────────────────
    document.getElementById('trainButton')?.addEventListener('click', () => {
      if (!this.isTraining) {
        this.isTraining = true;
        this.isPaused   = false;
      } else {
        this.isPaused = !this.isPaused;
      }
    });

    document.getElementById('pauseButton')?.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      const btn = document.getElementById('pauseButton');
      if (btn) btn.textContent = this.isPaused ? '▶ Continuer' : '⏸ Pause';
    });

    document.getElementById('resetButton')?.addEventListener('click', () => {
      this.isTraining = false;
      this.isPaused   = false;
      if (window.initializeTraining) initializeTraining();
      showNotification('🔄 Entraînement réinitialisé');
    });

    this._bind('speedSlider', 'input', (val) => {
      this.simSpeed = parseInt(val);
    }, v => v + 'x');

    // ── Cerveaux ─────────────────────────────────────────────────
    document.getElementById('saveBrain')?.addEventListener('click', () => {
      if (!window.population || !window.brainManager) return;
      const brain = population.getBestBrain();
      if (!brain) { showNotification('⚠️ Aucun cerveau disponible'); return; }
      const name = prompt('Nom du cerveau :');
      if (name) {
        brainManager.saveBrain(name, brain, {
          generation: population.generation,
          fitness:    population.stats.maxFitness,
          circuit:    window.circuit?.difficulty
        });
        this.updateBrainsList();
        showNotification(`💾 Cerveau "${name}" sauvegardé`);
      }
    });

    document.getElementById('exportBrains')?.addEventListener('click', () => {
      window.brainManager?.downloadJSON();
    });

    document.getElementById('importBrainsFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (window.brainManager) {
          const ok = brainManager.importJSON(ev.target.result);
          showNotification(ok ? '✅ Cerveaux importés' : '❌ Fichier invalide');
          this.updateBrainsList();
        }
      };
      reader.readAsText(file);
    });

    // ── ML5 ──────────────────────────────────────────────────────
    document.getElementById('enableHandControl')?.addEventListener('click', () => {
      if (typeof toggleHandControl === 'function') toggleHandControl();
    });

    document.getElementById('showDebug')?.addEventListener('change', (e) => {
      this.showDebug = e.target.checked;
    });

    // ── Condition d'arrêt configurable ───────────────────────────
    document.getElementById('targetSuccessRate')?.addEventListener('input', (e) => {
      if (window.stoppingCriteria) {
        stoppingCriteria.targetSuccessRate = parseFloat(e.target.value);
        const span = document.getElementById('targetSuccessRateValue');
        if (span) span.textContent = Math.round(parseFloat(e.target.value) * 100) + '%';
      }
    });

    document.getElementById('maxGenerations')?.addEventListener('input', (e) => {
      if (window.stoppingCriteria) {
        stoppingCriteria.maxGenerations = parseInt(e.target.value);
        const span = document.getElementById('maxGenerationsValue');
        if (span) span.textContent = e.target.value;
      }
    });
  }

  /**
   * Helper : lie un input range/text à un callback + affichage span
   */
  _bind(id, event, callback, displayFn, updateSpan = true) {
    const el   = document.getElementById(id);
    const span = document.getElementById(id + 'Value');
    if (!el) return;

    el.addEventListener(event, (e) => {
      const val = e.target.value;
      if (updateSpan && span && displayFn) span.textContent = displayFn(val);
      else if (updateSpan && span && !displayFn) span.textContent = val;
      callback(val);
    });
  }

  /**
   * Applique la nouvelle topologie (hidden layers × neurons)
   */
  _applyTopology() {
    if (!window.population) return;
    const layers = this.parseHiddenLayers();
    population.updateConfig({ hiddenLayers: layers });
  }

  /**
   * Met à jour les stats dans le panneau
   */
  updateStats() {
    if (!window.population) return;

    const stats = population.getStats();
    const s     = stats.stats || {};

    this._setText('genCount',        stats.generation);
    this._setText('fitnessMean',     (s.meanFitness || 0).toFixed(1));
    this._setText('fitnessMax',      (s.maxFitness  || 0).toFixed(1));
    this._setText('populationCount', stats.populationSize);
    this._setText('totalPopulation', stats.totalCount);
    this._setText('bestCheckpoint',  s.checkpointRecord || 0);

    const total      = stats.savedCount || 0;
    const successPct = total > 0
      ? ((s.successCount || 0) / total * 100).toFixed(1)
      : '0';
    this._setText('successRate', successPct + '%');
  }

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /**
   * Met à jour la liste des cerveaux
   */
  updateBrainsList() {
    if (!window.brainManager) return;
    const brainList = document.getElementById('brainList');
    if (!brainList) return;

    const brains = brainManager.listBrains();
    if (brains.length === 0) {
      brainList.innerHTML = '<p>Aucun cerveau sauvegardé</p>';
      return;
    }

    let html = '';
    for (const brain of brains) {
      const gen = brain.metadata?.generation || '?';
      const fit = brain.metadata?.fitness ? brain.metadata.fitness.toFixed(0) : '?';
      const cir = brain.metadata?.circuit  || '?';
      html += `
        <div class="brain-item">
          <div>
            <strong>${brain.name}</strong>
            <small>Gen ${gen} | Fit ${fit} | ${cir}</small>
          </div>
          <div>
            <button title="Charger" onclick="loadBrainToRace('${brain.name}')">▶</button>
            <button title="Supprimer" onclick="brainManager.deleteBrain('${brain.name}'); configManager.updateBrainsList();">🗑</button>
          </div>
        </div>`;
    }
    brainList.innerHTML = html;
  }

  /**
   * Lit la configuration complète depuis les sliders
   */
  getNetworkConfig() {
    return {
      sensorCount:    parseInt(document.getElementById('sensorCount')?.value    || 7),
      hiddenLayers:   this.parseHiddenLayers(),
      activation:     document.getElementById('activationFunction')?.value      || 'relu',
      mutationRate:   parseFloat(document.getElementById('mutationRate')?.value || 0.1),
      populationSize: parseInt(document.getElementById('populationSize')?.value  || 80),
      lifespan:       parseInt(document.getElementById('lifespan')?.value        || 400)
    };
  }

  /**
   * Construit le tableau hiddenLayers depuis les sliders
   */
  parseHiddenLayers() {
    const numLayers  = parseInt(document.getElementById('hiddenLayers')?.value  || 2);
    const numNeurons = parseInt(document.getElementById('hiddenNeurons')?.value || 16);

    // Décroissance : chaque couche a légèrement moins de neurones
    const layers = [];
    for (let i = 0; i < numLayers; i++) {
      layers.push(Math.max(4, Math.round(numNeurons * Math.pow(0.75, i))));
    }
    return layers;
  }
}

// ── Utilitaires globaux ─────────────────────────────────────────

function loadBrainToRace(name) {
  if (!window.brainManager || !window.circuit) return;
  const data = brainManager.getBrainData(name);
  if (!data) return;

  const brain = NeuralNetwork.deserialize(data);
  const fish  = new Fish(brain, { label: name });
  if (circuit.startPos) fish.setStartPos(circuit.startPos);

  // Ajouter le poisson à la population existante (si entraînement en cours)
  if (window.population) {
    population.population.push(fish);
    showNotification(`▶ Cerveau "${name}" ajouté à la population`);
  }
}

function showNotification(message, duration = 3500) {
  // Supprimer les anciennes notifs
  document.querySelectorAll('.notification').forEach(n => n.remove());

  const notif = document.createElement('div');
  notif.className   = 'notification';
  notif.textContent = message;
  document.body.appendChild(notif);

  setTimeout(() => notif.remove(), duration);
}

function showModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'block';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}