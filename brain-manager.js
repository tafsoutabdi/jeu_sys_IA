/**
 * BrainManager - Sauvegarde, chargement et gestion des cerveaux
 */

class BrainManager {
  constructor() {
    this.brains = {};
    this.loadFromStorage();
  }

  /**
   * Sauvegarde un cerveau avec un nom
   */
  saveBrain(name, brainData, metadata = {}) {
    this.brains[name] = {
      data: brainData,
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        timestamp: Date.now()
      }
    };
    this.saveToStorage();
    return true;
  }

  /**
   * Charger un cerveau
   */
  loadBrain(name) {
    if (this.brains[name]) {
      return NeuralNetwork.deserialize(this.brains[name].data);
    }
    return null;
  }

  /**
   * Récupère les données du cerveau (sans l'initialiser)
   */
  getBrainData(name) {
    if (this.brains[name]) {
      return this.brains[name].data;
    }
    return null;
  }

  /**
   * Liste tous les cerveaux sauvegardés
   */
  listBrains() {
    return Object.keys(this.brains).map(name => ({
      name,
      info: getBrainInfo(this.brains[name].data),
      metadata: this.brains[name].metadata
    }));
  }

  /**
   * Supprime un cerveau
   */
  deleteBrain(name) {
    if (this.brains[name]) {
      delete this.brains[name];
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Renomme un cerveau
   */
  renameBrain(oldName, newName) {
    if (this.brains[oldName] && !this.brains[newName]) {
      this.brains[newName] = this.brains[oldName];
      delete this.brains[oldName];
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Sauvegarde dans localStorage
   */
  saveToStorage() {
    try {
      const toStore = {};
      for (const name in this.brains) {
        toStore[name] = {
          data: this.brains[name].data,
          metadata: this.brains[name].metadata
        };
      }
      localStorage.setItem('fish_brains', JSON.stringify(toStore));
    } catch (e) {
      console.warn('Could not save brains to storage:', e);
      // Storage full? Supprimer les plus vieux
      this.clearOldBrains();
    }
  }

  /**
   * Charge depuis localStorage
   */
  loadFromStorage() {
    try {
      const data = localStorage.getItem('fish_brains');
      if (data) {
        this.brains = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not load brains from storage:', e);
    }
  }

  /**
   * Exporte tous les cerveaux en JSON
   */
  exportJSON() {
    const brainsList = {};
    for (const name in this.brains) {
      brainsList[name] = this.brains[name];
    }
    return JSON.stringify(brainsList, null, 2);
  }

  /**
   * Importe des cerveaux depuis JSON
   */
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      for (const name in data) {
        if (data[name].data) {
          this.brains[name] = {
            data: data[name].data,
            metadata: data[name].metadata || {}
          };
        }
      }
      this.saveToStorage();
      return true;
    } catch (e) {
      console.error('Invalid JSON:', e);
      return false;
    }
  }

  /**
   * Télécharge les cerveaux comme fichier JSON
   */
  downloadJSON(filename = 'fish-brains.json') {
    const json = this.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Supprime les cerveaux les plus vieux si stockage plein
   */
  clearOldBrains(keepCount = 5) {
    const brainsList = this.listBrains();
    if (brainsList.length > keepCount) {
      // Trier par date
      brainsList.sort((a, b) => 
        b.metadata.timestamp - a.metadata.timestamp
      );

      // Garder les plus récents
      const toDelete = brainsList.slice(keepCount);
      for (const brain of toDelete) {
        this.deleteBrain(brain.name);
      }
    }
  }

  /**
   * Obtient la taille approximative en localStorage
   */
  getStorageSize() {
    const json = this.exportJSON();
    return new Blob([json]).size;
  }

  /**
   * Clone un cerveau d'un autre
   */
  cloneBrain(sourceName, newName) {
    const source = this.getBrainData(sourceName);
    if (source) {
      this.saveBrain(newName, structuredClone(source), {
        clonedFrom: sourceName
      });
      return true;
    }
    return false;
  }

  /**
   * Obtient les statistiques des cerveaux
   */
  getStats() {
    return {
      totalBrains: Object.keys(this.brains).length,
      storageSize: this.getStorageSize(),
      brains: this.listBrains()
    };
  }

  /**
   * Vide tous les cerveaux
   */
  clearAll() {
    if (confirm('Êtes-vous sûr? Tous les cerveaux seront supprimés.')) {
      this.brains = {};
      this.saveToStorage();
      return true;
    }
    return false;
  }
}

/**
 * Gestionnaire de session pour cerveaux temporaires
 */
class BrainSession {
  constructor() {
    this.currentBrain = null;
    this.generationHistory = [];
    this.bestBrainPerGeneration = [];
  }

  /**
   * Enregistre le meilleur cerveau de chaque génération
   */
  recordGeneration(generation, brainData, fitness) {
    this.generationHistory.push({
      generation,
      timestamp: Date.now(),
      fitness
    });
    this.bestBrainPerGeneration.push(brainData);
  }

  /**
   * Récupère l'évolution de la fitness
   */
  getFitnessHistory() {
    return this.generationHistory.map(entry => ({
      generation: entry.generation,
      fitness: entry.fitness
    }));
  }

  /**
   * Exporte l'historique complet
   */
  exportSession() {
    return JSON.stringify({
      historyLength: this.generationHistory.length,
      fitnessProgression: this.getFitnessHistory(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Réinitialise la session
   */
  reset() {
    this.currentBrain = null;
    this.generationHistory = [];
    this.bestBrainPerGeneration = [];
  }
}
