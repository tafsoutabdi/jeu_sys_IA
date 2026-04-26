// Réseau de neurones multi-couches avec TF.js
class NeuralNetwork {
    constructor(inputNodes, hiddenLayers, neuronsPerLayer, outputNodes, activation, existingModel) {
        if (existingModel) {
            this.model = existingModel;
        } else {
            this.input_nodes = inputNodes;
            this.hidden_layers = hiddenLayers;
            this.neurons_per_layer = neuronsPerLayer;
            this.output_nodes = outputNodes;
            this.activation = activation || 'sigmoid';
            this.model = this.createModel();
        }
        this.input_nodes = inputNodes;
        this.hidden_layers = hiddenLayers;
        this.neurons_per_layer = neuronsPerLayer;
        this.output_nodes = outputNodes;
        this.activation = activation || 'sigmoid';
    }

    createModel() {
        const model = tf.sequential();
        // Première couche cachée
        model.add(tf.layers.dense({
            units: this.neurons_per_layer,
            inputShape: [this.input_nodes],
            activation: this.activation,
            kernelInitializer: 'randomNormal'
        }));
        // Couches cachées supplémentaires
        for (let i = 1; i < this.hidden_layers; i++) {
            model.add(tf.layers.dense({
                units: this.neurons_per_layer,
                activation: this.activation,
                kernelInitializer: 'randomNormal'
            }));
        }
        // Couche de sortie
        model.add(tf.layers.dense({
            units: this.output_nodes,
            activation: 'sigmoid'
        }));
        return model;
    }

    dispose() { this.model.dispose(); }

    predict(inputs) {
        return tf.tidy(() => {
            const xs = tf.tensor2d([inputs]);
            const ys = this.model.predict(xs);
            return ys.dataSync();
        });
    }

    copy() {
        return tf.tidy(() => {
            const modelCopy = this.createModel();
            const weights = this.model.getWeights();
            modelCopy.setWeights(weights.map(w => w.clone()));
            return new NeuralNetwork(
                this.input_nodes, this.hidden_layers, this.neurons_per_layer,
                this.output_nodes, this.activation, modelCopy
            );
        });
    }

    mutate(rate) {
        tf.tidy(() => {
            const weights = this.model.getWeights();
            const mutated = weights.map(tensor => {
                let shape = tensor.shape;
                let values = tensor.dataSync().slice();
                for (let j = 0; j < values.length; j++) {
                    if (Math.random() < rate) {
                        values[j] += randomGaussian(0, 0.1);
                    }
                }
                return tf.tensor(values, shape);
            });
            this.model.setWeights(mutated);
        });
    }

    // Serialisation pour sauvegarde JSON
    toJSON() {
        const weights = this.model.getWeights();
        const weightData = weights.map(w => ({
            shape: w.shape,
            data: Array.from(w.dataSync())
        }));
        return {
            input_nodes: this.input_nodes,
            hidden_layers: this.hidden_layers,
            neurons_per_layer: this.neurons_per_layer,
            output_nodes: this.output_nodes,
            activation: this.activation,
            weights: weightData
        };
    }

    static fromJSON(json) {
        const nn = new NeuralNetwork(
            json.input_nodes, json.hidden_layers, json.neurons_per_layer,
            json.output_nodes, json.activation
        );
        const tensors = json.weights.map(w => tf.tensor(w.data, w.shape));
        nn.model.setWeights(tensors);
        tensors.forEach(t => t.dispose());
        return nn;
    }
}
