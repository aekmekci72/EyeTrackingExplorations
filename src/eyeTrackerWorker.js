// eyeTrackerWorker.js
/* eslint-disable no-restricted-globals */


// eyeTrackerWorker.js
let webgazer;
let gazeHistory = [];
let offScreenGazeHistory = [];
let offScreenStartTime = null;
let lastAlertTime = 0;
const phoneDetectionRange = { minY: self.innerHeight * 0.7, maxY: self.innerHeight };
const outsideScreenThreshold = 50;
const steadyGazeThreshold = 75;
const offScreenDuration = 5000;
const alertCooldown = 10000;

self.importScripts('https://webgazer.cs.brown.edu/webgazer.js');

self.addEventListener('message', async (event) => {
  if (event.data.type === 'init') {
    webgazer = await self.webgazer.setRegression('ridge').setTracker('TFFacemesh').begin();
    webgazer.setGazeListener(handleGaze);
  }
});

function handleGaze(data, clock) {
  if (data == null) return;
  const newPosition = { x: data.x, y: data.y };
  gazeHistory.push(newPosition);
  if (gazeHistory.length > 30) gazeHistory.shift();
  checkPhoneGaze();
  checkOffScreenGaze(newPosition);
}

function checkPhoneGaze() {
  const recentGazes = gazeHistory.slice(-10);
  const isInPhoneRange = recentGazes.every(gaze => 
    gaze.y >= phoneDetectionRange.minY && gaze.y <= phoneDetectionRange.maxY
  );
  const isStable = Math.max(...recentGazes.map(g => g.y)) - Math.min(...recentGazes.map(g => g.y)) < 50;

  if (isInPhoneRange && isStable) {
    self.postMessage({ type: 'phoneGaze', isLookingAtPhone: true });
  } else {
    self.postMessage({ type: 'phoneGaze', isLookingAtPhone: false });
  }
}

function checkOffScreenGaze(position) {
  const isOffScreen = 
    position.x < -outsideScreenThreshold ||
    position.x > self.innerWidth + outsideScreenThreshold ||
    position.y < -outsideScreenThreshold ||
    position.y > self.innerHeight + outsideScreenThreshold;

  if (isOffScreen) {
    offScreenGazeHistory.push(position);
    if (offScreenGazeHistory.length > 60) offScreenGazeHistory.shift();

    if (offScreenStartTime === null) {
      offScreenStartTime = Date.now();
    }

    const isGazeSteady = checkGazeSteadiness(offScreenGazeHistory);
    const offScreenTime = Date.now() - offScreenStartTime;

    if (offScreenTime >= offScreenDuration) {
      const currentTime = Date.now();
      if (currentTime - lastAlertTime >= alertCooldown) {
        if (isGazeSteady) {
          self.postMessage({ type: 'distraction', message: 'Are you on your phone?' });
        } else {
          self.postMessage({ type: 'distraction', message: 'Are you distracted?' });
        }
        lastAlertTime = currentTime;
      }
    }
  } else {
    offScreenGazeHistory = [];
    offScreenStartTime = null;
  }

  self.postMessage({ type: 'gazePosition', position });
}

function checkGazeSteadiness(gazeHistory) {
  if (gazeHistory.length < 2) return false;

  const xValues = gazeHistory.map(p => p.x);
  const yValues = gazeHistory.map(p => p.y);

  const xRange = Math.max(...xValues) - Math.min(...xValues);
  const yRange = Math.max(...yValues) - Math.min(...yValues);

  return xRange <= steadyGazeThreshold && yRange <= steadyGazeThreshold;
}