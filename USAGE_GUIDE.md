# 🎮 Guide d'Utilisation - FishRace

## 🚀 Démarrage Rapide

### Installation
1. Ouvrir `index.html` dans un navigateur moderne (Chrome, Firefox, Edge recommandé)
2. Les librairies p5.js, TensorFlow.js et ML5.js se chargent automatiquement
3. ✅ Interface prête!

### Premiers Pas
1. **Appuyer sur "▶ Entraîner"** pour démarrer l'entraînement
2. Observer les poissons naviguer le circuit
3. Les statistiques se mettent à jour en temps réel à droite

---

## 📊 Comprendre les Statistiques

| Stat | Significction |
|------|--------------|
| **Génération** | Nombre d'itérations de l'algorithme génétique |
| **Fitness Moy** | Score moyen de tous les poissons finis |
| **Fitness Max** | Meilleur score de cette génération |
| **Population Active** | Nombre de poissons encore vivants / Total |
| **Meilleur Checkpoint** | Le checkpoint le plus loin atteint |
| **Taux Réussite** | Pourcentage de poissons ayant fait >2 checkpoints |

**Objectif:** Atteindre 60% de taux de réussite pour arrêter l'entraînement automatiquement

---

## 🎛️ Configuration du Réseau de Neurones

### Sliders Configurables

#### Nombre de Capteurs (Entrées)
- **Range:** 3 à 21 (impair recommandé)
- **Par défaut:** 7
- **Effet:** Plus de capteurs = plus de données = réseau plus "intelligent" mais plus lent

**Recommandations:**
- Simple: 5 capteurs (vision avant/côtés)
- Normal: 7-9 capteurs
- Avancé: 11-13 capteurs
- Expert: 15-21 capteurs (très rapide, pas de web GPU!)

#### Nombre de Couches Cachées
- **Range:** 1 à 5
- **Par défaut:** 1
- **Effet:** Plus de couches = apprentissage plus complex mais plus long

**Recommandations:**
- 1 couche: apprentissage rapide
- 2 couches: bon équilibre
- 3+ couches: très profond, à tester avec GPU seulement

#### Neurones par Couche Cachée
- **Range:** 4 à 128
- **Par défaut:** 16
- **Effet:** Plus de neurones = plus de paramètres = meilleur apprentissage mais PLUS LENT

**Recommandations:**
- CPU: 4-32 neurones
- GPU: 64-256 neurones

#### Fonction d'Activation
- **Options:** Sigmoid, ReLU, Tanh
- **Recommandé:** ReLU (rapide, fait ses preuves)
- **Sigmoid:** Classique, marche aussi
- **Tanh:** Moins courant, à tester

---

## 🧬 Configuration Génétique

#### Taux de Mutation (Mutation Rate)
- **Range:** 0.01 à 0.5
- **Par défaut:** 0.1
- **Effet:** Probabilité de modification des poids à chaque génération

**Interprétation:**
- 0.05: Mutations légères, exploitation lente
- 0.1: Mutations modérées (recommandé)
- 0.3+: Mutations fortes, plus d'exploration

#### Taille Population
- **Range:** 20 à 500
- **Par défaut:** 100
- **Effet:** Nombre de poissons évalués par génération

**Trade-off:**
- 50: Rapide mais peu robuste
- 100: Équilibré (par défaut)
- 200+: Robuste mais très lent

#### Temps de Vie (Lifespan)
- **Range:** 100 à 1000 frames
- **Par défaut:** 300
- **Effet:** Combien de frames avant qu'un poisson "meurt"

**Formule:** `secondes ≈ lifespan / 60`

---

## 🎲 Préconfigurations Recommandées

### Pour Prototypage Rapide (< 1 min par génération)
```
Sensors: 5
Hidden Layers: 1
Hidden Neurons: 8
Activation: ReLU
Mutation: 0.15
Population: 50
Lifespan: 200
```

### Pour Bon Apprentissage (≈ 2-5 min par génération)
```
Sensors: 7-9
Hidden Layers: 1-2
Hidden Neurons: 16-32
Activation: ReLU
Mutation: 0.1
Population: 100
Lifespan: 300
```

### Pour Résultat Optimal (≈ 5-10 min par génération)
```
Sensors: 9-11
Hidden Layers: 2
Hidden Neurons: 32-64
Activation: ReLU + Sigmoid
Mutation: 0.08
Population: 200
Lifespan: 400
```

### Pour Créativité Maximale
```
Essayer:
- Sensors: 13 (beaucoup d'info)
- Hidden Layers: 3 (réseau profond!)
- Hidden Neurons: 64
- Activation toggle: ReLU→Sigmoid mi-réseaux
- Mutation: 0.05 (lent mais stable)
- Population: 50 (rapide pour expérimenter)
```

---

## 🎮 Contrôles Clavier

| Touche | Action |
|--------|--------|
| **T** | Toggle Entraînement ON/OFF |
| **ESPACE** | Pause/Reprendre |
| **D** | Debug Mode (affiche rayons) |
| **R** | Reset (nouvelle génération initiale) |
| **S** | Sauver le meilleur cerveau |
| **1-9** | Vitesse Simulation (1x-10x) |

### Souris
- **SHIFT + Clic:** Ajouter un obstacle (feature future)

---

## 💾 Sauvegarde & Chargement des Cerveaux

### Sauver un Cerveau
1. Un cerveau est sauvegardé dans **localStorage** du navigateur
2. Cliquer **"💾 Sauver Meilleur Cerveau"**
3. Donner un nom unique (ex: `FastCircuit_Gen50`)
4. ✅ Cerveau stocké localement

### Charger un Cerveau
1. Dans le panneau, la liste des cerveaux s'affiche
2. Cliquer sur un cerveau pour le... (feature: charger)
3. Le cerveau s'initialise et remplace la population courante

### Exporter en JSON
1. Cliquer **"📤 Exporter Cerveaux"**
2. Un fichier `fish-brains.json` se télécharge
3. Archiver ce fichier pour retrouver les cerveaux plus tard!

### Importer depuis JSON
1. Cliquer **"📂 Charger Circuit"** (UI temporaire)
2. Coller le JSON
3. ✅ Cerveaux restaurés

---

## 🏁 Circuit

### Changement de Difficulté
1. Dropdown **"Complexité"**: Facile / Moyen / Difficile
2. Cliquer **"🔄 Générer Nouveau Circuit"**
3. Population continue entraînement sur nouveau circuit

**Impact:**
- **Facile:** 5 waypoints, large piste → rapide d'apprendre
- **Moyen:** 15 waypoints, piste normale → apprentissage équilibré
- **Difficile:** 30 waypoints, virage serrés → apprentissage lent

### Progression Recommandée
1. Entraîner sur "Facile" jusqu'à 75% succès
2. Augmenter à "Moyen", réinitialiser pop
3. Sauver  best brain
4. Augmenter à "Difficile"
5. Charger previous brain et continuer
6. Observer si le cerveau généralise!

---

## 🏆 Mode Compétition

### Lancer Une Compétition
1. Cliquer **"🏆 Mode Compétition"**
2. Cocher les cerveaux à faire concourir
3. Cliquer **"Démarrer Compétition"**
4. Observer le classement temps réel!

### Cas d'Usage
- **Comparer apprentissages:** Même circuit, cerveaux différents
- **A/B Testing:** Mutation rate différents
- **Généralité:** Cerveau d'un circuit sur un autre
- **Portfolio:** "Voici mes 5 meilleurs cerveaux"

---

## 🎥 Intégration ML5.js (Contrôle par Main)

### Activer Contrôle Main
1. Cliquer **"🖐 Activer Contrôle Main"**
2. Autoriser l'accès à la webcam
3. Se positionner face à la caméra
4. Observer: un poisson est contrôlé par votre main!

### Gestes Supportés
- **Main levée (au-dessus de la tête):** Accélération
- **Main vers la gauche:** Tourner à gauche
- **Main vers la droite:** Tourner à droite
- **Main fermée:** Pas d'accélération

### Mode Debug
- Cocher **"Afficher Debug Info"**
- Voir les keypoints detectés en vert
- Les connexions entre les points tracées

### Troubleshooting Webcam
- Assurez-vous que HTTPS ou localhost
- Vérifiez les permissions du navigateur
- Bonne luminosité requise
- ML5.js peut être lent au chargement (~5sec)

---

## 📈 Comprendre la Fitness

### Formule Actuelle
```
fitness = checkpoints_passed * 100 
        + (average_speed * 10)
        - (collisions * 50)
```

### Interprétation
- **Priorité:** Passer des checkpoints (gros points)
- **Secondaire:** Vitesse (plus rapide = mieux)
- **Pénalité:** Collisions (très graves)

### Idées d'Amélioration
- Ajouter bonus "lap complet"
- Réduire pénalité collision si près de checkpoint
- Bonus différent par checkpoint atteint
- Penaliser la distance au checkpoint plus proche

---

## 🐛 Débuggage

### Mode Debug
1. Appuyer **D** ou cocher "Afficher Debug Info"
2. Voir les rayons capteurs en bleu/vert
3. Affichage FPS, Mémoire, Populations

### Affichage FPS
- **60+ FPS:** Performant
- **30-60 FPS:** Normal
- **<30 FPS:** Optimiser (réduire capteurs ou neurons)

### Vérifier Mémoire
- **Ouvrir DevTools:** F12 → Console
- **Commande:** `DEBUG.getPopulationStats()`
- Observe la mémoire utilisée par TensorFlow.js

### Raccourci Développeur
```javascript
// Dans la console du navigateur (F12)
DEBUG.getPopulationStats()        // Stats actuelles
DEBUG.getBestBrainInfo()          // Info réseau meilleur poisson
DEBUG.exportAllBrains()           // Export JSON brains
DEBUG.exportSession()             // Export session history
```

---

## ⚡ Optimisation Performance

### CPU vs GPU
- **Par défaut:** CPU (compatible partout)
- **Switch GPU:** Éditer `sketch.js` ligne ~50, remplacer 'cpu' par 'webgl'

### Réduire la Charge
1. ✅ **Baisser Pop Size:** 50 au lieu de 100
2. ✅ **Réduire Sensors:** 5 au lieu de 9
3. ✅ **1 Hidden Layer:** Au lieu de 2-3
4. ✅ **Baisser Lifespan:** 200 au lieu de 300
5. ✅ **Activate 1x speed:** Slider "Vitesse Simulation"

### Mesure Performance
```javascript
console.time('generation');
// ... simule une génération
console.timeEnd('generation');
```

---

## 📚 Concepts Clés

### Réseau de Neurones
- **Input:** Rayons capteurs (7 par défaut)
- **Hidden:** Couches traitant l'info
- **Output:** 2 neurones (angle + force)

### Algorithme Génétique
1. **Évaluation:** Calculer fitness chaque poisson
2. **Sélection:** Choisir meilleurs parents (roulette)
3. **Reproduction:** Créer enfants
4. **Mutation:** Modifier poids aléatoirement
5. **Remplace Population:** Nouvelle génération

### Fitness
- **Score unique** résumant la performance
- Détermine les chances de reproduction
- Meilleur fitness = plus d'enfants

### Mutation
- Modification **aléatoire** des poids du réseau
- Petit taux = stabilité mais exploration lente
- Grand taux = instabilité mais innovation rapide

---

## 🎯 Projet Final: Checklist

- [ ] Interface fonctionnelle
- [ ] Population s'entraîne et génère choix
- [ ] Stats affichées
- [ ] Sauvegarde/Chargement cerveaux
- [ ] Mode compétition
- [ ] ML5.js hand control(optionnel)
- [ ] Documentation complète
- [ ] README.md
- [ ] Résultats satisfaisants (60%+ succès)

---

## 💡 Idées de Projets Avancés

### Extension 1: Pit Stops
- Ressource "essence"
- Déterminer quand faire un pit stop
- Chemin vers pit stop + retour
- Arbre de décision pour la logique

### Extension 2: Multi-Circuits
- Entraîner sur circuit 1
- Tester sur circuit 2 → généralisation?
- Mesurer la généralité du cerveau

### Extension 3: Comportements Supplémentaires
- Séparation: éviter autres poissons
- Cohésion: rester près du groupe
- Alignement: avoir même vitesse groupe

### Extension 4: Éditeur de Circuit
- Cliquer pour ajouter waypoints
- Drag & drop pour ajuster
- Visualisation temps réel

### Extension 5: Statistiques Avancées
- Graphique fitness au fil du temps
- Heatmap zones du circuit
- Trajectoires sauvegardées

---

## 🎓 Références Pédagogiques

### Concepts
- **Genetic Algorithms:** Évolution artificielle, sélection naturelle
- **Neural Networks:** Apprentissage automatiaque, forward propagation
- **Steering Behaviors:** IA pour simulation physique
- **Neuro-Evolution:** Combiner GA + NN

### Inspirations
- Craig Reynolds - Boids flocking (1986)
- Kenneth Stanley - NEAT (2002)
- Daniel Shiffman - "Coding Train" (YouTube)

### À Lire
- *Artificial Intelligence for Games* - Ian Millington
- *The Nature of Code* - Daniel Shiffman (gratuit en ligne!)

---

## 🆘 FAQ

### Q: Le programme est très lent
**R:** Réduire les sensors (5 au lieu de 9), réduire population (50), réduire neurons (8)

### Q: Les poissons ne s'améliorent pas
**R:** Augmenter mutation rate (0.15-0.2), longer lifespan (400+), réduire population pour plus de générations

### Q: Erreur TensorFlow.js
**R:** Rafraîchir la page, vérifier console (F12), peut être problème CDN

### Q: Garder mes cerveaux d'une session à l'autre
**R:** "Exporter Cerveaux" en JSON, télécharger le fichier, l'archiver!

### Q: Quoi faire après entraînement?
**R:** Mode compétition, augmenter difficulté, changer topologie réseau, exporter pour portfolio!

---

**Bon apprentissage! 🎓 Amusez-vous avec la neuro-évolution! 🐟**
