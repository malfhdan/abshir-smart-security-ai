import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, ChevronRight, Image as ImageIcon, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function PredictionsPanel({ predictions, onPrediction, setPredictions }) {
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [isFetchingExplanation, setIsFetchingExplanation] = useState(false);
  const [activeTab, setActiveTab] = useState('confirmed'); // 'confirmed' or 'potential'
  const [potentialPredictions, setPotentialPredictions] = useState([]);

  // Load potential predictions from localStorage
  useEffect(() => {
    const savedPotential = localStorage.getItem('potentialPredictions');
    if (savedPotential) {
      try {
        setPotentialPredictions(JSON.parse(savedPotential));
      } catch (e) {
        console.error('Error loading potential predictions:', e);
      }
    }
  }, []);

  // Filter confirmed predictions (>= 90%)
  const confirmedPredictions = predictions.filter(p => {
    const confidence = p.confidence || 0;
    const shouldCount = p.should_count !== undefined ? p.should_count : confidence >= 0.9;
    return shouldCount;
  });

  // Get current list based on active tab
  const currentPredictions = activeTab === 'confirmed' ? confirmedPredictions : potentialPredictions;

  // Automatically fetch recommendations when a scan is selected
  useEffect(() => {
    if (selectedPrediction) {
      // Only fetch if:
      // 1. It's not a normal video
      // 2. It doesn't already have recommendations
      // 3. We're not already fetching
      const needsRecommendations = 
        selectedPrediction.predicted_class !== 'NormalVideos' &&
        !selectedPrediction.explanation?.explanation?.recommendedAction &&
        !isFetchingExplanation;

      if (needsRecommendations) {
        fetchExplanationForPrediction(selectedPrediction);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrediction?.id]); // Only trigger when a different prediction is selected

  const fetchExplanationForPrediction = async (prediction) => {
    if (!prediction || !prediction.predicted_class) {
      alert('Cannot fetch explanation: prediction data incomplete');
      return;
    }

    setIsFetchingExplanation(true);
    try {
      // Build prediction result format for explanation endpoint
      // Handle different data structures: all_predictions, predictions, or just top_prediction
      let allClasses = {};
      
      if (prediction.all_predictions && Array.isArray(prediction.all_predictions)) {
        // Format: [{class: "...", confidence: 0.5}, ...]
        allClasses = prediction.all_predictions.reduce((acc, p) => {
          acc[p.class || p.className] = p.confidence;
          return acc;
        }, {});
      } else if (prediction.predictions && Array.isArray(prediction.predictions)) {
        // Format: [{class: "...", confidence: 0.5}, ...]
        allClasses = prediction.predictions.reduce((acc, p) => {
          acc[p.class || p.className] = p.confidence;
          return acc;
        }, {});
      } else {
        // Fallback: create minimal structure from top prediction
        allClasses = {
          [prediction.predicted_class]: prediction.confidence || 0.5
        };
      }

      const predictionForExplanation = {
        top_prediction: {
          class: prediction.predicted_class,
          confidence: prediction.confidence || 0.5
        },
        all_classes: allClasses
      };

      const response = await fetch('http://localhost:8000/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictionForExplanation),
      });

      if (!response.ok) throw new Error('Failed to fetch explanation');

      const explanation = await response.json();

      // Update the selected prediction with explanation
      const updatedPrediction = {
        ...prediction,
        explanation: explanation
      };
      setSelectedPrediction(updatedPrediction);

      // Update predictions list with explanation
      const updatedPredictions = predictions.map(p => 
        p.id === prediction.id ? updatedPrediction : p
      );
      
      // Update parent state if setPredictions is available
      if (setPredictions) {
        setPredictions(updatedPredictions);
      }
      
      // Update localStorage
      localStorage.setItem('predictions', JSON.stringify(updatedPredictions));
      
      // Also update historical data
      const savedHistorical = localStorage.getItem('historicalPredictions');
      if (savedHistorical) {
        try {
          const historical = JSON.parse(savedHistorical);
          const updatedHistorical = historical.map(p => 
            p.id === prediction.id ? updatedPrediction : p
          );
          localStorage.setItem('historicalPredictions', JSON.stringify(updatedHistorical));
        } catch (e) {
          console.error('Error updating historical data:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching explanation:', error);
      alert('Failed to fetch explanation. Please try again.');
    } finally {
      setIsFetchingExplanation(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-white">Prediction History</h1>
        <p className="text-slate-400">Review past analysis and detailed reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700 w-fit">
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'confirmed'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Confirmed ({confirmedPredictions.length})
        </button>
        <button
          onClick={() => setActiveTab('potential')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'potential'
              ? 'bg-yellow-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Potential ({potentialPredictions.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* History List */}
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-slate-400" />
              {activeTab === 'confirmed' ? 'Confirmed Scans' : 'Potential Scans'}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {currentPredictions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>{activeTab === 'confirmed' ? 'No confirmed predictions yet' : 'No potential predictions yet'}</p>
              </div>
            ) : (
              currentPredictions.map(pred => {
                const confidence = pred.confidence || 0;
                const status = pred.status || (confidence >= 0.9 ? 'confirmed' : confidence >= 0.7 ? 'potential' : 'ignored');
                return (
                  <div
                    key={pred.id}
                    onClick={() => setSelectedPrediction(pred)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      selectedPrediction?.id === pred.id
                        ? 'bg-blue-600/10 border-blue-500/50'
                        : 'bg-slate-800/30 border-transparent hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-white">{pred.predicted_class}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        status === 'confirmed' 
                          ? 'bg-green-500/10 text-green-500' 
                          : status === 'potential'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {(confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>{new Date(pred.timestamp).toLocaleTimeString()}</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {selectedPrediction ? (
              <motion.div 
                key={selectedPrediction.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 overflow-y-auto custom-scrollbar p-6"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className={`p-4 rounded-2xl ${
                    selectedPrediction.predicted_class === 'NormalVideos'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {selectedPrediction.predicted_class === 'NormalVideos' 
                      ? <CheckCircle size={32} /> 
                      : <AlertTriangle size={32} />
                    }
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedPrediction.predicted_class}</h2>
                    <p className="text-slate-400">
                      Detected at {new Date(selectedPrediction.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Confidence Score</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      {(selectedPrediction.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          selectedPrediction.status === 'confirmed' ? 'bg-green-500' :
                          selectedPrediction.status === 'potential' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedPrediction.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Status</div>
                    <div className={`text-2xl font-bold mb-2 ${
                      selectedPrediction.status === 'confirmed' ? 'text-green-400' :
                      selectedPrediction.status === 'potential' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {selectedPrediction.status === 'confirmed' ? 'Confirmed' :
                       selectedPrediction.status === 'potential' ? 'Potential' : 'Ignored'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedPrediction.status === 'confirmed' ? 'Counted in monitoring' :
                       selectedPrediction.status === 'potential' ? 'Saved but not counted' : 'Not counted'}
                    </div>
                  </div>

                  <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Risk Level</div>
                    <div className={`text-2xl font-bold mb-2 ${
                      selectedPrediction.explanation?.explanation?.riskLevel === 'Critical' ? 'text-red-500' :
                      selectedPrediction.explanation?.explanation?.riskLevel === 'High' ? 'text-red-400' :
                      selectedPrediction.explanation?.explanation?.riskLevel === 'Medium' ? 'text-orange-400' :
                      selectedPrediction.explanation?.explanation?.riskLevel === 'Low' ? 'text-green-400' :
                      selectedPrediction.predicted_class === 'NormalVideos' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedPrediction.explanation?.explanation?.riskLevel || 
                       (selectedPrediction.predicted_class === 'NormalVideos' ? 'Low' : 'High')}
                    </div>
                    <div className="text-xs text-slate-500">Based on classification</div>
                  </div>
                </div>

                {/* Show potential warning if status is potential */}
                {selectedPrediction.status === 'potential' && selectedPrediction.explanation?.explanation?.potentialWarning && (
                  <div className="mb-8 p-4 bg-yellow-500/10 rounded-xl border-2 border-yellow-500/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-yellow-400 mb-2">Potential Warning</div>
                        <div className="text-sm text-yellow-200">
                          {selectedPrediction.explanation.explanation.potentialWarning}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations Section - Show prominently even if explanation exists */}
                {selectedPrediction.explanation?.explanation?.recommendedAction ? (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Lightbulb size={20} className="text-emerald-400" />
                        Recommendations & Action Plan
                      </h3>
                    </div>
                    
                    <div className="p-5 bg-emerald-500/10 rounded-xl border-2 border-emerald-500/30 shadow-lg">
                      <div className="text-sm text-emerald-400 mb-3 font-bold flex items-center gap-2 uppercase tracking-wider">
                        <CheckCircle size={16} />
                        Recommended Action
                      </div>
                      <div className="text-sm text-emerald-100 leading-relaxed mb-4">
                        {selectedPrediction.explanation.explanation.recommendedAction}
                      </div>
                      
                      {/* Immediate Steps */}
                      {selectedPrediction.explanation.explanation.immediateSteps && 
                       selectedPrediction.explanation.explanation.immediateSteps.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-emerald-500/20">
                          <div className="text-xs text-emerald-400 mb-3 font-semibold uppercase tracking-wide">
                            Immediate Steps
                          </div>
                          <ul className="space-y-2.5">
                            {selectedPrediction.explanation.explanation.immediateSteps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-sm text-emerald-200">
                                <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">{idx + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Alternative Actions */}
                      {selectedPrediction.explanation.explanation.alternativeActions && 
                       selectedPrediction.explanation.explanation.alternativeActions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-emerald-500/20">
                          <div className="text-xs text-emerald-400 mb-3 font-semibold uppercase tracking-wide">
                            Alternative Actions
                          </div>
                          <ul className="space-y-2.5">
                            {selectedPrediction.explanation.explanation.alternativeActions.map((action, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 text-sm text-emerald-200">
                                <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedPrediction.predicted_class !== 'NormalVideos' && (
                  <div className="mb-8">
                    <div className="p-5 bg-amber-500/10 rounded-xl border-2 border-amber-500/30">
                      <div className="flex items-center gap-3">
                        <Lightbulb size={20} className="text-amber-400" />
                        <div className="flex-1">
                          <div className="text-sm font-bold text-amber-400 mb-1">
                            {isFetchingExplanation ? 'Loading Recommendations...' : 'Recommendations Loading...'}
                          </div>
                          <div className="text-xs text-amber-300">
                            {isFetchingExplanation 
                              ? 'Please wait while we generate detailed recommendations for this scan'
                              : 'Recommendations will appear automatically'}
                          </div>
                        </div>
                        {isFetchingExplanation && (
                          <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedPrediction.explanation && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-4">AI Analysis</h3>
                    
                    {typeof selectedPrediction.explanation.explanation === 'object' ? (
                      <div className="space-y-4">
                        {/* Summary */}
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Summary</div>
                          <div className="text-sm text-white font-medium">
                            {selectedPrediction.explanation.explanation.summary}
                          </div>
                        </div>

                        {/* Key Indicators */}
                        {selectedPrediction.explanation.explanation.keyIndicators && (
                          <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
                            <div className="text-xs text-blue-400 mb-3 font-medium uppercase tracking-wider">Key Indicators</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedPrediction.explanation.explanation.keyIndicators.map((indicator, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-blue-500/10 text-blue-300 text-xs rounded-lg border border-blue-500/20 font-medium">
                                  {indicator}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Confidence & Risk Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Confidence</div>
                            <div className="text-sm text-slate-300">
                              {selectedPrediction.explanation.explanation.confidenceInterpretation}
                            </div>
                          </div>
                          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Risk Level</div>
                            <div className={`text-sm font-bold ${
                              selectedPrediction.explanation.explanation.riskLevel === 'Critical' ? 'text-red-500' :
                              selectedPrediction.explanation.explanation.riskLevel === 'High' ? 'text-red-400' :
                              selectedPrediction.explanation.explanation.riskLevel === 'Medium' ? 'text-orange-400' :
                              'text-green-400'
                            }`}>
                              {selectedPrediction.explanation.explanation.riskLevel || 'Low'}
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-slate-300 leading-relaxed">
                        {selectedPrediction.explanation.explanation}
                      </div>
                    )}
                  </div>
                )}

                {selectedPrediction.all_predictions && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Class Probabilities</h3>
                    <div className="space-y-4">
                      {selectedPrediction.all_predictions.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <span className="w-32 text-sm text-slate-300">{p.class}</span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-slate-600 rounded-full"
                              style={{ width: `${p.confidence * 100}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-sm text-slate-400">
                            {(p.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                  <CheckCircle size={32} opacity={0.5} />
                </div>
                <p>Select a prediction to view details</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default PredictionsPanel;
