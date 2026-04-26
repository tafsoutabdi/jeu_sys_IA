/**
 * Fish - Classe pour les poissons (agents de racing)
 * Utilise un réseau de neurones pour prendre des décisions
 */

class Ray {
  constructor(pos, angle, range = 150) {
    this.pos = pos.copy();
    this.baseAngle = angle;
    this.dir = p5.Vector.fromAngle(angle);
    this.range = range;
  }

  setAngle(a) {
    this.dir = p5.Vector.fromAngle(a);
  }

  rotate(angle) {
    this.dir.rotate(angle);
  }

  cast(wall) {
    const x1 = wall.a.x, y1 = wall.a.y;
    const x2 = wall.b.x, y2 = wall.b.y;
    const x3 = this.pos.x, y3 = this.pos.y;
    const x4 = this.pos.x + this.dir.x, y4 = this.pos.y + this.dir.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t > 0 && t < 1 && u > 0) {
      return createVector(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
    }
    return null;
  }

  show() {
    push();
    stroke(255, 80);
    strokeWeight(1);
    const endX = this.pos.x + this.dir.x * this.range;
    const endY = this.pos.y + this.dir.y * this.range;
    line(this.pos.x, this.pos.y, endX, endY);
    pop();
  }
}

class Fish {
  constructor(brain, config = {}) {
    this.fitness = 0;
    this.dead = false;
    this.finished = false;
    this.id = config.id || Math.floor(Math.random() * 10000);

    // Physique
    this.pos = createVector(width / 2, height / 2);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = config.maxSpeed || 4;
    this.maxForce = config.maxForce || 0.25;

    // Navigation
    this.checkpointIndex = 0;
    this.lapsCompleted = 0;
    this.lifeCounter = 0;
    this.lifespan = config.lifespan || 400;
    this.distanceTraveled = 0;
    this.speedSum = 0;
    this.speedFrames = 0;
    this.collisions = 0;
    this.checkpointsPassed = 0;
    this.timeAlive = 0;

    // Capteurs
    this.sensorCount = config.sensorCount || 7;
    this.sensorRange = config.sensorRange || 150;
    this.rays = [];
    this.goal = null;

    // Créer les rayons (arc frontal 180°)
    const spread = Math.PI; // 180 degrés
    for (let i = 0; i < this.sensorCount; i++) {
      const angle = map(i, 0, this.sensorCount - 1, -spread / 2, spread / 2);
      this.rays.push(new Ray(this.pos, angle, this.sensorRange));
    }

    // Cerveau (réseau de neurones)
    if (brain) {
      this.brain = brain.copy();
    } else {
      const hiddenLayers = config.hiddenLayers || [this.sensorCount * 2, this.sensorCount];
      this.brain = new NeuralNetwork({
        inputNodes: this.sensorCount + 4, // capteurs + distance goal + vitesse + heading + next checkpoint angle
        hiddenLayers: hiddenLayers,
        outputNodes: 2,
        activation: config.activation || 'relu'
      });
    }

    // Couleur unique par cerveau
    this.color = color(random(80, 255), random(80, 255), random(80, 255), 220);
    this.label = config.label || null;
  }

  /**
   * Positionne le poisson à une position de départ
   */
  setStartPos(startPos) {
    if (startPos) {
      this.pos = startPos.copy();
    }
  }

  /**
   * Applique les comportements de navigation
   */
  applyBehaviors(walls, obstacles = [], otherFish = []) {
    if (this.dead || this.finished) return;

    const steering = this.look(walls);
    const avoid = this.avoidObstacles(obstacles);
    const separate = this.separate(otherFish);

    const force = p5.Vector.add(steering, p5.Vector.mult(avoid, 1.5));
    force.add(p5.Vector.mult(separate, 0.8));
    force.limit(this.maxForce);
    this.applyForce(force);
  }

  /**
   * Séparation (flocking) : éviter les autres poissons
   */
  separate(others) {
    const steer = createVector(0, 0);
    const separationDist = 20;
    let count = 0;

    for (let other of others) {
      if (other === this || other.dead) continue;
      const d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < separationDist) {
        const diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) {
      steer.div(count);
      steer.setMag(this.maxForce);
    }

    return steer;
  }

  /**
   * Retourne à la position initiale
   */
  reset(startPos) {
    if (startPos) this.pos = startPos.copy();
    this.vel.mult(0);
    this.acc.mult(0);
    this.fitness = 0;
    this.dead = false;
    this.finished = false;
    this.checkpointIndex = 0;
    this.lapsCompleted = 0;
    this.lifeCounter = 0;
    this.distanceTraveled = 0;
    this.speedSum = 0;
    this.speedFrames = 0;
    this.collisions = 0;
    this.checkpointsPassed = 0;
    this.timeAlive = 0;
    this.goal = null;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  /**
   * Met à jour la physique
   */
  update() {
    if (this.dead || this.finished) return;

    const prevPos = this.pos.copy();

    this.pos.add(this.vel);
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.acc.mult(0);

    const d = p5.Vector.dist(prevPos, this.pos);
    this.distanceTraveled += d;
    this.speedSum += this.vel.mag();
    this.speedFrames++;
    this.timeAlive++;

    this.lifeCounter++;
    if (this.lifeCounter > this.lifespan) {
      this.dead = true;
    }

    // Mettre à jour les rayons selon le cap actuel
    const heading = this.vel.mag() > 0.01 ? this.vel.heading() : 0;
    for (let i = 0; i < this.rays.length; i++) {
      this.rays[i].pos = this.pos.copy();
      this.rays[i].setAngle(heading + this.rays[i].baseAngle);
    }
  }

  /**
   * Vérifie les checkpoints passés
   */
  checkCheckpoints(checkpoints) {
    if (this.dead || this.finished || checkpoints.length === 0) return;

    this.goal = checkpoints[this.checkpointIndex];

    const d = pldistance(
      this.goal.a, this.goal.b,
      this.pos.x, this.pos.y
    );

    if (d < 15) {
      this.checkpointIndex = (this.checkpointIndex + 1) % checkpoints.length;
      this.checkpointsPassed++;
      this.lifeCounter = 0; // reset timer à chaque checkpoint

      // Tour complet
      if (this.checkpointIndex === 0) {
        this.lapsCompleted++;
        if (this.lapsCompleted >= 1) {
          this.finished = true;
        }
      }
    }
  }

  /**
   * Vérifie collision avec les murs (bounding box)
   */
  checkWallCollision(walls) {
    if (this.dead) return;
    for (let wall of walls) {
      const d = pldistance(wall.a, wall.b, this.pos.x, this.pos.y);
      if (d < 8) {
        this.dead = true;
        this.collisions++;
        return;
      }
    }
  }

  /**
   * Calcule la fitness : mélange checkpoints + vitesse - pénalités
   */
  calculateFitness() {
    const checkpointReward = this.checkpointsPassed * 100;
    const lapBonus = this.lapsCompleted * 1000;
    const avgSpeed = this.speedSum / Math.max(this.speedFrames, 1);
    const speedBonus = avgSpeed * 20;
    const collisionPenalty = this.collisions * 80;
    // Bonus vitesse : prime les poissons qui font les checkpoints rapidement
    const timeBonus = this.checkpointsPassed > 0
      ? Math.max(0, (500 - this.timeAlive / Math.max(this.checkpointsPassed, 1))) * 0.5
      : 0;

    this.fitness = Math.max(0,
      checkpointReward + lapBonus + speedBonus + timeBonus - collisionPenalty
    );
  }

  /**
   * Regarde autour et décide (sorties réseau de neurones)
   */
  look(walls) {
    const inputs = [];
    let wallCollision = false;

    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      let record = this.sensorRange;

      for (let wall of walls) {
        const pt = ray.cast(wall);
        if (pt) {
          const d = p5.Vector.dist(this.pos, pt);
          if (d < record) record = d;
        }
      }

      // Collision : si un rayon frontal est très proche d'un mur
      if (record < 6 && Math.abs(this.rays[i].baseAngle) < Math.PI / 4) {
        wallCollision = true;
      }

      inputs[i] = map(record, 0, this.sensorRange, 1, 0);
    }

    if (wallCollision) {
      this.dead = true;
      this.collisions++;
    }

    // Informations supplémentaires
    const target = this.goal
      ? this.goal.midpoint()
      : createVector(width / 2, height / 2);

    const distanceToGoal = p5.Vector.dist(this.pos, target);
    const normDist = constrain(map(distanceToGoal, 0, width, 0, 1), 0, 1);
    const speedNorm = constrain(map(this.vel.mag(), 0, this.maxSpeed, 0, 1), 0, 1);

    const desiredHeading = p5.Vector.sub(target, this.pos).heading();
    const currentHeading = this.vel.mag() > 0.01 ? this.vel.heading() : 0;
    const headingDiff = normalizeAngle(desiredHeading - currentHeading);
    const normalizedHeading = map(headingDiff, -Math.PI, Math.PI, 0, 1);

    // Angle vers le prochain checkpoint suivant
    let nextCheckpointAngle = 0.5;
    if (this.goal) {
      const nextIdx = (this.checkpointIndex + 1) % (window._circuitCheckpoints?.length || 1);
      const nextCP = window._circuitCheckpoints?.[nextIdx];
      if (nextCP) {
        const nextTarget = nextCP.midpoint();
        const nextHeading = p5.Vector.sub(nextTarget, this.pos).heading();
        const nextDiff = normalizeAngle(nextHeading - currentHeading);
        nextCheckpointAngle = map(nextDiff, -Math.PI, Math.PI, 0, 1);
      }
    }

    inputs.push(normDist, speedNorm, normalizedHeading, nextCheckpointAngle);

    // Prédiction du réseau de neurones
    const output = this.brain.predict(inputs);

    // Sortie 0 : direction (angle relatif)
    // Sortie 1 : vitesse (force appliquée)
    let angle = map(output[0], 0, 1, -Math.PI / 2.5, Math.PI / 2.5);
    let speed = map(output[1], 0, 1, 0, this.maxForce);

    angle += currentHeading;
    const force = p5.Vector.fromAngle(angle);
    force.setMag(speed);

    return force;
  }

  /**
   * Évite les obstacles proches
   */
  avoidObstacles(obstacles) {
    const steer = createVector(0, 0);
    let count = 0;

    for (let obstacle of obstacles) {
      const d = p5.Vector.dist(this.pos, obstacle.pos);
      const safeDistance = obstacle.radius + 30;
      if (d < safeDistance && d > 0) {
        const diff = p5.Vector.sub(this.pos, obstacle.pos);
        diff.normalize();
        diff.div(d);
        steer.add(diff);
        count++;
      }
    }

    if (count > 0) {
      steer.div(count);
      steer.setMag(this.maxForce * 1.2);
    }

    return steer;
  }

  /**
   * Affiche le poisson
   */
  show(isLeader = false) {
    push();

    // Ombre portée sur le leader
    if (isLeader) {
      fill(255, 220, 0, 60);
      noStroke();
      circle(this.pos.x, this.pos.y, 30);
    }

    fill(this.dead ? color(80, 80, 80, 100) : this.color);
    stroke(0, 150);
    strokeWeight(1);

    translate(this.pos.x, this.pos.y);
    const angle = this.vel.mag() > 0.01 ? this.vel.heading() : 0;
    rotate(angle);

    // Corps du poisson
    beginShape();
    vertex(12, 0);
    vertex(-4, -7);
    vertex(-10, 0);
    vertex(-4, 7);
    endShape(CLOSE);

    // Queue
    noFill();
    stroke(this.dead ? color(80, 80, 80, 100) : this.color);
    beginShape();
    vertex(-10, 0);
    vertex(-16, -5);
    vertex(-16, 5);
    vertex(-10, 0);
    endShape(CLOSE);

    // Oeil
    fill(0);
    noStroke();
    circle(6, -2.5, 3);

    // Reflet oeil
    fill(255, 200);
    circle(7, -3, 1.2);

    pop();

    // Label en mode compétition
    if (this.label) {
      push();
      fill(255);
      noStroke();
      textSize(9);
      textAlign(CENTER);
      text(this.label, this.pos.x, this.pos.y - 16);
      pop();
    }
  }

  /**
   * Affiche les rayons capteurs (debug)
   */
  showRays() {
    for (let ray of this.rays) {
      ray.show();
    }
  }

  /**
   * Clone le poisson
   */
  clone() {
    return new Fish(this.brain, {
      sensorCount: this.sensorCount,
      sensorRange: this.sensorRange,
      hiddenLayers: this.brain.config.hiddenLayers,
      activation: this.brain.config.activation,
      maxSpeed: this.maxSpeed,
      maxForce: this.maxForce,
      lifespan: this.lifespan
    });
  }

  mutate(rate) {
    this.brain.mutate(rate);
  }

  dispose() {
    if (this.brain) this.brain.dispose();
  }

  getState() {
    return {
      fitness: this.fitness,
      checkpoints: this.checkpointsPassed,
      laps: this.lapsCompleted,
      distanceTraveled: this.distanceTraveled,
      avgSpeed: this.speedSum / Math.max(this.speedFrames, 1),
      collisions: this.collisions,
      alive: !this.dead && !this.finished
    };
  }
}

/**
 * Distance point à segment
 */
function pldistance(p1, p2, x, y) {
  const num = Math.abs((p2.y - p1.y) * x - (p2.x - p1.x) * y + p2.x * p1.y - p2.y * p1.x);
  const den = p5.Vector.dist(p1, p2);
  if (den === 0) return Infinity;
  return num / den;
}

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}