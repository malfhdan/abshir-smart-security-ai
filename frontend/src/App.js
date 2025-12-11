import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Chatbot from './components/Chatbot';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [stats, setStats] = useState(null);

  // Load data from localStorage on mount
  useEffect(() => {
    // Check if this is the first time opening the app in this browser session
    const sessionKey = 'securityAppSessionActive';
    const isActiveSession = sessionStorage.getItem(sessionKey);
    
    // Load predictions - only if we have an active session (user has made scans)
    const savedPredictions = localStorage.getItem('predictions');
    if (savedPredictions && isActiveSession) {
      try {
        const parsed = JSON.parse(savedPredictions);
        if (parsed.length > 0) {
          setPredictions(parsed);
        }
      } catch (e) {
        console.error('Error loading predictions:', e);
      }
    }

    // Load historical data - only if we have an active session
    const savedHistorical = localStorage.getItem('historicalPredictions');
    if (savedHistorical && isActiveSession) {
      try {
        const data = JSON.parse(savedHistorical);
        if (data.length > 0) {
          setHistoricalData(data);
          // Also sync predictions with historical data if predictions is empty
          if (!savedPredictions || JSON.parse(savedPredictions).length === 0) {
            setPredictions(data.slice(0, 50));
          }
        }
      } catch (e) {
        console.error('Error loading historical data:', e);
      }
    }

    // Load alerts - only if we have an active session
    const savedAlerts = localStorage.getItem('alerts');
    if (savedAlerts && isActiveSession) {
      try {
        const parsed = JSON.parse(savedAlerts);
        if (parsed.length > 0) {
          setAlerts(parsed);
        }
      } catch (e) {
        console.error('Error loading alerts:', e);
      }
    }

    // Fetch system stats
    fetch('http://localhost:8000/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  // Sync predictions to localStorage whenever it changes
  useEffect(() => {
    // Always save, even if empty (to track state)
    localStorage.setItem('predictions', JSON.stringify(predictions));
  }, [predictions]);

  // Sync historical data to localStorage whenever it changes
  useEffect(() => {
    // Always save, even if empty (to track state)
    localStorage.setItem('historicalPredictions', JSON.stringify(historicalData));
  }, [historicalData]);

  // Sync alerts to localStorage whenever it changes
  useEffect(() => {
    // Always save, even if empty (to track state)
    localStorage.setItem('alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Add prediction function - shared across all pages
  const addPrediction = useCallback((prediction) => {
    // Mark session as active (user has made scans)
    sessionStorage.setItem('securityAppSessionActive', 'true');
    
    const confidence = prediction.confidence || 0;
    const predictedClass = prediction.predicted_class || 'Unknown';
    
    // Determine prediction status based on confidence
    // >= 90%: confirmed (مؤكد) - count in monitoring
    // 70-90%: potential (محتمل) - save but don't count
    // < 70%: ignored (متجاهل) - don't save or count
    let predictionStatus = 'ignored';
    let shouldCount = false;
    
    if (confidence >= 0.9) {
      predictionStatus = 'confirmed';
      shouldCount = true;
    } else if (confidence >= 0.7) {
      predictionStatus = 'potential';
      shouldCount = false;
    } else {
      // Ignore predictions with confidence < 70%
      return;
    }
    
    const newPrediction = {
      ...prediction,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      status: predictionStatus,
      should_count: shouldCount
    };

    // Only add to main predictions if confirmed (>= 90%)
    if (shouldCount) {
      // Update predictions (only confirmed ones)
      setPredictions(prev => {
        const updated = [newPrediction, ...prev].slice(0, 50);
        localStorage.setItem('predictions', JSON.stringify(updated));
        return updated;
      });

      // Update historical data (only confirmed ones)
      setHistoricalData(prev => {
        const updated = [newPrediction, ...prev].slice(0, 100);
        localStorage.setItem('historicalPredictions', JSON.stringify(updated));
        return updated;
      });

      // Create alert only for confirmed predictions (>= 90%)
      if (predictedClass !== 'NormalVideos') {
        const alert = {
          id: Date.now(),
          type: predictedClass,
          message: `Detected ${predictedClass} with ${(confidence * 100).toFixed(1)}% confidence`,
          severity: 'High',
          timestamp: new Date().toISOString(),
          confidence: confidence
        };
        setAlerts(prev => {
          const updated = [alert, ...prev].slice(0, 20);
          localStorage.setItem('alerts', JSON.stringify(updated));
          return updated;
        });
      }
    } else if (predictionStatus === 'potential') {
      // Save potential predictions (70-90%) separately
      const potentialPredictions = JSON.parse(localStorage.getItem('potentialPredictions') || '[]');
      potentialPredictions.unshift(newPrediction);
      const updated = potentialPredictions.slice(0, 50); // Keep last 50 potential predictions
      localStorage.setItem('potentialPredictions', JSON.stringify(updated));
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100 overflow-hidden font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isOpen={isSidebarOpen}
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        <Header 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          alertCount={alerts.length}
          setActiveView={setActiveView}
        />
        
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            <Dashboard 
              activeView={activeView}
              predictions={predictions}
              setPredictions={setPredictions}
              alerts={alerts}
              setAlerts={setAlerts}
              historicalData={historicalData}
              setHistoricalData={setHistoricalData}
              stats={stats}
              addPrediction={addPrediction}
            />
          </div>
        </main>
      </div>
      
      {/* Chatbot Component */}
      <Chatbot 
        predictions={predictions}
        alerts={alerts}
        historicalData={historicalData}
        stats={stats}
      />
    </div>
  );
}

export default App;
