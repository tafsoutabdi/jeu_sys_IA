/**
 * NeuralNetwork - Réseau de neurones avec TensorFlow.js
 * Topologie configurable, mutation gaussienne, sérialisation complète
 */

class NeuralNetwork {
  constructor(config = {}) {
    this.inputNodes   = config.inputNodes   || 11;
    this.hiddenLayers = config.hiddenLayers || [16, 12];
    this.outputNodes  = config.outputNodes  || 2;
    this.activation   = config.activation   || 'relu';

    this.config = {
      inputNodes:   this.inputNodes,
      hiddenLayers: [...this.hiddenLayers],
      outputNodes:  this.outputNodes,
      activation:   this.activation
    };

    this.model = this.createModel();
  }

  createModel() {
    const layers = [];

    // Couche d'entrée + 1ère couche cachée
    layers.push(tf.layers.dense({
      inputShape: [this.inputNodes],
      units: this.hiddenLayers[0],
      activation: this.activation,
      kernelInitializer: 'glorotUniform',
      biasInitializer: 'zeros'
    }));

    // Couches cachées supplémentaires
    for (let i = 1; i < this.hiddenLayers.length; i++) {
      layers.push(tf.layers.dense({
        units: this.hiddenLayers[i],
        activation: this.activation,
        kernelInitializer: 'glorotUniform'
      }));
    }

    // Couche de sortie (sigmoid → valeurs entre 0 et 1)
    layers.push(tf.layers.dense({
      units: this.outputNodes,
      activation: 'sigmoid'
    }));

    return tf.sequential({ layers });
  }

  /**
   * Prédiction : retourne un tableau de nombres
   */
  predict(inputs) {
    return tf.tidy(() => {
      if (inputs.length !== this.inputNodes) {
        console.warn(`Entrées: ${inputs.length} vs attendu ${this.inputNodes}`);
      }
      const clean = inputs.map(x => (isFinite(x) ? x : 0));
      const xs = tf.tensor2d([clean]);
      const ys = this.model.predict(xs);
      return Array.from(ys.dataSync());
    });
  }

  /**
   * Copie le réseau — gère correctement les tenseurs TF
   */
  copy() {
    const newNN = new NeuralNetwork(this.config);

    // Récupérer les poids, les cloner, les assigner, puis disposer les originaux
    const weights = this.model.getWeights();
    const copies = weights.map(w => w.clone());
    newNN.model.setWeights(copies);

    // Disposer les copies temporaires (setWeights en fait ses propres copies internes)
    copies.forEach(c => c.dispose());
    weights.forEach(w => w.dispose());

    return newNN;
  }

  /**
   * Mutation gaussienne des poids — sans tf.tidy pour éviter la destruction des tenseurs
   */
  mutate(rate) {
    const weights = this.model.getWeights();
    const mutated = [];

    for (let tensor of weights) {
      const shape  = tensor.shape;
      const values = Array.from(tensor.dataSync()); // copie JS

      for (let j = 0; j < values.length; j++) {
        if (Math.random() < rate) {
          // Box-Muller pour bruit gaussien
          const u1 = Math.max(1e-10, Math.random());
          const u2 = Math.random();
          const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          values[j] = Math.max(-5, Math.min(5, values[j] + z * 0.25));
        }
      }

      mutated.push(tf.tensor(values, shape));
      tensor.dispose();
    }

    this.model.setWeights(mutated);
    mutated.forEach(t => t.dispose());
  }

  /**
   * Sérialisation complète
   */
  serialize() {
    const weights = this.model.getWeights();
    const serialized = weights.map(w => ({
      data:  Array.from(w.dataSync()),
      shape: w.shape
    }));
    weights.forEach(w => w.dispose());

    return {
      config:  { ...this.config },
      weights: serialized
    };
  }

  /**
   * Désérialisation
   */
  static deserialize(data) {
    const nn = new NeuralNetwork(data.config);
    const tensors = data.weights.map(w => tf.tensor(w.data, w.shape));
    nn.model.setWeights(tensors);
    tensors.forEach(t => t.dispose());
    return nn;
  }

  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  /**
   * Informations sur le réseau
   */
  getInfo() {
    const weights = this.model.getWeights();
    const totalParams = weights.reduce((sum, w) => sum + w.size, 0);
    weights.forEach(w => w.dispose());

    return {
      inputNodes:      this.inputNodes,
      hiddenLayers:    this.hiddenLayers,
      outputNodes:     this.outputNodes,
      activation:      this.activation,
      totalParameters: totalParams,
      layers:          this.model.layers.length
    };
  }
}

function getBrainInfo(brainData) {
  if (brainData && brainData.config) {
    return {
      inputs:       brainData.config.inputNodes,
      hiddenLayers: brainData.config.hiddenLayers.join('-'),
      outputs:      brainData.config.outputNodes,
      activation:   brainData.config.activation
    };
  }
  return null;
}