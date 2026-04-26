# NevoRacing 🏎️

**Projet réalisé par Mathéo BALAZUC et Tafsout ABDI**

---

### Lien du Jeu : https://tafsoutabdi.github.io/jeu_sys_IA/

### Lien vidéo Youtube : 

## Sommaire

1. [Présentation du projet](#1-présentation-du-projet)
2. [Objectif pédagogique](#2-objectif-pédagogique)
3. [Réflexion et conception](#3-réflexion-et-conception)
4. [Architecture technique](#4-architecture-technique)
5. [Le réseau de neurones](#5-le-réseau-de-neurones)
6. [L'algorithme génétique](#6-lalgorithme-génétique)
7. [La fonction de fitness (détaillée)](#7-la-fonction-de-fitness-détaillée)
8. [Ce que le jeu permet de faire](#8-ce-que-le-jeu-permet-de-faire)
9. [Toutes les options disponibles](#9-toutes-les-options-disponibles)
10. [Intégration ML5.js](#10-intégration-ml5js)
11. [Correspondance avec les consignes](#11-correspondance-avec-les-consignes)
12. [Comment lancer le projet](#12-comment-lancer-le-projet)
13. [Pistes d'amélioration](#13-pistes-damélioration)

---

## 1. Présentation du projet

NevoRacing est une simulation de neuroévolution dans laquelle une population de voitures apprend, génération après génération, à parcourir un circuit automobile sans sortir de la piste. Aucune règle de conduite n'est programmée à la main : les voitures découvrent elles-mêmes comment tourner, accélérer et éviter les murs, uniquement grâce à l'évolution simulée de leur réseau de neurones.

Le projet est entièrement développé en JavaScript côté client, sans serveur, et tourne directement dans le navigateur. On a utilisé **p5.js** pour le rendu graphique, **TensorFlow.js** pour les réseaux de neurones, et **ML5.js** pour la partie contrôle gestuel.

---

## 2. Objectif pédagogique

On voulait illustrer concrètement deux grands concepts vus en cours :

- **Les algorithmes génétiques** : comment une population d'individus imparfaits peut, en se croisant et en mutant, converger vers une solution performante sans jamais avoir été « programmée » pour ça.
- **Les réseaux de neurones comme cerveaux** : chaque voiture dispose d'un réseau de neurones qui prend en entrée ce qu'elle « perçoit » de son environnement (distance aux murs, angle vers les prochains checkpoints, vitesse) et qui sort en retour une décision de conduite (tourner à gauche ou à droite, accélérer ou freiner).

L'idée c'était aussi de rendre le tout interactif et configurable, pour pouvoir expérimenter en direct avec les paramètres et observer leur effet sur l'apprentissage.

---

## 3. Réflexion et conception

### Pourquoi des voitures sur un circuit ?

C'est un problème classique de neuroévolution (le fameux « NEAT cars ») mais qu'on a voulu pousser beaucoup plus loin que la version basique. Un circuit, c'est bien car :

- L'environnement est **continu** : les voitures doivent prendre des décisions à chaque frame.
- La performance est **facilement mesurable** : nombre de checkpoints franchis, tours effectués.
- C'est **visuellement lisible** : on voit immédiatement si une génération est meilleure que la précédente.

### Comment on a décidé de la mise en œuvre

On a commencé par un projet de base (fourni), qui avait déjà une structure de circuit procédural et une ébauche de réseau de neurones à une seule couche cachée. À partir de là, on a identifié plusieurs axes d'amélioration :

**Côté réseau de neurones :**
Le réseau initial avait un nombre fixe d'entrées (5 rayons + 1 vitesse) et une architecture figée. On a voulu rendre ça totalement paramétrable : nombre de rayons, ajout de waypoints comme entrées, nombre de couches cachées, nombre de neurones par couche, fonction d'activation.

**Côté algorithme génétique :**
La condition d'arrêt était fixée à 60% dans le code. On a voulu rendre ce seuil paramétrable et ajouter une sauvegarde automatique du meilleur cerveau quand l'objectif est atteint.

**Côté circuit :**
Le circuit était entièrement procédural mais pas éditable. On a ajouté un éditeur de circuit manuel avec des points de contrôle déplaçables, ainsi qu'un système de sauvegarde/restauration pour constituer des « bibliothèques » de circuits (faciles, difficiles…).

**Côté généralisation :**
Un cerveau entraîné sur un seul circuit peut avoir tendance à « mémoriser » ce circuit plutôt qu'à apprendre à conduire en général. On a donc prévu de pouvoir facilement changer de circuit et retester un cerveau existant.

**Côté compétition :**
On a ajouté un mode course où l'on peut charger plusieurs cerveaux entraînés et les faire s'affronter sur le même circuit en même temps.

---

## 4. Architecture technique

```
projet-jeu-v2/
├── index.html              ← Interface complète (5 onglets)
├── css/
│   └── style.css           ← UI sombre, typographie Space Mono / Exo 2
└── js/
    ├── globals.js          ← Variables globales et configuration
    ├── utils.js            ← Fonctions utilitaires (distance point-segment…)
    ├── NeuralNetwork.js    ← Réseau de neurones multi-couches (TF.js)
    ├── Ray.js              ← Rayon de détection (ray casting)
    ├── Track.js            ← Générateur procédural de circuits
    ├── Car.js              ← Voiture (physique, capteurs, cerveau, affichage)
    ├── Genetic.js          ← Sélection par tournoi, mutation, nouvelle génération
    ├── CircuitEditor.js    ← Éditeur manuel de circuits + sauvegarde
    ├── BrainManager.js     ← Sauvegarde/chargement cerveaux + mode course
    ├── ML5Control.js       ← Contrôle gestuel via ML5.js HandPose
    └── main.js             ← Boucle principale p5.js + UI listeners
```

**Librairies utilisées :**

| Librairie | Version | Rôle |
|-----------|---------|------|
| p5.js | 1.9.0 | Rendu 2D, boucle de jeu, vecteurs |
| TensorFlow.js | 4.20.0 | Réseaux de neurones (inférence + gestion poids) |
| ML5.js | 1.x | HandPose — détection de la main via webcam |

---

## 5. Le réseau de neurones

### Architecture

Chaque voiture possède son propre réseau de neurones, construit avec TensorFlow.js en mode `tf.sequential`. L'architecture est entièrement configurable depuis l'interface.

```
Entrées (N) → [Couche cachée 1] → [Couche cachée 2…] → Sorties (2)
```

**Entrées possibles (configurables) :**

| Entrée | Description |
|--------|-------------|
| Rayons (1 à 12) | Distance normalisée au mur le plus proche dans chaque direction |
| Waypoints (0 à 5) | Pour chaque prochain checkpoint : distance normalisée + angle relatif à la direction de la voiture |
| Vitesse | Vitesse actuelle normalisée entre 0 et 1 |

Par défaut : 5 rayons + 2 waypoints (→ 4 valeurs) + 1 vitesse = **9 entrées**.

**Sorties (fixes) :**

| Sortie | Plage | Signification |
|--------|-------|---------------|
| Sortie 0 | [0, 1] → [-maxForce, +maxForce] | Force de braquage (gauche/droite) |
| Sortie 1 | [0, 1] → [0, vitesse max] | Poussée (accélération) |

**Fonctions d'activation disponibles :**
- `sigmoid` (défaut) — sortie lisse entre 0 et 1, bien adaptée aux sorties normalisées
- `relu` — plus rapide à converger, peut mieux fonctionner sur des topologies profondes
- `tanh` — centré sur 0, peut accélérer l'apprentissage
- `elu` — variante de ReLU plus douce sur les valeurs négatives

### Pourquoi les waypoints en entrée ?

Le réseau de base avec seulement les rayons peut apprendre à ne pas toucher les murs, mais il ne sait pas forcément dans quelle direction aller. En ajoutant les coordonnées relatives des prochains checkpoints comme entrées, on donne au réseau une information de direction explicite, ce qui accélère significativement la convergence.

### Initialisation et copie

Les poids sont initialisés aléatoirement (distribution normale). La méthode `copy()` utilise `tf.tidy()` pour cloner les tenseurs sans fuites mémoire. La méthode `mutate()` parcourt tous les poids et, avec une probabilité égale au taux de mutation, applique une perturbation gaussienne (`N(0, 0.1)`).

### Sérialisation

Les cerveaux sont sérialisables en JSON (méthodes `toJSON()` / `fromJSON()`), ce qui permet de les sauvegarder dans le `localStorage` et de les exporter/importer sous forme de fichiers `.json`.

---

## 6. L'algorithme génétique

On n'utilise pas de back-propagation : les réseaux ne sont jamais entraînés par gradient. L'apprentissage passe entièrement par l'évolution.

### Cycle d'une génération

```
1. Toutes les voitures roulent jusqu'à ce qu'elles soient toutes mortes
      → mort par collision avec un mur
      → mort par timeout (pas de progression en 20s)
      → mort par camping (tourne sur place)
      → mort par sens inverse (trop longtemps à l'envers)

2. On calcule la fitness de chaque voiture

3. On crée la nouvelle génération par sélection par tournoi + mutation

4. On libère les anciens cerveaux de la mémoire (tf.dispose)

5. Vérification de la condition d'arrêt
```

### Sélection par tournoi

On tire au sort 5 individus parmi les survivants de la génération. Le meilleur (fitness la plus haute) est sélectionné comme parent. On répète autant de fois que la taille de la population. C'est plus robuste que la roulette biaisée sur des populations hétérogènes.

### Anti-camping

Les voitures ont plusieurs mécanismes pour éviter les comportements parasites :
- **Vérification à 60 frames** : si la voiture n'a pas bougé de 40px, elle meurt.
- **Détection de rotation sur place** : si en 1 seconde elle n'a pas avancé de 20px en déplacement réel, elle accumule des pénalités.
- **Détection sens inverse** : produit scalaire entre la direction de la voiture et la direction théorique du circuit — si négatif trop longtemps, mort.
- **Timeout checkpoint** : si 20 secondes s'écoulent sans franchir de checkpoint, mort.

---

## 7. La fonction de fitness

C'est la fonction la plus importante de tout le projet — c'est elle qui oriente l'évolution vers le comportement qu'on veut.

### Formule

```
fitness = score_checkpoints + bonus_proximité
```

**Score de checkpoints (`score`) :**

| Événement | Points |
|-----------|--------|
| Franchissement d'un checkpoint | +50 pts |
| Tour complet (retour au départ) | +200 pts |

Le score est purement basé sur la progression dans le circuit. Une voiture qui fait un tour complet marque 200 + (nb_checkpoints × 50) points.

**Bonus de proximité :**

```javascript
let d = dist(voiture.pos, centre_prochain_checkpoint);
let bonus = map(d, 0, 400, 50, 0); // 50 pts si collé, 0 si à 400px+
fitness += max(0, bonus);
```

Ce bonus est crucial. Sans lui, deux voitures ayant toutes les deux franchi le même nombre de checkpoints ont la même fitness, même si l'une est juste devant le checkpoint suivant et l'autre vient juste de le passer. Le bonus permet de discriminer ces cas et de favoriser les voitures qui progressent.


## 8. Ce que le jeu permet de faire

### En mode entraînement

- Lancer une population de N voitures qui apprennent à conduire sur un circuit procédural.
- Observer en temps réel la progression génération par génération (HUD avec génération, voitures en vie, meilleur score, barre de progression vers la condition d'arrêt).
- La voiture leader (meilleur score actuel) est mise en vert avec ses rayons affichés en jaune et des lignes bleues vers les prochains waypoints.
- Modifier à la volée la vitesse max, la population, le taux de mutation, la condition d'arrêt.
- Configurer l'architecture du réseau de neurones (entrées, couches, neurones, activation) — chaque modification repart d'une population vierge.
- Sauvegarder le meilleur cerveau à tout moment avec un nom personnalisé.
- Changer de circuit à tout moment (procédural aléatoire) pour tester la généralisation du cerveau entraîné.

### En mode édition de circuit

- Entrer dans l'éditeur visuel : cliquer pour ajouter des points de contrôle, glisser pour les déplacer, clic droit pour en supprimer.
- Prévisualiser le circuit en temps réel pendant l'édition.
- Appliquer le circuit pour lancer l'entraînement dessus.
- Sauvegarder le circuit sous un nom (ex : « Circuit facile », « Circuit tueur »).
- Exporter l'ensemble des circuits en `.json` pour les partager ou les importer plus tard.

### En mode course

- Charger plusieurs cerveaux entraînés (sauvegardés localement ou importés depuis un `.json`).
- Les faire s'affronter simultanément sur le même circuit.
- Chaque voiture a sa propre couleur et son label.
- Comportement de séparation (flocking) activé : les voitures se repoussent légèrement pour éviter de se superposer.
- Classement en temps réel affiché dans le panneau de droite.
- Possibilité de placer des obstacles sur la piste (Ctrl+Clic) pour pimenter la course.

### Avec ML5.js

- Activer la webcam pour contrôler la voiture leader avec sa main.
- Incliner la main à gauche/droite → braquer la voiture.
- Lever la main → accélérer.
- Affichage d'un mini canvas overlay avec les keypoints de la main détectés et les valeurs de contrôle en temps réel.

---

## 9. Toutes les options disponibles

### Onglet "Train" (Entraînement)

| Option | Plage | Effet |
|--------|-------|-------|
| Vitesse max | 2–30 | Vitesse maximale que peut atteindre chaque voiture |
| Population | 10–200 | Nombre de voitures par génération |
| Taux de mutation | 1%–50% | Probabilité qu'un poids soit perturbé à chaque nouvelle génération |
| Condition d'arrêt | 10%–100% | % de voitures ayant terminé un tour pour stopper l'entraînement |
| Bouton "Réinitialiser" | — | Repart de zéro (génération 0, nouvelle population aléatoire) |
| Bouton "Nouveau circuit" | — | Génère un nouveau circuit procédural et réinitialise |
| Sauvegarde cerveau | — | Sauvegarde le meilleur cerveau de la génération actuelle avec un nom |

### Onglet "Réseau" (Topologie)

| Option | Plage | Effet |
|--------|-------|-------|
| Rayons capteurs | 1–12 | Nombre de rayons de détection (FOV = 120° réparti uniformément) |
| Waypoints suivants | 0–5 | Nombre de prochains checkpoints fournis en entrée (distance + angle) |
| Vitesse en entrée | oui/non | Ajoute ou retire la vitesse normalisée parmi les entrées |
| Couches cachées | 1–5 | Nombre de couches cachées dans le réseau |
| Neurones/couche | 4–128 | Nombre de neurones dans chaque couche cachée |
| Fonction d'activation | sigmoid/relu/tanh/elu | Fonction d'activation des couches cachées |

> La topologie actuelle est affichée en permanence en haut du panneau sous la forme `[N→M→M→2]`.

### Onglet "Circuit"

| Option | Plage | Effet |
|--------|-------|-------|
| Complexité | 1–50 | Longueur et sinuosité du circuit procédural |
| Largeur de piste | 35–150px | Largeur de la route (impact sur la difficulté) |
| Éditeur manuel | — | Mode édition visuelle avec points de contrôle |
| Sauvegarde circuit | — | Sauvegarde le circuit courant sous un nom |
| Exporter circuits | — | Export JSON de tous les circuits sauvegardés |
| Importer circuits | — | Import JSON d'une bibliothèque de circuits |

### Onglet "Course"

| Option | Effet |
|--------|-------|
| Bibliothèque de cerveaux | Liste de tous les cerveaux sauvegardés avec leur topologie et génération |
| Bouton 🏁 | Ajoute un cerveau à la liste de départ |
| Exporter cerveaux | Export JSON de tous les cerveaux |
| Importer cerveaux | Import JSON d'une bibliothèque de cerveaux |
| Lancer la course | Démarre la course avec les cerveaux sélectionnés |
| Arrêter la course | Retour en mode entraînement |
| Classement | Résultat en temps réel trié par score |

### Onglet "Misc"

| Option | Effet |
|--------|-------|
| ML5 HandPose | Active/désactive le contrôle gestuel via webcam |
| Effacer obstacles | Supprime tous les obstacles placés sur la piste |

### Raccourcis clavier

| Touche | Action |
|--------|--------|
| `R` | Réinitialiser l'entraînement |
| `N` | Générer un nouveau circuit aléatoire |
| `O` | Effacer tous les obstacles |
| `M` | Activer/désactiver ML5 |
| `Ctrl + Clic` | Placer un obstacle sur la piste |

---

## 10. Intégration ML5.js

Conformément à la consigne (slide 48), on a intégré **ML5.js** via son module **HandPose**, qui utilise un modèle pré-entraîné de détection des keypoints de la main.

### Comment ça marche

1. On accède à la webcam via `getUserMedia`.
2. ML5 détecte en continu (~20 fps) les 21 keypoints de la main.
3. On calcule deux valeurs à partir du poignet (keypoint 0) et du dos de la main (keypoint 9) :
   - **Steer** : inclinaison horizontale de la main → valeur entre -1 (gauche) et +1 (droite)
   - **Throttle** : inclinaison verticale → lever la main accélère, baisser freine

4. Ces valeurs remplacent les sorties du réseau de neurones pour la voiture leader.

### Ce qu'on voulait prouver

En remplaçant le cerveau IA par un contrôle humain via ML5, on peut piloter la voiture leader soi-même pendant que toutes les autres continuent d'apprendre. C'est une façon concrète de montrer que le réseau de neurones génère exactement les mêmes types de sorties que ce que ferait un humain (braquage + accélération).

Un mini canvas overlay affiche les keypoints détectés et les valeurs de steer/throttle calculées en temps réel pour vérifier que la détection fonctionne.

---

## 11. Correspondance avec les consignes

| Consigne | Implémentation |
|----------|----------------|
| **Curseurs pour la topologie du réseau** | Onglet "Réseau" : rayons, waypoints, couches, neurones, activation |
| **Informations supplémentaires en entrée** | Waypoints (distance + angle relatif) ajoutés comme entrées configurables |
| **Condition d'arrêt paramétrable** | Slider "Condition d'arrêt" (10–100%), barre de progression visible sur le HUD |
| **Généralisation sur plusieurs circuits** | Changement de circuit à la volée, possibilité de charger un cerveau et de le retester |
| **Éditeur de circuit** | Mode édition visuelle avec points de contrôle + aperçu temps réel |
| **Sauvegarde/restauration de circuits** | Bibliothèque de circuits (localStorage + export/import JSON) |
| **Sauvegarde de cerveaux entraînés** | Sérialisation JSON, sauvegarde locale, export/import |
| **Mode course multi-cerveaux** | Onglet "Course" : chargement N cerveaux, lancement de course, classement |
| **Séparation entre véhicules** | Comportement de flocking (séparation) activé en mode course |
| **Obstacles cliquables** | Ctrl+Clic sur la piste pour placer des obstacles (collision détectée) |
| **ML5.js obligatoire** | HandPose : contrôle de la voiture leader via gestes de la main (incliner + lever) |

---

## 12. Comment lancer le projet

Il n'y a pas de serveur à configurer. Il suffit d'ouvrir `index.html` dans un navigateur.

```bash
# Avec Python 3
cd projet-jeu-v2
python -m http.server 8000
# Ouvrir : http://localhost:8000
```

```bash
# Avec Node.js / npx
npx serve projet-jeu-v2
```

## 13. Notre expérience

### Pourquoi ce jeu ?

On a choisi le projet voitures autonomes parce que c'était clairement le plus ambitieux visuellement et le plus satisfaisant à regarder tourner. Voir des voitures complètement nulles à la génération 0 — qui foncent dans le premier mur — devenir des pilotes corrects après 20-30 générations, c'est quelque chose qu'on ne se lasse pas d'observer. C'était aussi un bon prétexte pour explorer TensorFlow.js dans un contexte pas du tout classique (pas de classification d'images, pas de NLP) et pour vraiment comprendre ce que fait un réseau de neurones quand on le prive de back-propagation.

### Les comportements qu'on a choisi d'implémenter

**Le premier comportement qu'on a réglé, c'est l'anti-camping.** Au tout début, sans aucune pénalité, les voitures avaient vite compris qu'elles pouvaient marquer des points en tournant en rond près d'un checkpoint sans jamais prendre de risque. La fitness grimpait, mais personne n'avançait vraiment. On a donc mis en place trois gardes-fous : un timeout global sans checkpoint, une détection de déplacement réel (pas juste de vitesse), et la détection de sens inverse. C'est la combinaison des trois qui a réglé le problème — un seul ne suffisait pas.

**Le deuxième comportement, c'est la séparation en mode course.** Sans ça, toutes les voitures se superposent exactement au même endroit puisqu'elles ont des cerveaux similaires. C'est illisible. On a implémenté un comportement de flocking simple (force de répulsion entre voitures proches) uniquement activé en mode course pour ne pas perturber l'entraînement.

**Le troisième, c'est l'aide au démarrage.** On a eu beaucoup de voitures qui mouraient dans les 2 premières secondes sans jamais avoir bougé, parce que leur cerveau initialisé aléatoirement donnait une poussée quasi nulle dès la frame 1. On a donc forcé un thrust minimal pendant les 30 premières frames pour donner une chance à chaque voiture de « sentir » les murs et d'accumuler quelque chose d'utile dans sa fitness.

### Les difficultés rencontrées

**La gestion mémoire avec TensorFlow.js** a été notre plus gros casse-tête. TF.js crée des tenseurs en mémoire GPU/CPU et ne les libère pas automatiquement. Au début, la simulation ralentissait progressivement jusqu'à planter le navigateur après une dizaine de générations. On a dû wrapper tous les appels dans `tf.tidy()`, appeler explicitement `.dispose()` sur les anciens cerveaux après chaque génération, et vérifier avec `tf.memory()` dans la console que le nombre de tenseurs ne dérivait plus.

**La sérialisation des cerveaux** pour le mode course n'était pas évidente non plus. TF.js ne propose pas nativement un export JSON simple des poids. On a dû extraire les tenseurs un par un avec `.dataSync()`, les convertir en tableaux, les stocker dans un objet JSON avec la forme (`shape`) de chaque tenseur, puis reconstruire le modèle à l'identique à l'import. Le vrai problème était qu'un cerveau importé avec une topologie différente de celle configurée dans l'interface plante silencieusement — on a donc ajouté les métadonnées de topologie dans le JSON pour pouvoir afficher un avertissement.

**Le générateur de circuits** avait un bug subtil : pour les complexités élevées, l'algorithme de recherche de chemin hamiltonien atteignait parfois sa limite de tentatives et tombait dans le fallback (un simple ovale). Le problème c'est que le fallback n'était pas signalé, donc on pensait avoir un circuit complexe alors qu'on avait un ovale. On a ajouté un log dans la console et augmenté le budget de recherche (`maxAttempts`).

**ML5.js** nous a posé un problème inattendu : la version 1.x a complètement changé son API par rapport aux tutoriels disponibles en ligne (qui sont quasi tous écrits pour ML5 0.x). La méthode de callback a changé, le format des keypoints retournés aussi. On a dû lire directement la doc officielle de la v1 et faire des tests dans la console pour identifier la bonne structure de données.

### Ce qu'on retiendra

Ce projet nous a appris que dans la neuroévolution, **la fonction de fitness est vraiment tout**. On a passé plus de temps à la régler qu'à coder le réseau lui-même. Chaque fois qu'on croyait avoir un bon comportement, il y avait un cas limite où les voitures trouvaient une façon inattendue d'optimiser la mauvaise chose. C'est finalement ce qui est fascinant dans ces approches : l'algorithme est « honnête », il optimise exactement ce qu'on lui dit d'optimiser, pas ce qu'on voulait dire.