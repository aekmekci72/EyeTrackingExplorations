// MainApp.js
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';

import App from './App';
import DistractionDetection from './DistractionDetection';
import HeatMap from './HeatMap';
// import * as serviceWorker from './serviceWorker';

import reportWebVitals from './reportWebVitals';

function MainApp() {
  return (
      <Router>
        <Routes>
        <Route path="/" element={<App />} />
        <Route path="/distractiondetection" element={<DistractionDetection />} />
        <Route path="/heatmap" element={<HeatMap />} />
        
        </Routes>
      </Router>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>,
  document.getElementById('root')
);
// serviceWorker.register(); 
reportWebVitals();
