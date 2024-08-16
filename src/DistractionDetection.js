import React, { useEffect, useState, useRef } from 'react';

const EyeTracker = () => {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [dotPosition, setDotPosition] = useState({ x: 0, y: 0 });
  const [calibrationPoint, setCalibrationPoint] = useState(null);
  const [needsRecalibration, setNeedsRecalibration] = useState(false);
  const [isLookingAtPhone, setIsLookingAtPhone] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(true); // New state
  const canvasRef = useRef(null);
  const webgazerInitialized = useRef(false);
  const gazeHistory = useRef([]);
  const phoneDetectionThreshold = 500; // ms
  const phoneDetectionRange = { minY: window.innerHeight * 0.7, maxY: window.innerHeight };
  const outsideScreenThreshold = 50; // px
  const offScreenGazeHistory = useRef([]);
  const offScreenStartTime = useRef(null);
  const offScreenAlertTimeout = useRef(null);
  const steadyGazeThreshold = 75; // px
  const offScreenDuration = 5000; // 5 seconds
  const lastAlertTime = useRef(0);
  const [screenViewTime, setScreenViewTime] = useState(0);
  const [offScreenTime, setOffScreenTime] = useState(0);
  const [timeOff, setTimeOff] = useState(0);
const [distractionAlertCount, setDistractionAlertCount] = useState(0);
  const alertCooldown = 10000; // 10 seconds cooldown between alerts
  const faceDetectionTimeout = useRef(null); // New ref
  const faceDetectionAlertTimeout = useRef(null); // New ref
  const faceDetectionAlertDelay = 5000; // 5 seconds
  const lowConfidenceThreshold = 0.5; // Example threshold for low confidence
  const lastValidGazeTime = useRef(Date.now());
  const maxGazeAge = 1000; // 1 second
  const validGazeWindow = useRef([]);
  const validGazeThreshold = 0.5; // 70% of predictions should be valid

  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);
  
  useEffect(() => {
    let timer;
    if (isCalibrated) {
      timer = setInterval(() => {
        if (isFaceDetected) {
          setScreenViewTime(prevTime => prevTime + 1);
        } else {
          setTimeOff(prevTime => prevTime + 1);

        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCalibrated, isFaceDetected]);

  const sendNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
      setDistractionAlertCount(prevCount => prevCount + 1);

    }
  };

  const calibrate = () => {
    if (!webgazerInitialized.current) return;
    setIsCalibrated(false);

    const calibrationPoints = [
      { x: 50, y: 50 },
      { x: window.innerWidth - 50, y: 50 },
      { x: 50, y: window.innerHeight - 50 },
      { x: window.innerWidth - 50, y: window.innerHeight - 50 },
      { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      { x: window.innerWidth / 4, y: window.innerHeight / 4 },
      { x: (window.innerWidth * 3) / 4, y: window.innerHeight / 4 },
      { x: window.innerWidth / 4, y: (window.innerHeight * 3) / 4 },
      { x: (window.innerWidth * 3) / 4, y: (window.innerHeight * 3) / 4 },
      { x: window.innerWidth / 2, y: 50 },
      { x: window.innerWidth / 2, y: window.innerHeight - 50 },
      { x: 50, y: window.innerHeight / 2 },
      { x: window.innerWidth - 50, y: window.innerHeight / 2 },
    ];

    let currentPoint = 0;

    const calibratePoint = () => {
      if (currentPoint >= calibrationPoints.length) {
        setIsCalibrated(true);
        setCalibrationPoint(null);
        return;
      }

      const point = calibrationPoints[currentPoint];
      setCalibrationPoint(point);

      setTimeout(() => {
        window.webgazer.addMouseEventListeners();
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: point.x,
          clientY: point.y,
        });
        document.elementFromPoint(point.x, point.y).dispatchEvent(event);
        window.webgazer.removeMouseEventListeners();
        currentPoint++;
        calibratePoint();
      }, 5000);
    };

    calibratePoint();
  };

  useEffect(() => {
    let isMounted = true;

    const loadWebGazer = async () => {
      if (!window.webgazer) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
          script.async = true;
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      if (window.webgazer) {
        initWebGazer();
      } else {
        console.error('WebGazer script not loaded');
      }
    };

    const initWebGazer = async () => {
      try {
        await window.webgazer.setRegression('ridge').setTracker('TFFacemesh')
          .setGazeListener((data, clock) => {
            if (data == null || !isMounted) return;
            const newPosition = { x: data.x, y: data.y };
            setDotPosition(newPosition);
            gazeHistory.current.push(newPosition);
            if (gazeHistory.current.length > 30) gazeHistory.current.shift();
            checkPhoneGaze();
            checkOffScreenGaze(newPosition);
            // checkFaceDetection(data); // New check
          })
          .begin();

        webgazerInitialized.current = true;
        console.log('WebGazer initialized successfully');

        window.webgazer.showPredictionPoints(false);

        if (isMounted) {
          calibrate();
        }
      } catch (error) {
        console.error('Error initializing WebGazer:', error);
      }
    };

    const checkPhoneGaze = () => {
      const recentGazes = gazeHistory.current.slice(-10); // Last 10 gaze points
      const isInPhoneRange = recentGazes.every(gaze => 
        gaze.y >= phoneDetectionRange.minY && gaze.y <= phoneDetectionRange.maxY
      );
      const isStable = Math.max(...recentGazes.map(g => g.y)) - Math.min(...recentGazes.map(g => g.y)) < 50;

      if (isInPhoneRange && isStable) {
        if (!isLookingAtPhone) {
          setTimeout(() => {
            setIsLookingAtPhone(true);
          }, phoneDetectionThreshold);
        }
      } else {
        setIsLookingAtPhone(false);
      }
    };

    const checkOffScreenGaze = (position) => {
      const isOffScreen = 
        position.x < -outsideScreenThreshold ||
        position.x > window.innerWidth + outsideScreenThreshold ||
        position.y < -outsideScreenThreshold ||
        position.y > window.innerHeight + outsideScreenThreshold;

      if (isOffScreen) {
        setIsFaceDetected(false);
        offScreenGazeHistory.current.push(position);
        if (offScreenGazeHistory.current.length > 60) offScreenGazeHistory.current.shift();

        if (offScreenStartTime.current === null) {
          offScreenStartTime.current = Date.now();
        }

        const isGazeSteady = checkGazeSteadiness(offScreenGazeHistory.current);
        const offScreenTime = Date.now() - offScreenStartTime.current;

        if (offScreenTime >= offScreenDuration) {
          const currentTime = Date.now();
          if (currentTime - lastAlertTime.current >= alertCooldown) {
            if (!offScreenAlertTimeout.current) {
              offScreenAlertTimeout.current = setTimeout(() => {
                if (isGazeSteady) {
                  sendNotification('Distraction Alert', 'Are you on your phone?');
                } else {
                  sendNotification('Distraction Alert', 'Are you distracted?');
                }
                lastAlertTime.current = currentTime;
                offScreenAlertTimeout.current = null;
              }, 100); // Small delay to prevent multiple alerts
            }
          }
        }
      } else {
        setIsFaceDetected(true);
        offScreenGazeHistory.current = [];
        offScreenStartTime.current = null;
        if (offScreenAlertTimeout.current) {
          clearTimeout(offScreenAlertTimeout.current);
          offScreenAlertTimeout.current = null;
        }
      }
    };

    const checkGazeSteadiness = (gazeHistory) => {
      if (gazeHistory.length < 2) return false;

      const xValues = gazeHistory.map(p => p.x);
      const yValues = gazeHistory.map(p => p.y);

      const xRange = Math.max(...xValues) - Math.min(...xValues);
      const yRange = Math.max(...yValues) - Math.min(...yValues);

      return xRange <= steadyGazeThreshold && yRange <= steadyGazeThreshold;
    };
    // const checkFaceDetection = (data) => {
    //   // Assuming WebGazer data has valid x, y coordinates
    //   if (data && typeof data.x === 'number' && typeof data.y === 'number' &&
    //       !isNaN(data.x) && !isNaN(data.y) && 
    //       data.x >= 0 && data.y >= 0 && 
    //       data.x <= window.innerWidth && data.y <= window.innerHeight) {
    //     validGazeWindow.current.push(true);
    //   } else {
    //     validGazeWindow.current.push(false);
    //   }
    
    //   if (validGazeWindow.current.length > 30) { // Check last 30 predictions
    //     validGazeWindow.current.shift();
    //   }
    
    //   const validRatio = validGazeWindow.current.filter(Boolean).length / validGazeWindow.current.length;
    //   const faceDetected = validRatio >= validGazeThreshold;
    
    //   if (!faceDetected) {
    //     if (faceDetectionTimeout.current === null) {
    //       faceDetectionTimeout.current = Date.now();
    //     } else if (Date.now() - faceDetectionTimeout.current >= faceDetectionAlertDelay) {
    //       if (!faceDetectionAlertTimeout.current) {
    //         faceDetectionAlertTimeout.current = setTimeout(() => {
    //           alert("Are you still there?");
    //           faceDetectionAlertTimeout.current = null;
    //         }, 100);
    //       }
    //     }
    //   } else {
    //     faceDetectionTimeout.current = null;
    //     if (faceDetectionAlertTimeout.current) {
    //       clearTimeout(faceDetectionAlertTimeout.current);
    //       faceDetectionAlertTimeout.current = null;
    //     }
    //   }
    
    //   setIsFaceDetected(faceDetected);
    // };
    
  

    loadWebGazer();

    return () => {
      isMounted = false;
      if (webgazerInitialized.current) {
        window.webgazer.end().then(() => {
          console.log('WebGazer ended successfully');
        }).catch((error) => {
          console.error('Error ending WebGazer:', error);
        });
      }
      if (offScreenAlertTimeout.current) {
        clearTimeout(offScreenAlertTimeout.current);
      }
      if (faceDetectionAlertTimeout.current) {
        clearTimeout(faceDetectionAlertTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (needsRecalibration) {
      calibrate();
      setNeedsRecalibration(false);
    }
  }, [needsRecalibration]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (isCalibrated) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(dotPosition.x, dotPosition.y, 10, 0, 2 * Math.PI);
      ctx.fill();
    } else if (calibrationPoint) {
      ctx.fillStyle = 'blue';
      ctx.beginPath();
      ctx.arc(calibrationPoint.x, calibrationPoint.y, 20, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [isCalibrated, dotPosition, calibrationPoint]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
      />
      {isCalibrated && (
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001 }}>
      <p>Screen View Time: {screenViewTime} seconds</p>
      <p>Off Screen Time: {timeOff} seconds</p>
      <p>Distraction Alerts: {distractionAlertCount}</p>
    </div>
      )}
      {!isCalibrated && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001 }}>
          Calibrating... Please look at the blue dots as they appear.
        </div>
      )}
      {isCalibrated && (
        <button 
          onClick={() => {
            setIsCalibrated(false);
            setNeedsRecalibration(true);
          }}
          style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1001 }}
        >
          Recalibrate
        </button>
      )}
   
    </div>
  );
};

export default EyeTracker;


// import React, { useEffect, useRef, useState } from 'react';
// import 'tracking/build/tracking-min.js';
// import 'tracking/build/data/face-min.js';

// const App = () => {
//   const videoRef = useRef(null);
//   const [isUserPresent, setIsUserPresent] = useState(false);

//   useEffect(() => {
//     const startVideo = () => {
//       navigator.mediaDevices.getUserMedia({ video: true })
//         .then(stream => {
//           if (videoRef.current) {
//             videoRef.current.srcObject = stream;
//           }
//         })
//         .catch(err => console.error('Error accessing webcam: ', err));
//     };

//     startVideo();
//   }, []);

//   useEffect(() => {
//     const handleVideoPlay = () => {
//       const tracker = new window.tracking.ObjectTracker('face');
//       tracker.setInitialScale(1);
//       tracker.setStepSize(1);
//       tracker.setEdgesDensity(0.01);

//       window.tracking.track(videoRef.current, tracker);

//       tracker.on('track', event => {
//         setIsUserPresent(event.data.length > 0);
//       });
//     };

//     videoRef.current && videoRef.current.addEventListener('play', handleVideoPlay);
//   }, [videoRef]);

//   return (
//     <div>
//       <h1>User Detection</h1>
//       <video ref={videoRef} autoPlay muted width="720" height="560" />
//       <div>
//         {isUserPresent ? <p>User is present</p> : <p>No user detected</p>}
//       </div>
//     </div>
//   );
// };

// export default App;