import React from 'react';
import RealTimeMonitoring from './RealTimeMonitoring';
import PredictionsPanel from './PredictionsPanel';
import AlertsPanel from './AlertsPanel';
import AnalyticsPanel from './AnalyticsPanel';
import AIInsightsPanel from './AIInsightsPanel';
import DashboardOverview from './DashboardOverview';
import { motion, AnimatePresence } from 'framer-motion';

function Dashboard({ 
  activeView, 
  predictions, 
  setPredictions,
  alerts, 
  setAlerts, 
  historicalData,
  setHistoricalData,
  stats,
  addPrediction
}) {
  const renderView = () => {
    const viewProps = {
      predictions,
      setPredictions,
      addPrediction,
      alerts,
      setAlerts,
      historicalData,
      setHistoricalData,
      stats,
      onPrediction: addPrediction // Alias for components expecting onPrediction
    };

    switch (activeView) {
      case 'dashboard':
        return <DashboardOverview {...viewProps} />;
      case 'monitoring':
        return <RealTimeMonitoring {...viewProps} />;
      case 'predictions':
        return <PredictionsPanel {...viewProps} />;
      case 'alerts':
        return <AlertsPanel {...viewProps} />;
      case 'analytics':
        return <AnalyticsPanel {...viewProps} />;
      case 'ai-insights':
        return <AIInsightsPanel {...viewProps} />;
      default:
        return <DashboardOverview {...viewProps} />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
}

export default Dashboard;
