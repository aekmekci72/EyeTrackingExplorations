import React from 'react';
import './App.css';
import eyeLogo from './eye-logo.png'; 

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="Logo-container">
          <img src={eyeLogo} className="App-logo" alt="Eye Logo" />
        </div>
        <h1>Eye Tracking Explorations</h1>
        <p>Explore various eye tracking solutions:</p>
      </header>
      
      <section className="Technology">
        <div className="Tech-card">
          <h2>Distraction Detection</h2>
          <p>This Distraction Detection technology utilizes WebGazer.js to track gaze data and identify when a user is distracted. It provides real-time alerts, making it ideal for enhancing focus in educational settings or study sessions by minimizing distractions, especially including phone use.</p>
          <button onClick={() => window.location.href='/distractiondetection'}>Try Distraction Detection</button>
        </div>

        <div className="Tech-card">
          <h2>Heatmap Visualization</h2>
          <p>The Heatmap Visualization uses WebGazer.js to create a heatmap of areas where users look the most. This feature is perfect for UX/UI designers to understand user behavior and optimize interface layouts for better engagement, along with gaining insights into other user habits.</p>
          <button onClick={() => window.location.href='/heatmap'}>Try Heatmap Visualization</button>
        </div>
      </section>
    </div>
  );
}

export default App;