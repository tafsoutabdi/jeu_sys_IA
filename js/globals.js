// ===== GLOBALS =====
var TOTAL_POP = 50;
var NB_RAYS = 5;          // Nombre de rayons capteurs
var NB_WAYPOINTS = 2;     // Nombre de prochains waypoints
var USE_SPEED = true;     // Ajouter la vitesse comme entrée
var NB_ASSETS = NB_RAYS + NB_WAYPOINTS * 2 + (USE_SPEED ? 1 : 0); // inputs totaux
var SIGHT_DIST = 150;
var FOV = Math.PI / 1.5;

// Topologie réseau
var NN_HIDDEN_LAYERS = 1;         // Nombre de couches cachées
var NN_NEURONS_PER_LAYER = 20;    // Neurones par couche
var NN_ACTIVATION = 'sigmoid';    // 'sigmoid' ou 'relu'

// Paramètres évolution
var MUTATION_RATE = 0.15;
var STOP_CONDITION = 0.6;         // 60% de réussite → arrêt

// Circuit
var GAME_SPEED_LIMIT = 6;
var TRACK_DIFFICULTY = 10;
var TRACK_WIDTH = 100;

// État global
var cars = [];
var savedCars = [];
var walls = [];
var checkpoints = [];
var currentTrackPath = [];
var currentTiles = [];

var startX = 115, startY = 115;
var generation = 0;
var bestCar = null;
var trainingFinished = false;
var raceMode = false;     // Mode course
var raceBrains = [];      // Cerveaux chargés pour la course
var obstacles = [];       // Obstacles cliquables
var savedBrains = [];     // Cerveaux sauvegardés
var savedCircuits = [];   // Circuits sauvegardés
var appMode = 'train';    // 'train' | 'race' | 'edit'

// ML5
var ml5HandPose = null;
var ml5Active = false;
var ml5HandControl = { steer: 0, throttle: 1 };
