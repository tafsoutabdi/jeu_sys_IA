// Intégration ML5.js — Contrôle via gestes des mains (HandPose)
// L'utilisateur peut contrôler la direction et l'accélération avec sa main

var ml5Detector = null;
var ml5Video = null;
var ml5Hands = [];
var ml5StatusEl = null;

function initML5() {
    ml5StatusEl = document.getElementById('ml5-status');
    if (!window.ml5) {
        console.warn('ML5.js non chargé');
        return;
    }

    // Créer un élément vidéo caché
    ml5Video = document.createElement('video');
    ml5Video.id = 'ml5-video';
    ml5Video.width = 160;
    ml5Video.height = 120;
    ml5Video.style.cssText = 'position:fixed;bottom:20px;right:20px;border-radius:8px;opacity:0.7;z-index:999;display:none;border:2px solid #38bdf8;';
    document.body.appendChild(ml5Video);

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            ml5Video.srcObject = stream;
            ml5Video.play();
            ml5Video.style.display = 'block';

            // Attendre que la vidéo soit prête
            ml5Video.onloadeddata = () => {
                ml5Detector = ml5.handPose(ml5Video, { maxHands: 1 }, () => {
                    console.log('HandPose ML5 chargé');
                    if (ml5StatusEl) ml5StatusEl.textContent = '✋ ML5 actif';
                    ml5Active = true;
                    // Lancer la détection en continu
                    ml5DetectLoop();
                });
            };
        })
        .catch(err => {
            console.warn('Webcam inaccessible :', err);
            if (ml5StatusEl) ml5StatusEl.textContent = '❌ Webcam refusée';
        });
}

function ml5DetectLoop() {
    if (!ml5Detector || !ml5Active) return;
    ml5Detector.detect(ml5Video, (results) => {
        ml5Hands = results;
        processHandGesture();
        // Continuer la boucle
        setTimeout(ml5DetectLoop, 50); // ~20 FPS de détection
    });
}

function processHandGesture() {
    if (!ml5Hands || ml5Hands.length === 0) {
        ml5HandControl = { steer: 0, throttle: 1 };
        return;
    }

    let hand = ml5Hands[0];
    let keypoints = hand.keypoints || hand.landmarks;
    if (!keypoints || keypoints.length < 9) return;

    // Poignet (0) et milieu du dos de la main (9)
    let wrist = keypoints[0];
    let midHand = keypoints[9];

    // Inclinaison horizontale → direction (steer)
    // La vidéo est miroir, donc on inverse
    let palmTiltX = (midHand.x - wrist.x) / 160; // normalisé -1..1 approx
    let steer = constrain(palmTiltX * 2, -1, 1);

    // Inclinaison verticale → accélération (lever la main = accélérer)
    let palmTiltY = (wrist.y - midHand.y) / 120; // positif si la main est levée
    let throttle = constrain(0.3 + palmTiltY * 2, 0.1, 1.0);

    ml5HandControl = { steer, throttle };

    // Affichage overlay (dessin des keypoints sur un mini canvas)
    drawHandOverlay(keypoints);
}

// Mini canvas pour visualiser la main
var ml5Canvas = null;
var ml5Ctx = null;

function drawHandOverlay(keypoints) {
    if (!ml5Canvas) {
        ml5Canvas = document.createElement('canvas');
        ml5Canvas.id = 'ml5-canvas';
        ml5Canvas.width = 160;
        ml5Canvas.height = 120;
        ml5Canvas.style.cssText = 'position:fixed;bottom:140px;right:20px;border-radius:8px;z-index:999;display:block;border:2px solid #38bdf8;background:#000;';
        document.body.appendChild(ml5Canvas);
        ml5Ctx = ml5Canvas.getContext('2d');
    }

    ml5Ctx.clearRect(0, 0, 160, 120);
    ml5Ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ml5Ctx.fillRect(0, 0, 160, 120);

    // Points
    ml5Ctx.fillStyle = '#38bdf8';
    for (let kp of keypoints) {
        ml5Ctx.beginPath();
        ml5Ctx.arc(kp.x, kp.y, 3, 0, Math.PI * 2);
        ml5Ctx.fill();
    }

    // Info steer
    ml5Ctx.fillStyle = '#fff';
    ml5Ctx.font = '10px monospace';
    ml5Ctx.fillText(`Steer: ${ml5HandControl.steer.toFixed(2)}`, 5, 15);
    ml5Ctx.fillText(`Throttle: ${ml5HandControl.throttle.toFixed(2)}`, 5, 28);
}

function toggleML5() {
    if (!ml5Active && !ml5Detector) {
        initML5();
    } else {
        ml5Active = !ml5Active;
        if (ml5Video) ml5Video.style.display = ml5Active ? 'block' : 'none';
        if (ml5Canvas) ml5Canvas.style.display = ml5Active ? 'block' : 'none';
        if (ml5StatusEl) ml5StatusEl.textContent = ml5Active ? '✋ ML5 actif' : '📷 ML5 pausé';
        if (ml5Active) ml5DetectLoop();
    }
}
