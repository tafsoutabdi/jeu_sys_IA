/**
 * Intégration ML5.js - Détection de pose par main (API ML5 v1 correcte)
 * Utilise ml5.handPose() avec le callback pattern
 */

let handPoseModel    = null;
let handPoseDetecting = false;
let videoCapture     = null;
let handPoseHands    = [];   // résultat le plus récent
let controlledFish   = null;
let ml5VideoOverlay  = null; // canvas de prévisualisation

/**
 * Initialise la webcam et le modèle HandPose (ML5 v1)
 */
async function initHandPoseDetection() {
  try {
    // Créer l'élément vidéo
    videoCapture = createCapture(VIDEO);
    videoCapture.size(320, 240);
    videoCapture.hide();

    // Attendre que la vidéo soit prête
    await new Promise(resolve => {
      videoCapture.elt.onloadeddata = resolve;
      setTimeout(resolve, 2000); // timeout de sécurité
    });

    // ML5 v1 : ml5.handPose(video, options, callback)
    // Le modèle appelle le callback à chaque frame automatiquement
    handPoseModel = ml5.handPose(videoCapture.elt, {
      maxHands:        2,
      modelType:       'lite',
      flipHorizontal:  true
    }, () => {
      console.log('HandPose model loaded');
      // Lancer la détection continue
      handPoseModel.detect(videoCapture.elt, _onHandPoseResults);
    });

    return true;
  } catch (e) {
    console.error('HandPose init failed:', e);
    return false;
  }
}

/**
 * Callback appelé par ML5 à chaque détection
 */
function _onHandPoseResults(results) {
  handPoseHands = results || [];

  // Relancer la détection pour la prochaine frame
  if (handPoseDetecting && handPoseModel && videoCapture) {
    handPoseModel.detect(videoCapture.elt, _onHandPoseResults);
  }
}

/**
 * Active le contrôle par main
 */
async function startHandControl() {
  if (handPoseDetecting) {
    showNotification('⚠️ Contrôle main déjà actif');
    return;
  }

  showNotification('⏳ Chargement du modèle HandPose...');
  const ok = await initHandPoseDetection();

  if (ok) {
    handPoseDetecting = true;

    // Contrôler le premier poisson de la population
    if (window.population && population.population.length > 0) {
      controlledFish = population.population[0];
    }

    // Créer un overlay vidéo (coin bas-gauche)
    ml5VideoOverlay = createGraphics(160, 120);

    showNotification('🖐 Contrôle par main activé ! Bougez la main devant la caméra.');

    // Mettre à jour le bouton
    const btn = document.getElementById('enableHandControl');
    if (btn) { btn.textContent = '🖐 Désactiver Main'; btn.classList.add('active'); }
  } else {
    showNotification('❌ Impossible d\'accéder à la caméra ou charger le modèle');
  }
}

/**
 * Désactive le contrôle par main
 */
function stopHandControl() {
  handPoseDetecting = false;
  handPoseHands     = [];

  if (videoCapture) { videoCapture.remove(); videoCapture = null; }
  if (ml5VideoOverlay) { ml5VideoOverlay.remove(); ml5VideoOverlay = null; }
  handPoseModel = null;

  const btn = document.getElementById('enableHandControl');
  if (btn) { btn.textContent = '🖐 Activer Contrôle Main'; btn.classList.remove('active'); }

  showNotification('👋 Contrôle par main désactivé');
}

/**
 * Traite les gestes détectés et applique les forces
 */
function processHandGestures(hands) {
  if (!hands || hands.length === 0) return;

  // Choisir le poisson à contrôler (premier vivant)
  if (!controlledFish || controlledFish.dead) {
    if (window.population && population.population.length > 0) {
      controlledFish = population.population.find(f => !f.dead) || null;
    }
  }
  if (!controlledFish) return;

  for (let hand of hands) {
    // ML5 v1 : les keypoints sont dans hand.keypoints
    const kps = hand.keypoints;
    if (!kps || kps.length < 21) continue;

    const wrist  = kps[0];   // poignet
    const thumb  = kps[4];   // bout du pouce
    const index  = kps[8];   // bout de l'index
    const middle = kps[12];  // bout du majeur
    const ring   = kps[16];  // bout de l'annulaire
    const pinky  = kps[20];  // bout de l'auriculaire

    // Détection main ouverte : distance pouce-index > seuil
    const thumbIndexDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
    const isOpen = thumbIndexDist > 40;

    // Position horizontale de la main → direction
    // La vidéo est 320px de large (flipped)
    const handCenterX = (wrist.x + index.x + middle.x) / 3;
    const handCenterY = (wrist.y + index.y + middle.y) / 3;

    // Hauteur : main levée = accélérer
    const isHandRaised = handCenterY < 80;

    // Diriger selon position horizontale
    const normalizedX = handCenterX / 320; // 0 = gauche, 1 = droite
    const turnStrength = 0.12;

    if (normalizedX < 0.35) {
      // Main à gauche → tourner gauche
      const leftForce = p5.Vector.fromAngle(controlledFish.vel.heading() - turnStrength);
      leftForce.setMag(controlledFish.maxForce * 0.7);
      controlledFish.applyForce(leftForce);
    } else if (normalizedX > 0.65) {
      // Main à droite → tourner droite
      const rightForce = p5.Vector.fromAngle(controlledFish.vel.heading() + turnStrength);
      rightForce.setMag(controlledFish.maxForce * 0.7);
      controlledFish.applyForce(rightForce);
    }

    // Main ouverte + levée → accélérer
    if (isOpen && isHandRaised) {
      const fwd = p5.Vector.fromAngle(controlledFish.vel.heading());
      fwd.setMag(controlledFish.maxForce * 1.5);
      controlledFish.applyForce(fwd);
    }

    // Main fermée → freiner
    if (!isOpen) {
      controlledFish.vel.mult(0.9);
    }
  }
}

/**
 * Met à jour les contrôles ML5 dans la boucle draw
 */
function updateML5Controls() {
  if (!handPoseDetecting) return;

  // Traiter les résultats du dernier appel de détection
  processHandGestures(handPoseHands);

  // Dessiner l'overlay vidéo dans le coin
  if (ml5VideoOverlay && videoCapture) {
    ml5VideoOverlay.image(videoCapture, 0, 0, 160, 120);

    // Dessiner les keypoints sur l'overlay
    if (handPoseHands.length > 0) {
      ml5VideoOverlay.stroke(0, 255, 0);
      ml5VideoOverlay.strokeWeight(2);
      ml5VideoOverlay.noFill();
      for (let hand of handPoseHands) {
        if (hand.keypoints) {
          for (let kp of hand.keypoints) {
            ml5VideoOverlay.fill(0, 255, 0, 180);
            ml5VideoOverlay.noStroke();
            ml5VideoOverlay.circle(kp.x * 0.5, kp.y * 0.5, 4);
          }
        }
      }
    }

    // Afficher l'overlay en bas à gauche du canvas principal
    image(ml5VideoOverlay, 10, height - 135);

    // Bordure + label
    push();
    noFill();
    stroke(0, 255, 0, 150);
    strokeWeight(1);
    rect(10, height - 135, 160, 120);
    fill(0, 200, 0);
    noStroke();
    textSize(9);
    textAlign(LEFT);
    text('🖐 ML5 HandPose', 12, height - 140);
    text(`Mains: ${handPoseHands.length}`, 12, height - 128);
    pop();
  }
}

/**
 * Debug ML5 overlay sur le canvas
 */
function drawML5Debug() {
  if (!handPoseDetecting || !window.configManager?.showDebug) return;

  push();
  fill(0, 255, 0, 200);
  noStroke();
  textSize(11);
  textAlign(LEFT);
  let y = height - 20;
  text(`ML5 HandPose ACTIF | Mains détectées: ${handPoseHands.length}`, 180, y);
  if (controlledFish) {
    y -= 14;
    text(`Contrôle: Poisson #${controlledFish.id}`, 180, y);
  }
  pop();
}

/**
 * Bascule le contrôle main (on/off)
 */
function toggleHandControl() {
  if (handPoseDetecting) {
    stopHandControl();
  } else {
    startHandControl();
  }
}

/**
 * Initialise les contrôles ML5 (appelé depuis sketch.js)
 */
async function initializeML5Controls() {
  console.log('ML5 controls prêts (activation manuelle requise)');
}