# 🚀 Démarrage Rapide - FishRace

## Installation en 30 secondes

1. **Ouvrir le fichier:**
   ```
   /Users/abditafout/Documents/etudes/sys_IA/mon_jeu/index.html
   ```
   → Double-cliquer ou drag-drop dans votre navigateur

2. **Le jeu se charge** (quelques secondes pour p5.js + TensorFlow.js)

3. **Interface prête!** ✅

---

## Premiers Pas en 1 Minute

1. **Observer les sliders à droite** - ce sont vos configurations
2. **Cliquer "▶ Entraîner"** - les poissons commencent!
3. **Attendre quelques générations** - vous verrez les poissons s'améliorer
4. **Observer les stats** qui changent en temps réel

---

## Comprendre Ce Qu'il Se Passe

### Les Poissons
- Petits triangles colorés
- Les rayons bleus = leurs "yeux" (capteurs)
- Ils apprennent à naviguer le circuit vert

### Le Circuit
- Lignes blanches = les murs
- Points verts = les checkpoints à passer
- Plus loin = meilleur fitness

### Les Stats
- **Génération:** Itération de l'algorithme génétique
- **Fitness:** Score d'apprentissage
- **Population:** Combien de poissons vivants
- **Taux Réussite:** Pourcentage atteignant 2+ checkpoints

---

## 🎮 Configuration Recommandée pour Débuter

Utiliser les **préconfigurations** ci-dessous ou essayer les vôtres!

```
Sensors:        7 (défaut)
Hidden Layers:  1
Hidden Neurons: 16
Activation:     ReLU
Mutation:       0.1
Population:     100
Lifespan:       300
```

**Résultat attendu:** 50% succès en ~20-30 générations

---

## 💾 Sauvegarde Rapide

1. Une fois satisfait de l'apprentissage:
   - **Cliquer "💾 Sauver Meilleur Cerveau"**
   - Donner un nom (ex: `FastSchool_Gen50`)
   - ✅ Cerveau sauvegardé localement!

2. Charger ce cerveau plus tard:
   - Recharger la page
   - Le cerveau est toujours là! (localStorage)

---

## 🎥 Activer Contrôle par Main (Cool!)

1. **Cliquer "🖐 Activer Contrôle Main"**
2. **Autoriser accès webcam** (pop-up navigateur)
3. **Se positionner face à la caméra**
4. **Lever la main = poisson accélère!**

---

## 📚 Documentation Complète

| Fichier | Contenu |
|---------|---------|
| [README.md](README.md) | 📖 Présentation complète du projet |
| [USAGE_GUIDE.md](USAGE_GUIDE.md) | 🎮 Guide d'utilisation détaillé |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 🏗️ Architecture technique pour développeurs |

---

## ⌨️ Raccourcis Clavier

Pendant l'entraînement:
- **T** = Mettre en pause/reprendre
- **ESPACE** = Pause
- **D** = Mode Debug (voir rayons)
- **S** = Sauver le meilleur cerveau

---

## 🆘 Ça ne marche pas?

### Problème: Page blanche ou erreurs

**Solution:** 
- Vérifier la console (F12 → Console)
- Rafraîchir la page (Ctrl+R ou Cmd+R)
- Essayer un autre navigateur (Chrome recommandé)

### Problème: Très lent

**Solution:**
- Réduire population (50 au lieu de 100)
- Réduire neurons (8 au lieu de 16)
- Réduire sensors (5 au lieu de 7)
- Voir slider "Vitesse Simulation" (laisser à 1x)

### Problème: Main control ne fonctionne pas

**Solution:**
- Vérifier permissions webcam
- Bonne luminosité requise
- Attendre le chargement ML5.js (~5 sec)

---

## 🎯 Défi Progressif

### Niveau 1: Observer (5 min)
1. Lancer entraînement avec préconf
2. Observer poissons progresser
3. Comprendre la fitness qui monte

### Niveau 2: Expérimenter (15 min)
1. Changer sliders
2. Observer impact sur apprentissage
3. Quelle config est meilleure?

### Niveau 3: Compétition (30 min)
1. Entraîner 2-3 cerveaux différents
2. Sauver chacun
3. Mode Compétition → lancer race
4. Observer qui gagne!

### Niveau 4: Avancé (1h+)
1. Augmenter difficulté circuit progressivement
2. Voir si cerveau généralise
3. Mix contrôle main + IA
4. Créer portfolio de cerveaux

---

## 📊 Métriques de Succès

| Étape | Cible | Temps |
|-------|-------|-------|
| F1: Premiers mouvements | Population active | <5 gen |
| F2: Premiers checkpoints | 1-2 checkpoints | 5-15 gen |
| F3: Apprentissage stable | 60%+ taux réussite | 20-50 gen |
| F4: Optimisation | 80%+ taux réussite | 50-100 gen |

---

## 🎨 Idées Créatives

### Idée 1: Combat AI vs Hand Control
- Entraîner cerveau sur circuit facile
- Charger en mode compétition
- Vous contrôler manuellement vs IA
- Qui gagne?

### Idée 2: Généralisation Tester
- Entraîner sur circuit facile
- Augmenter à difficile
- Voir si cerveau s'adapte
- Documenter résultats

### Idée 3: Portfolio Cerveaux
- Entraîner 5 cerveaux différents (configurations variées)
- Sauver tous les 5
- Compétition finale sur circuit difficile
- Résultats impressionnants!

### Idée 4: ML5 Contrôle Avancé
- Main pose = direction + accélération
- Face expression = comportement (joyeux = rapide)
- Head pose = angle spécifique
- Créer gameplay unique!

---

## 📈 Progression Recommandée

1. **Jour 1:** Démarrage rapide + observation (30 min)
2. **Jour 2:** Expérimentation avec sliders (1h)
3. **Jour 3:** Compétition + sauvegarde (1h)
4. **Jour 4:** Mode complet + documentation (2h)

---

## 🎓 Concepts Clés à Comprendre

### Réseau de Neurones
- Reçoit info des capteurs (rayons)
- Décide quoi faire (angle + vitesse)
- Poids changent via algorithme génétique

### Algorithme Génétique
- Évaluation → Sélection → Reproduction → Mutation
- Meilleurs = plus de probabilité d'avoir enfants
- Mutations créent variations = exploration

### Fitness
- Score unique = performance
- Distance checkpoints + Vitesse - Collisions
- Plus haut = mieux

### Entraînement
- Population évaluée plusieurs fois
- Générations = itérations de GA
- Converge vers comportement optimal

---

## 🔗 Ressources Externes

- **p5.js:** https://p5js.org/
- **TensorFlow.js:** https://www.tensorflow.org/js
- **ML5.js:** https://learn.ml5js.org/
- **Nature of Code:** https://natureofcode.com/

---

## 📝 Checklist Finale

- [ ] Page s'ouvre sans erreur
- [ ] Poissons apparaissent et bougent
- [ ] Stats changent chaque génération
- [ ] Cerveau peut être sauvegardé
- [ ] Mode compétition fonctionne
- [ ] ML5 hand control fonctionne (optionnel)

---

## 🎉 Vous Êtes Prêt!

**Lancez `index.html` et amusez-vous avec la neuro-évolution!**

Des questions? Consulter la [USAGE_GUIDE.md](USAGE_GUIDE.md) détaillée.

---

**FishRace - L'apprentissage automatique en action! 🐟🧠**
