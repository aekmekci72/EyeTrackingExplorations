import React, { useEffect, useState, useRef } from 'react';

const EyeTracker = () => {
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [dotPosition, setDotPosition] = useState({ x: 0, y: 0 });
  const [calibrationPoint, setCalibrationPoint] = useState(null);
  const [needsRecalibration, setNeedsRecalibration] = useState(false);
  const [heatmap, setHeatmap] = useState([]);
  const canvasRef = useRef(null);
  const webgazerInitialized = useRef(false);
  const gridSize = 20; 
  const maxHeat = 100; 

  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

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

    const updateHeatmap = (position) => {
      setHeatmap((prevHeatmap) => {
        const newHeatmap = [...prevHeatmap];
        const gridX = Math.floor(position.x / gridSize);
        const gridY = Math.floor(position.y / gridSize);

        if (!newHeatmap[gridY]) {
          newHeatmap[gridY] = [];
        }
        if (!newHeatmap[gridY][gridX]) {
          newHeatmap[gridY][gridX] = 0;
        }

        newHeatmap[gridY][gridX] = Math.min(maxHeat, newHeatmap[gridY][gridX] + 5); 

        return newHeatmap;
      });
    };

    const initWebGazer = async () => {
      try {
        await window.webgazer
          .setRegression('ridge')
          .setTracker('TFFacemesh')
          .setGazeListener((data, clock) => {
            if (data == null || !isMounted) return;
            const newPosition = { x: data.x, y: data.y };
            setDotPosition(newPosition);
            updateHeatmap(newPosition);
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

    loadWebGazer();

    return () => {
      isMounted = false;
      if (webgazerInitialized.current) {
        window.webgazer
          .end()
          .then(() => {
            console.log('WebGazer ended successfully');
          })
          .catch((error) => {
            console.error('Error ending WebGazer:', error);
          });
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

    const drawHeatmap = () => {
      for (let y = 0; y < heatmap.length; y++) {
        for (let x = 0; x < (heatmap[y] || []).length; x++) {
          const heatValue = heatmap[y][x];
          if (heatValue > 0) {
            const intensity = heatValue / maxHeat;
            const color = `rgba(${255 * intensity}, ${0}, ${255 * (1 - intensity)}, ${intensity})`;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x * gridSize + gridSize / 2, y * gridSize + gridSize / 2, gridSize / 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    };

    drawHeatmap();

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
  }, [isCalibrated, dotPosition, calibrationPoint, heatmap]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
      />
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
