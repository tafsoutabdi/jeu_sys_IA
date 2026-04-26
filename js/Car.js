class Car {
    constructor(brain, color) {
        this.pos = createVector(startX + random(-3, 3), startY + random(-3, 3));
        let angle = window.startAngle || 0;
        this.vel = p5.Vector.fromAngle(angle);
        this.vel.mult(1.0);
        this.acc = createVector(0, 0);

        this.width = 10;
        this.height = 20;
        this.maxForce = 0.5;
        this.carColor = color || null;

        this.dead = false;
        this.finished = false;
        this.score = 0;
        this.fitness = 0;
        this.label = '';

        this.checkpointIndex = window.startCheckpointIndex || 0;
        this.wrongWayCount = 0;
        this.laps = 0;
        this.frameCount = 0;
        this.startPos = this.pos.copy();

        this.framesStalled = 0;
        this.framesSinceLastCheckpoint = 0;
        this.prevPos = this.pos.copy();
        this.framesMovingSlowly = 0;

        // Calcul dynamique des inputs
        let numInputs = NB_RAYS + NB_WAYPOINTS * 2 + (USE_SPEED ? 1 : 0);

        if (brain) {
            this.brain = brain.copy();
        } else {
            this.brain = new NeuralNetwork(numInputs, NN_HIDDEN_LAYERS, NN_NEURONS_PER_LAYER, 2, NN_ACTIVATION);
        }

        this.rays = [];
        for (let i = 0; i < NB_RAYS; i++) {
            this.rays[i] = new Ray();
        }
    }

    dispose() { this.brain.dispose(); }
    mutate(rate) { this.brain.mutate(rate); }
    applyForce(force) { this.acc.add(force); }

    update() {
        if (this.dead) return;
        this.frameCount++;

        if (this.frameCount === 60) {
            if (p5.Vector.dist(this.pos, this.startPos) < 40) {
                this.dead = true;
                return;
            }
        }

        this.vel.add(this.acc);
        this.vel.limit(GAME_SPEED_LIMIT);
        this.pos.add(this.vel);
        this.acc.mult(0);

        this.framesMovingSlowly++;
        if (this.framesMovingSlowly > 60) {
            let distMoved = p5.Vector.dist(this.pos, this.prevPos);
            if (distMoved < 20) {
                this.framesStalled += 60;
            } else {
                this.framesStalled = 0;
                this.prevPos = this.pos.copy();
            }
            this.framesMovingSlowly = 0;
        }

        this.framesSinceLastCheckpoint++;

        if (this.framesStalled > 120 || this.framesSinceLastCheckpoint > 1200) {
            this.dead = true;
        }
    }

    checkCheckpoints(cps) {
        if (this.dead || cps.length === 0) return;

        if (this.frameCount > 100 && this.vel.mag() > 0.5) {
            let cp1 = cps[this.checkpointIndex];
            let cp2 = cps[(this.checkpointIndex + 1) % cps.length];
            let center1 = createVector((cp1.a.x + cp1.b.x) / 2, (cp1.a.y + cp1.b.y) / 2);
            let center2 = createVector((cp2.a.x + cp2.b.x) / 2, (cp2.a.y + cp2.b.y) / 2);
            let trackDir = p5.Vector.sub(center2, center1).normalize();

            if (this.vel.dot(trackDir) < -0.3) {
                this.wrongWayCount++;
                if (this.wrongWayCount > 100) { this.dead = true; return; }
            } else if (this.vel.dot(trackDir) > 0.2) {
                this.wrongWayCount = max(0, this.wrongWayCount - 5);
            }
        }

        let goal = cps[this.checkpointIndex];
        let d = distPointToSegment(this.pos, goal.a, goal.b);

        if (d < 40) {
            this.checkpointIndex = (this.checkpointIndex + 1) % cps.length;
            this.score += 50;
            this.framesSinceLastCheckpoint = 0;
            this.wrongWayCount = 0;

            if (this.checkpointIndex === 0) {
                this.laps++;
                this.score += 200;
                this.finished = true;
                this.dead = true;
            }
        }
    }

    look(walls) {
        const inputs = [];
        let heading = this.vel.heading();
        let numRays = NB_RAYS;

        for (let i = 0; i < numRays; i++) {
            let angle = heading - FOV / 2 + (i * FOV) / (numRays - 1);
            if (numRays === 1) angle = heading;

            this.rays[i].setDir(angle);
            this.rays[i].setPos(this.pos.x, this.pos.y);

            let closest = null;
            let record = SIGHT_DIST;

            for (let wall of walls) {
                const pt = this.rays[i].cast(wall);
                if (pt) {
                    const d = p5.Vector.dist(this.pos, pt);
                    if (d < record) { record = d; closest = pt; }
                }
            }
            // Aussi détecter les obstacles
            for (let obs of obstacles) {
                const pt = this.rays[i].cast(obs);
                if (pt) {
                    const d = p5.Vector.dist(this.pos, pt);
                    if (d < record) { record = d; closest = pt; }
                }
            }

            inputs.push(map(record, 0, SIGHT_DIST, 1, 0));
            this.rays[i].end = closest;
        }

        // Waypoints
        for (let w = 0; w < NB_WAYPOINTS; w++) {
            let cpIdx = (this.checkpointIndex + w) % checkpoints.length;
            let cp = checkpoints[cpIdx];
            if (cp) {
                let center = p5.Vector.add(cp.a, cp.b).div(2);
                let dx = center.x - this.pos.x;
                let dy = center.y - this.pos.y;
                let dist_ = sqrt(dx * dx + dy * dy);
                // Angle relatif à la direction de la voiture
                let angleToWP = atan2(dy, dx) - heading;
                inputs.push(map(constrain(dist_, 0, 500), 0, 500, 1, 0)); // distance normalisée
                inputs.push(map(angleToWP, -PI, PI, 0, 1));               // angle normalisé
            } else {
                inputs.push(0); inputs.push(0);
            }
        }

        // Vitesse
        if (USE_SPEED) {
            inputs.push(map(this.vel.mag(), 0, GAME_SPEED_LIMIT, 0, 1));
        }

        return inputs;
    }

    think(walls) {
        let inputs = this.look(walls);

        // Si ML5 actif ET voiture est la meilleure → contrôle ML5
        if (ml5Active && this === bestCar && raceMode === false) {
            let steer = ml5HandControl.steer; // -1 à 1
            let turnForce = steer * this.maxForce;
            let thrust = GAME_SPEED_LIMIT * ml5HandControl.throttle;

            let currentHeading = this.vel.heading();
            let desiredVel = p5.Vector.fromAngle(currentHeading + turnForce);
            desiredVel.setMag(thrust);
            let steerVec = p5.Vector.sub(desiredVel, this.vel);
            steerVec.limit(this.maxForce);
            this.applyForce(steerVec);
            return;
        }

        let outputs = this.brain.predict(inputs);
        let turnForce = map(outputs[0], 0, 1, -this.maxForce, this.maxForce);
        let thrust = map(outputs[1], 0, 1, 0, GAME_SPEED_LIMIT);

        if (this.frameCount < 30) {
            thrust = max(thrust, GAME_SPEED_LIMIT * 0.5);
        }

        let currentHeading = this.vel.heading();
        let desiredHeading = currentHeading + turnForce;
        let desiredVel = p5.Vector.fromAngle(desiredHeading);
        desiredVel.setMag(thrust);
        let steer = p5.Vector.sub(desiredVel, this.vel);
        steer.limit(this.maxForce);
        this.applyForce(steer);

        // Séparation des voitures (comportement flocking)
        if (raceMode && cars.length > 1) {
            this.applySeparation();
        }
    }

    applySeparation() {
        let steering = createVector(0, 0);
        let count = 0;
        const SEP_RADIUS = 30;
        for (let other of cars) {
            if (other === this) continue;
            let d = p5.Vector.dist(this.pos, other.pos);
            if (d < SEP_RADIUS && d > 0) {
                let diff = p5.Vector.sub(this.pos, other.pos);
                diff.normalize().div(d);
                steering.add(diff);
                count++;
            }
        }
        if (count > 0) {
            steering.div(count);
            steering.setMag(0.1);
            this.applyForce(steering);
        }
    }

    show(isBest) {
        if (this.dead && !raceMode) return;

        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());
        rectMode(CENTER);

        if (this.carColor) {
            fill(this.carColor);
            stroke(this.carColor);
        } else if (isBest) {
            fill(0, 255, 0);
            stroke(0, 255, 0);
        } else {
            fill(255, 50);
            stroke(255, 100);
        }

        if (this.dead && raceMode) fill(150, 50);

        rect(0, 0, this.height, this.width);

        // Label en mode course
        if (raceMode && this.label) {
            fill(255);
            noStroke();
            textSize(9);
            textAlign(CENTER, BOTTOM);
            text(this.label, 0, -14);
        }

        pop();

        // Rayons
        if (!this.dead) {
            for (let r of this.rays) {
                if (r.end) {
                    if (isBest) {
                        stroke(255, 255, 0, 150);
                        strokeWeight(1);
                    } else {
                        stroke(255, 255, 255, 15);
                        strokeWeight(0.5);
                    }
                    line(this.pos.x, this.pos.y, r.end.x, r.end.y);
                }
            }
        }
        strokeWeight(1);
    }
}
