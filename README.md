# 🐟 FishRace: Neuro-Evolutionary Racing Simulator

## Projet Description

**FishRace** est un simulateur de course éducatif basé sur l'apprentissage par réseaux de neurones et algorithmes neuro-évolutifs. Des poissons (agents) apprennent à naviguer dans un circuit changeant en utilisant un réseau de neurones entraîné par algorithme génétique.

### Objectif Principal

Démontrer comment:
- Un réseau de neurones peut apprendre des comportements complexes (navigation)
- Un algorithme génétique peut optimiser les poids du réseau (cerveau)
- Un système peut généraliser et s'adapter à de nouveaux environnements

### Inspirations et Concepts

Basé sur l'exemple `9-VoitureSuitCircuit genetic algo` du cours, mais amélioré avec:
- Architecture de réseau configurable (nombre de couches, neurones, fonctions d'activation)
- Interface de configuration complète avec curseurs
- Système de sauvegarde/chargement de cerveaux
- Compétition entre différents cerveaux
- Génération progressive de circuits difficiles
- Intégration ML5.js pour contrôle par gestes

---

## 🎮 Fonctionnalités Principales

### 1. Apprentissage Automatique (Training)
- **Réseau de neurones dynamique**: Configuration complète en temps réel
  - Nombre de capteurs en entrée (rayons)
  - Nombre de couches cachées
  - Nombre de neurones par couche
  - Fonction d'activation (sigmoid, relu, tanh)
- **Algorithme génétique**: Sélection par roulette avec mutation
- **Fonction de fitness**: `score = distance + (vitesse × coefficient)`

### 2. Édition de Circuit
- **Générateur aléatoire**: Circuits procéduraux avec Perlin noise
- **Complexité progressive**: 3 niveaux (facile, moyen, difficile)
- **Éditeur manuel**: Cliquer pour ajouter des points de contrôle
- **Sauvegarde**: Sauvegarder/charger circuits en JSON

### 3. Sauvegarde de Cerveaux
- Le meilleur cerveau de chaque génération est sauvegardé en localStorage
- Charger un cerveau entraîné dans une compétition
- Exporter/importer ceveaux via JSON

### 4. Compétition
- Charger plusieurs cerveaux pré-entraînés
- Les faire concourir sur le même circuit
- Afficher les statistiques en direct

### 5. Comportements Supplémentaires
- **Séparation**: Les poissons gardent une distance
- **Cohésion**: Suivre le groupe
- **Évitement d'obstacles**: Obstacles cliquables

### 6. Intégration ML5.js
- **Contrôle par gestes**: Main levée = accélération
- **Détection de pose**: Orientation de la tête = direction
- **Détection d'émotion**: Mode fun (poisson triste/détenu contrôlé par webcam)

---

## 🏗️ Architecture Technique

### Fichiers Clés

```
mon_jeu/
├── index.html           # Interface principale
├── sketch.js           # Boucle p5.js principale
├── nn.js              # Classe NeuralNetwork (TensorFlow.js)
├── ga.js              # Algorithme génétique
├── fish.js            # Classe Fish (véhicule)
├── circuit.js         # Gestion des circuits
├── config.js          # Configuration et UI
├── brain-manager.js   # Sauvegarde/chargement de cerveaux
├── ml5-integration.js # Intégration ML5.js
├── style.css          # Styles
├── libraries/         # p5.js, TensorFlow.js, ML5.js
│   ├── p5.min.js
│   ├── tf.min.js
│   └── ml5.min.js
└── README.md          # Documentation
```

### Classes Principales

#### `NeuralNetwork`
```javascript
// Paramètres configurables
new NeuralNetwork({
  inputNodes: 7,           // Nombre de capteurs
  hiddenLayers: [16, 16],  // Couches cachées
  outputNodes: 2,          // Direction + vitesse
  activationFunctions: ['sigmoid', 'relu'],
  learningRate: 0.01
})
```

#### `Fish`
Agent de race avec:
- Rayons capteurs (7-13 par défaut)
- Réseau de neurones
- Physique (position, vélocité, accélération)
- Traçage du checkpoint

#### `Circuit`
Représente un circuit avec:
- Points de contrôle (waypoints)
- Murs intérieurs et extérieurs
- Détection de collision

### Fonction de Fitness

```
fitness = distance_checkpoints + (vitesse_moyenne × 0.5) - (collisions × 10)
```

Pondération:
- 60% distance (encourage à progresser)
- 30% vitesse (récompense la rapidité)
- 10% pénalité collision (éviter les murs)

### Conditions d'Arrêt du Entraînement

L'entraînement s'arrête quand **l'une** des conditions est remplie:
1. **Succès**: 60% des poissons passent au moins 2 tours sans collision
2. **Timeout**: 200 générations atteintes
3. **Convergence**: Fitness moyenne stagnante pendant 50 générations

---

## 🎛️ Interface Utilisateur

### Mode Entraînement (Training)
- **Sliders de configuration**
  - Nombre d'entrées (sensors)
  - Nombre de couches cachées
  - Neurones par couche
  - Fonction d'activation
  - Taux de mutation
  - Taille de population
  - Niveau de difficulté circuit

- **Contrôles d'entraînement**
  - ▶ Play / ⏸ Pause
  - ⏸ &rarr; ▶ Vitesse d'exécution (1x-10x)
  - 🔄 Réinitialiser
  - 💾 Sauver meilleur cerveau

### Mode Compétition
- Charger jusqu'à 5 cerveaux
- Les faire courir ensemble
- Afficher classement temps réel
- Replay du meilleur tour

### Édition de Circuit
- Drag & drop points de contrôle
- Générer nouveau circuit
- Augmenter/diminuer complexité
- Sauvegarder favoris

---

## 🧠 Algorithme Génétique Détaillé

### Étape 1: Évaluation
```javascript
function calculateFitness() {
  for (each fish) {
    - Compter checkpoints passés
    - Calculer distance parcourue
    - Calculer vitesse moyenne
    - Appliquer pénalités collision
  }
  normalize(fitness) // Somme = 1
}
```

### Étape 2: Sélection (Roulette)
```javascript
function pickParent() {
  wheel = fitness values
  spin = random(0, 1)
  return selectedFish based on fitness weight
}
```

### Étape 3: Reproduction avec Mutation
```javascript
for (next generation) {
  parent = pickParent()
  child = parent.copy()
  child.mutate(MUTATION_RATE)
  
  mutate: for each weight {
    if (random() < rate) {
      weight += gaussian_noise()
    }
  }
}
```

### Étape 4: Remplacela Génération
Nouvelle population = tous les enfants

---

## 🚀 Comment Utiliser

### Démarrer
1. Ouvrir `index.html` dans un navigateur
2. Configurer réseau de neurones via sliders
3. Cliquer "Train"

### Phase d'Entraînement
- Observer les poissons naviguer
- Adapater sliders en temps réel
- Sauver meilleur cerveau quand fitness stagne
- Augmenter difficulté du circuit progressivement

### Compétition
1. Entraîner 3-5 cerveaux sur même circuit
2. Cliquer "Competition Mode"
3. Charger les cerveaux sauvegardés
4. Lancer la course

### ML5 Hand Control
1. Cliquer "Enable Hand Control"
2. Se positionner face à la webcam
3. Lever la main pour accélérer
4. Incliner tête pour tourner

---

## 🎯 Résultats Attendus

### Après 10-20 générations
- Les poissons commencent à éviter les murs
- Traçage approximatif du circuit

### Après 50-100 générations
- Navigation fluide et prévisible
- Passage consistant des checkpoints

### Après 200+ générations
- Comportement quasi-optimal
- Peut généraliser à circuits nouveaux (après ré-entraînement court)

---

## 📊 Statistiques à l'Écran

Pendant l'entraînement:
```
Génération: 42
Fitness Mean: 128.5 | Max: 512
Population: 52/100 vivants
Meilleur poisson: Checkpoint 8/12
```

---

## 🎨 Stratégies Créatives

### "Généralisabilité"
- Entraîner sur circuit facile → simple
- Entraîner sur circuit moyen → adapté
- Entraîner sur circuit difficile → intelligent
- Tester ancien cerveau sur nouveau circuit
- Observer performance dégradée = pas généralisable
- Re-entraîner court terme pour adapter

### "Compétitions Thématiques"
- "Poisson Frétillant" (petit réseau)
- "Poisson Penseur" (grand réseau)
- Les faire concourir sur même circuit

### "Évolution du Circuit"
- Circuit 1: Simple (5 waypoints)
- Circuit 2: Moyen (15 waypoints)
- Circuit 3: Difficile (30 waypoints, virages serrés)

Meta-évolution: Cerveau apprend d'abord circuit simple, puis re-entraîné sur complexe!

---

## 🔧 Paramètres Recommandés

### Pour Prototypage Rapide
```
Population: 50
Generations: 20
Sensors: 7
Hidden Layer: [16]
Activation: sigmoid
```

### Pour Résultat Optimal
```
Population: 200
Generations: 100-200
Sensors: 9-11
Hidden Layers: [32, 16]
Activation: relu
```

### Pour Créativité Maximale
```
Expérimenter avec:
- Sensors: 5, 13, 21 (impair préféré)
- Hidden Layers: [64], [32, 32, 16], [128, 64, 32]
- Mix activations: [relu, sigmoid, tanh]
- Mutation Rate: 0.05-0.5
```

---

## 📚 Références

- **Inspiration**: Example "9-VoitureSuitCircuit genetic algo" (cours AI M2)
- **Librairie ML**: TensorFlow.js, ML5.js
- **Gestion Contexte**: p5.js
- **Algorithme Base**: Simple Genetic Algorithm (SGA)
- **Réseaux Neuronés**: Multi-layer Perceptron (MLP)

---

## 👥 Auteurs

Projet M2 Intelligence Artificielle 2025-2026  
Binôme: [Votre nom ici]  
Date: Avril 2026

---

## 📝 Notes d'Implémentation

### Optimisations Appliquées
1. **TensorFlow.js avec CPU backend** (pas de WebGL) pour compatibilité
2. **Pool d'objets** pour rayons (éviter allocation/déallocation)
3. **Normalisation fitness** (sum = 1) pour sélection stable
4. **Early stopping** pour éviter over-training

### Déboggage
- Console.log fitness génération
- Afficher meilleur poisson en rouge
- Tracer rayons capteurs en debug mode
- Graphique fitness au fil du temps

---

## 🎮 Améliorations Futures

- [ ] Decision Trees pour pit stops
- [ ] Multi-circuit campaigns
- [ ] Leaderboard global
- [ ] Exportation vidéo replay
- [ ] Crossover génétique plus avancé
- [ ] Spectre d'activation visuel
- [ ] Téléchargement cerveaux comme fichiers

---

**Bon courage et amusez-vous! 🎉**
