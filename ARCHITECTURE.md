# 🏗️ Architecture Technique - FishRace

## Structure Projet

```
mon_jeu/
├── index.html              # Page principale
├── sketch.js               # Boucle p5.js principale
├── style.css               # Styling
│
├── Core ML
│   ├── nn.js               # Classe NeuralNetwork (TensorFlow.js)
│   ├── ga.js               # Algorithme Génétique + Population
│   └── brain-manager.js    # Sauvegarde/chargement cerveaux
│
├── Simulation
│   ├── fish.js             # Classe Fish + Ray
│   ├── circuit.js          # Gestion circuits
│   └── config.js           # Configuration UI
│
├── Integration
│   ├── ml5-integration.js  # Détection pose ML5.js
│   └── jsconfig.json       # Config TypeScript
│
└── Documentation
    ├── README.md           # Présentation projet
    ├── USAGE_GUIDE.md      # Guide d'utilisation
    └── ARCHITECTURE.md     # Ce fichier
```

## Flux de Données Principal

```
┌─────────────────────────────────────────────────┐
│           Boucle Principal (sketch.js)          │
│                   draw()                        │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
    ┌────▼──────┐         ┌──────▼────┐
    │ Population│         │  Circuit  │
    │  (ga.js)  │         │(circuit.js)
    └────┬──────┘         └──────┬────┘
         │                       │
    ┌────▼──────────────┐        │
    │ Pour chaque Fish: │        │
    ├────────────────────┤       │
    │ applyBehaviors()   │────┐  │
    │ check()            │    │  │
    │ update()           │    │  │
    │ show()             │    │  │
    └────────────────────┘    │  │
                              │  │
                   ┌──────────▼──▼─┐
                   │look(walls)    │
                   │ - Cast rays   │
                   │ - Predict NN  │
                   │ - Apply force │
                   └───────────────┘
```

## Classes Principales

### NeuralNetwork (nn.js)

```javascript
class NeuralNetwork {
  // Constructor
  - inputNodes
  - hiddenLayers[]
  - outputNodes
  - activation
  - model (TensorFlow Sequential)
  
  // Methods
  + predict(inputs[]) → outputs[]
  + copy() → NeuralNetwork
  + mutate(rate)
  + serialize() → JSON
  + static deserialize(JSON) → NeuralNetwork
  + dispose()
}
```

**TensorFlow.js Usage:**
- `tf.sequential()` - Construire chaque couche
- `tf.layers.dense()` - Couches fully connected
- `model.predict()` - Évaluation
- `model.getWeights()` / `setWeights()` - Accès aux paramètres

### Fish (fish.js)

```javascript
class Fish {
  // Properties
  - pos, vel, acc (physique)
  - brain (NeuralNetwork)
  - rays[] (capteurs)
  - fitness, dead, finished
  - checkpointIndex
  
  // Methods
  + applyBehaviors(walls)
  + look(walls) → force
  + checkCheckpoints(checkpoints)
  + calculateFitness()
  + mutate(rate)
  + show()
  + clone() → Fish
}

class Ray {
  // Cast ray against wall
  + cast(wall) → intersection_point
}
```

### Population (ga.js)

```javascript
class Population {
  // Properties
  - population[] (Fish vivants)
  - savedFish[] (Fish morts/finis)
  - generation, stats
  
  // Methods
  + evaluate(circuit)
  + nextGeneration()
  + selectParent() → Fish (roulette)
  + calculateStats()
  + getBestFish() → Fish
  + dispose()
}

class StoppingCriteria {
  - maxGenerations
  - targetSuccessRate
  - stagnationThreshold
  
  + shouldStop(gen, stats) → boolean
}
```

### Circuit (circuit.js)

```javascript
class Circuit {
  - checkpoints[] (Boundary)
  - walls[] (Boundary)
  - startPos, endPos
  - difficulty
  
  + generateCircuit()
  + show()
  + serialize() → JSON
  + static deserialize(JSON) → Circuit
}

class CircuitManager {
  - circuits{} (localStorage)
  
  + createCircuit(name, difficulty)
  + getCircuit(name)
  + saveToStorage()
  + exportJSON()
}
```

## Pipeline d'Entraînement

### Étape 1: Initialisation
```javascript
// setup() dans sketch.js
circuit = new Circuit('medium')
population = new Population(100, config)
stoppingCriteria = new StoppingCriteria()
```

### Étape 2: Simulation (chaque frame)
```javascript
// draw() → simulateStep()
for (let fish of population) {
  fish.applyBehaviors(circuit.walls)
  fish.checkCheckpoints(circuit.checkpoints)
  fish.update()
}
```

### Étape 3: Évaluation (génération complète)
```javascript
// Quand population == 0
if (population.length == 0) {
  for (let fish of savedFish) {
    fish.calculateFitness()
  }
  
  // Normaliser fitness
  let sum = savedFish.map(f => f.fitness).sum()
  for (let fish of savedFish) {
    fish.fitness /= sum
  }
  
  // Créer nouvelle génération
  for (let i = 0; i < popSize; i++) {
    parent = selectParent()  // Roulette
    child = parent.clone()
    child.mutate(MUTATION_RATE)
    newPopulation.push(child)
  }
}
```

## Interaction avec TensorFlow.js

### Forward Pass (Prédiction)
```javascript
predict(inputs) {
  return tf.tidy(() => {
    const xs = tf.tensor2d([inputs])
    const ys = this.model.predict(xs)
    return Array.from(ys.dataSync())
  })
}
```

**tf.tidy():** Nettoie les tensors après utilisation (important pour mémoire!)

### Mutation des Poids
```javascript
mutate(rate) {
  tf.tidy(() => {
    const weights = this.model.getWeights()
    const newWeights = []
    
    for (let tensor of weights) {
      let values = tensor.dataSync().slice()
      
      for (let i = 0; i < values.length; i++) {
        if (Math.random() < rate) {
          values[i] += randomGaussian()
        }
      }
      
      newWeights.push(tf.tensor(values, tensor.shape))
    }
    
    this.model.setWeights(newWeights)
  })
}
```

### Sérialisation
```javascript
serialize() {
  return tf.tidy(() => {
    const weights = this.model.getWeights()
    return {
      config: this.config,
      weights: weights.map(w => ({
        data: Array.from(w.dataSync()),
        shape: w.shape
      }))
    }
  })
}
```

## Gestion UI (config.js)

### Listeners des Sliders
```javascript
// Mettre à jour config en temps réel
sensorCount.addEventListener('input', (e) => {
  population.updateConfig({ 
    sensorCount: parseInt(e.target.value) 
  })
})
```

### Mise à Jour Stats
```javascript
function updateStats() {
  document.getElementById('genCount').textContent = 
    population.generation
  document.getElementById('fitnessMean').textContent = 
    population.stats.meanFitness.toFixed(1)
  // etc.
}
```

## ML5.js Intégration

### Hand Pose Detection Flow
```javascript
// 1. Initialize
handPoseDetector = await ml5.handPose()

// 2. Estimate
handPoseDetector.estimateHands(canvas)
  .then(hands => processHandGestures(hands))

// 3. Process
if (hand.keypoints[0].y < 120) {  // Main levée
  controlledFish.applyForce(accelForce)
}
```

## Optimisation Performance

### Memory Management
- **tf.tidy():** Wrapper pour nettoyer tensors
- **dispose():** Explicitement libérer modèles
- **CPU Backend:** Lighter than WebGL sur petit modèles

### Computation
- **Vectorisation:** TensorFlow.js vectorise automatiquement
- **Batch Processing:** Prédictions par lot possible
- **Caching:** Rayons réutilisables frame à frame

### Rendering
- **Double Buffer:** p5.js gère
- **Selective Draw:** Afficher seulement si changement
- **Culling:** Pas implémenté (optimization future)

## Storage

### localStorage
```javascript
// Cerveaux
localStorage.setItem('fish_brains', JSON.stringify(brains))

// Circuits
localStorage.setItem('fish_circuits', JSON.stringify(circuits))

// Limite: ~5-10 MB par navigateur
```

### Export/Import JSON
```javascript
// Export (télécharger)
const blob = new Blob([jsonString])
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = 'fish-brains.json'
link.click()

// Import (parser)
const data = JSON.parse(jsonString)
```

## État Global

```javascript
// Gestionnaires
let circuit              // Circuit actuel
let population           // Population de poissons
let brainManager        // Gestion cerveaux
let circuitManager      // Gestion circuits
let configManager       // Configuration UI
let stoppingCriteria    // Conditions d'arrêt
let brainSession        // Historique session

// Mode
let gameMode            // 'training' | 'competition'
let isTrainingActive    // Booléen
```

## Boucle d'Événements

```javascript
setup()
  ↓
loop: draw()
  ├─ updateUI()         // Stats et contrôles
  ├─ simulateStep()     // Physique et NN
  ├─ circuit.show()     // Affichage
  ├─ population.show()  // Visualisation poissons
  ├─ drawDebugInfo()    // Stats écran
  └─ checkStoppingConditions()
```

## Points de Extensibilité

### 1. Ajouter Comportements
```javascript
// fish.js applyBehaviors()
applyBehaviors(walls) {
  let force = this.look(walls)
  
  // + Ajouter séparation
  force.add(this.separate(population))
  
  // + Ajouter cohésion
  force.add(this.cohesion(population))
  
  this.applyForce(force)
}
```

### 2. Modifier Fitness
```javascript
// fish.js calculateFitness()
calculateFitness() {
  // Changer formule ici
  this.fitness = checkpoints * 100
                + speed * 5          // Ajuster poids
                - collisions * 25    // Ajuster pénalité
}
```

### 3. Ajouter Capteurs
```javascript
// fish.js constructor
// Augmenter rays[]
for (let a = -anglex; a < anglex; a += step) {
  this.rays.push(new Ray(this.pos, a))
}
```

### 4. Nouvelle Architecture Réseau
```javascript
// nn.js buildLayers()
// Remplacer Dense par Conv/LSTM
layers.push(tf.layers.lstm({ units: 32 }))
```

## Testing & Debug

### Console Shortcuts
```javascript
DEBUG.getPopulationStats()      // Stats actuelles
DEBUG.getBestBrainInfo()        // Architecture meilleur
DEBUG.exportAllBrains()         // Export JSON
DEBUG.exportSession()           // Export historique
```

### Monitoring
```javascript
// Performance
console.time('generation')
simulateStep()
console.timeEnd('generation')

// Memory
performance.memory.usedJSHeapSize / 1048576  // MB
```

---

## Améliorations Futures

- [ ] Crossover génétique avancé (non juste copie)
- [ ] Coévolution multi-populations
- [ ] Speciation pour éviter convergence prématurée
- [ ] NEAT (activation de neurones progressifs)
- [ ] WebGL Backend (GPU)
- [ ] Réseaux récurrents (LSTM)
- [ ] Multi-objective fitness (Pareto)
- [ ] Constraints (max weights)

---

**Document Technique - FishRace 2025**
