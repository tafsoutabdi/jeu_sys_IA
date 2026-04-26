/**
 * Circuit - Génération, éditeur et gestion des circuits
 */

class Boundary {
  constructor(x1, y1, x2, y2) {
    this.a = createVector(x1, y1);
    this.b = createVector(x2, y2);
  }

  show(highlight = false) {
    stroke(highlight ? color(255, 60, 60) : color(200));
    strokeWeight(highlight ? 4 : 2);
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }

  midpoint() {
    return createVector((this.a.x + this.b.x) / 2, (this.a.y + this.b.y) / 2);
  }
}

class Circuit {
  constructor(config = {}) {
    this.checkpoints   = [];
    this.walls         = [];
    this.insidePoints  = [];
    this.outsidePoints = [];
    this.obstacles     = [];
    this.startPos      = null;
    this.pathWidth     = config.pathWidth  || 65;
    this.difficulty    = config.difficulty || 'medium';

    if (config.checkpoints) {
      // Chargement depuis données sérialisées
      this._loadFromData(config);
    } else {
      this.generateCircuit();
    }
  }

  _loadFromData(data) {
    this.difficulty  = data.difficulty || 'medium';
    this.pathWidth   = data.pathWidth  || 65;
    this.checkpoints = data.checkpoints.map(cp => new Boundary(cp.a.x, cp.a.y, cp.b.x, cp.b.y));
    this.walls       = data.walls.map(w => new Boundary(w.a.x, w.a.y, w.b.x, w.b.y));
    this.obstacles   = (data.obstacles || []).map(o => ({ pos: createVector(o.pos.x, o.pos.y), radius: o.radius }));
    this.startPos    = this.checkpoints[0].midpoint();
    this.insidePoints  = this.checkpoints.map(cp => cp.a.copy());
    this.outsidePoints = this.checkpoints.map(cp => cp.b.copy());
  }

  generateCircuit() {
    const settings = {
      easy:   { points: 8,  noiseMax: 1.5, pathWidth: 90 },
      medium: { points: 14, noiseMax: 3,   pathWidth: 65 },
      hard:   { points: 22, noiseMax: 5,   pathWidth: 45 }
    }[this.difficulty] || { points: 14, noiseMax: 3, pathWidth: 65 };

    this.pathWidth = settings.pathWidth;
    this._buildTrack(settings.points, settings.noiseMax);
  }

  _buildTrack(total, noiseMax) {
    // Plusieurs tentatives si le circuit se croise
    let attempts = 0;
    do {
      this._tryBuildTrack(total, noiseMax);
      attempts++;
    } while (this._hasSelfIntersections() && attempts < 10);
  }

  _tryBuildTrack(total, noiseMax) {
    this.checkpoints   = [];
    this.insidePoints  = [];
    this.outsidePoints = [];

    const startX = random(100);
    const startY = random(100);
    const cx = width  * 0.5;
    const cy = height * 0.45;
    const rx = width  * 0.32;
    const ry = height * 0.35;

    for (let i = 0; i < total; i++) {
      const a    = map(i, 0, total, 0, TWO_PI);
      const xoff = map(cos(a), -1, 1, 0, noiseMax) + startX;
      const yoff = map(sin(a), -1, 1, 0, noiseMax) + startY;
      const n    = noise(xoff, yoff);

      const xr = map(n, 0, 1, rx * 0.55, rx);
      const yr = map(n, 0, 1, ry * 0.55, ry);

      const x1 = cx + (xr - this.pathWidth) * cos(a);
      const y1 = cy + (yr - this.pathWidth) * sin(a);
      const x2 = cx + (xr + this.pathWidth) * cos(a);
      const y2 = cy + (yr + this.pathWidth) * sin(a);

      this.checkpoints.push(new Boundary(x1, y1, x2, y2));
      this.insidePoints.push(createVector(x1, y1));
      this.outsidePoints.push(createVector(x2, y2));
    }

    this._buildWalls();
    this.startPos = this.checkpoints[0].midpoint();
  }

  _buildWalls() {
    this.walls = [];
    const n = this.checkpoints.length;
    for (let i = 0; i < n; i++) {
      const ni = (i + 1) % n;
      this.walls.push(new Boundary(
        this.insidePoints[i].x,  this.insidePoints[i].y,
        this.insidePoints[ni].x, this.insidePoints[ni].y
      ));
      this.walls.push(new Boundary(
        this.outsidePoints[i].x,  this.outsidePoints[i].y,
        this.outsidePoints[ni].x, this.outsidePoints[ni].y
      ));
    }
  }

  /**
   * Vérifie si les murs extérieurs se croisent (circuit invalide)
   */
  _hasSelfIntersections() {
    const outer = this.outsidePoints;
    const n = outer.length;
    for (let i = 0; i < n; i++) {
      const a1 = outer[i];
      const a2 = outer[(i + 1) % n];
      for (let j = i + 2; j < n - (i === 0 ? 1 : 0); j++) {
        const b1 = outer[j];
        const b2 = outer[(j + 1) % n];
        if (this._segmentsIntersect(a1, a2, b1, b2)) return true;
      }
    }
    return false;
  }

  _segmentsIntersect(p1, p2, p3, p4) {
    const d1 = this._cross(p3, p4, p1);
    const d2 = this._cross(p3, p4, p2);
    const d3 = this._cross(p1, p2, p3);
    const d4 = this._cross(p1, p2, p4);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    return false;
  }

  _cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  addObstacle(x, y, radius = 22) {
    this.obstacles.push({ pos: createVector(x, y), radius });
  }

  clearObstacles() { this.obstacles = []; }

  increaseDifficulty() {
    const levels = ['easy', 'medium', 'hard'];
    const idx = levels.indexOf(this.difficulty);
    if (idx < levels.length - 1) {
      this.difficulty = levels[idx + 1];
      this.generateCircuit();
      return true;
    }
    return false;
  }

  show() {
    push();

    // Remplissage de la piste (zone entre intérieur et extérieur)
    noStroke();
    fill(40, 40, 50);
    beginShape();
    for (let p of this.outsidePoints) vertex(p.x, p.y);
    endShape(CLOSE);
    fill(20);
    beginShape();
    for (let p of this.insidePoints) vertex(p.x, p.y);
    endShape(CLOSE);

    pop();

    // Murs
    for (let wall of this.walls) wall.show();

    // Checkpoints (semi-transparent)
    push();
    stroke(0, 255, 0, 60);
    strokeWeight(1.5);
    for (let i = 1; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      line(cp.a.x, cp.a.y, cp.b.x, cp.b.y);
    }

    // Ligne de départ/arrivée (plus visible)
    stroke(255, 220, 0, 200);
    strokeWeight(3);
    const start = this.checkpoints[0];
    line(start.a.x, start.a.y, start.b.x, start.b.y);
    pop();

    // Ligne de départ
    if (this.startPos) {
      push();
      fill(0, 255, 0);
      noStroke();
      circle(this.startPos.x, this.startPos.y, 10);
      fill(255);
      textSize(10);
      textAlign(CENTER);
      text('START', this.startPos.x, this.startPos.y - 10);
      pop();
    }

    // Obstacles
    if (this.obstacles.length > 0) {
      push();
      for (const obs of this.obstacles) {
        fill(200, 50, 50, 180);
        stroke(255, 80, 80);
        strokeWeight(2);
        circle(obs.pos.x, obs.pos.y, obs.radius * 2);
        fill(255);
        noStroke();
        textSize(10);
        textAlign(CENTER, CENTER);
        text('⛔', obs.pos.x, obs.pos.y);
      }
      pop();
    }
  }

  serialize() {
    return {
      difficulty:  this.difficulty,
      pathWidth:   this.pathWidth,
      checkpoints: this.checkpoints.map(cp => ({ a: { x: cp.a.x, y: cp.a.y }, b: { x: cp.b.x, y: cp.b.y } })),
      walls:       this.walls.map(w => ({ a: { x: w.a.x, y: w.a.y }, b: { x: w.b.x, y: w.b.y } })),
      obstacles:   this.obstacles.map(o => ({ pos: { x: o.pos.x, y: o.pos.y }, radius: o.radius }))
    };
  }

  static deserialize(data) {
    return new Circuit(data);
  }

  getInfo() {
    return {
      difficulty:     this.difficulty,
      numCheckpoints: this.checkpoints.length,
      pathWidth:      this.pathWidth,
      obstacles:      this.obstacles.length
    };
  }
}

/**
 * Gestionnaire de circuits : sauvegarde, chargement, import/export
 */
class CircuitManager {
  constructor() {
    this.circuits = {};
    this.loadFromStorage();
  }

  createCircuit(name, difficulty = 'medium') {
    const c = new Circuit({ difficulty });
    this.circuits[name] = c.serialize();
    this.saveToStorage();
    return c;
  }

  saveCurrentCircuit(name, circuitInstance) {
    this.circuits[name] = circuitInstance.serialize();
    this.saveToStorage();
  }

  getCircuit(name) {
    if (this.circuits[name]) return Circuit.deserialize(this.circuits[name]);
    return null;
  }

  listCircuits() {
    return Object.keys(this.circuits).map(name => ({
      name,
      info: this.circuits[name]
        ? { difficulty: this.circuits[name].difficulty, checkpoints: this.circuits[name].checkpoints?.length }
        : {}
    }));
  }

  deleteCircuit(name) {
    delete this.circuits[name];
    this.saveToStorage();
  }

  saveToStorage() {
    try { localStorage.setItem('fish_circuits', JSON.stringify(this.circuits)); }
    catch (e) { console.warn('Save circuits failed:', e); }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('fish_circuits');
      if (data) this.circuits = JSON.parse(data);
    } catch (e) { console.warn('Load circuits failed:', e); }
  }

  exportJSON() { return JSON.stringify(this.circuits, null, 2); }

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      Object.assign(this.circuits, data);
      this.saveToStorage();
      return true;
    } catch { return false; }
  }

  downloadJSON(filename = 'circuits.json') {
    const blob = new Blob([this.exportJSON()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  }
}