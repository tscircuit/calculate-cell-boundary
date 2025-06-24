import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Shuffle } from 'lucide-react';

const RectMergeVisualization = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [speed, setSpeed] = useState(1000);

  // Grid configuration
  const GRID_SIZE = 400;
  const NUM_LINES = 7;
  
  // State for subdivision lines and key points
  const [subdivisionLines, setSubdivisionLines] = useState({ horizontal: [], vertical: [] });
  const [keyPoints, setKeyPoints] = useState([]);
  
  // Colors for different merged groups
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
  ];

  // Generate new random subdivision lines
  const generateRandomLines = () => {
    const horizontal = [0]; // Always include boundaries
    const vertical = [0];
    
    // Generate random interior lines
    for (let i = 1; i < NUM_LINES; i++) {
      horizontal.push((i / NUM_LINES) * GRID_SIZE + (Math.random() - 0.5) * (GRID_SIZE / NUM_LINES * 0.6));
      vertical.push((i / NUM_LINES) * GRID_SIZE + (Math.random() - 0.5) * (GRID_SIZE / NUM_LINES * 0.6));
    }
    
    horizontal.push(GRID_SIZE); // Always include boundaries
    vertical.push(GRID_SIZE);
    
    // Sort the lines
    horizontal.sort((a, b) => a - b);
    vertical.sort((a, b) => a - b);
    
    return { horizontal, vertical };
  };

  // Generate new random key points
  const generateRandomKeyPoints = () => {
    const points = [];
    const numPoints = 3 + Math.floor(Math.random() * 3); // 3-5 points
    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: 20 + Math.random() * (GRID_SIZE - 40), // Keep points away from edges
        y: 20 + Math.random() * (GRID_SIZE - 40),
        id: i
      });
    }
    return points;
  };

  // Initialize subdivision lines and key points on first load
  useEffect(() => {
    setSubdivisionLines(generateRandomLines());
    setKeyPoints(generateRandomKeyPoints());
  }, []);

  // Create initial grid of rectangles based on subdivision lines
  const createInitialGrid = () => {
    if (subdivisionLines.horizontal.length === 0 || subdivisionLines.vertical.length === 0) {
      return [];
    }
    
    const rects = [];
    let id = 0;
    
    for (let row = 0; row < subdivisionLines.horizontal.length - 1; row++) {
      for (let col = 0; col < subdivisionLines.vertical.length - 1; col++) {
        const rect = {
          id: id++,
          x: subdivisionLines.vertical[col],
          y: subdivisionLines.horizontal[row],
          width: subdivisionLines.vertical[col + 1] - subdivisionLines.vertical[col],
          height: subdivisionLines.horizontal[row + 1] - subdivisionLines.horizontal[row],
          row,
          col,
          merged: false,
          groupId: null,
          color: '#f0f0f0'
        };
        rects.push(rect);
      }
    }
    return rects;
  };

  // Check if a point is inside a rectangle
  const isPointInRect = (point, rect) => {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
           point.y >= rect.y && point.y <= rect.y + rect.height;
  };

  // Calculate distance from point to rectangle edge
  const distanceToRectEdge = (point, rect) => {
    const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
    const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Check if two rectangles are adjacent (share an edge)
  const areAdjacent = (rect1, rect2) => {
    const tolerance = 1; // Small tolerance for floating point comparison
    
    // Check if they share a vertical edge
    const shareVerticalEdge = (
      (Math.abs(rect1.x + rect1.width - rect2.x) < tolerance || 
       Math.abs(rect2.x + rect2.width - rect1.x) < tolerance) &&
      !(rect1.y + rect1.height <= rect2.y || rect2.y + rect2.height <= rect1.y)
    );
    
    // Check if they share a horizontal edge
    const shareHorizontalEdge = (
      (Math.abs(rect1.y + rect1.height - rect2.y) < tolerance || 
       Math.abs(rect2.y + rect2.height - rect1.y) < tolerance) &&
      !(rect1.x + rect1.width <= rect2.x || rect2.x + rect2.width <= rect1.x)
    );
    
    return shareVerticalEdge || shareHorizontalEdge;
  };

  // Generate all algorithm steps
  const generateSteps = () => {
    if (keyPoints.length === 0 || subdivisionLines.horizontal.length === 0) {
      return []; // Wait for both key points and subdivision lines to be generated
    }
    
    const steps = [];
    
    // Step 0: Initial grid with unmerged rectangles
    const initialRects = createInitialGrid();
    steps.push({
      rects: JSON.parse(JSON.stringify(initialRects)), // Deep copy
      description: `Initial ${NUM_LINES}×${NUM_LINES} irregular grid with random key points`,
      highlightedRect: null
    });

    // Step 1: Mark initial merged rectangles (those containing key points)
    const rectsWithMerged = JSON.parse(JSON.stringify(initialRects)); // Deep copy
    keyPoints.forEach((point, index) => {
      const containingRect = rectsWithMerged.find(rect => isPointInRect(point, rect));
      if (containingRect) {
        containingRect.merged = true;
        containingRect.groupId = index;
        containingRect.color = colors[index];
      }
    });

    steps.push({
      rects: JSON.parse(JSON.stringify(rectsWithMerged)), // Deep copy
      description: "Rectangles containing key points are marked as merged (different colors)",
      highlightedRect: null
    });

    // Step 2+: Process unmerged rectangles in order of distance
    let currentRects = JSON.parse(JSON.stringify(rectsWithMerged)); // Working copy
    const unmergedRects = currentRects.filter(rect => !rect.merged);
    
    // Calculate distances and sort
    const rectDistances = unmergedRects.map(rect => {
      const distances = keyPoints.map(point => distanceToRectEdge(point, rect));
      const minDistance = Math.min(...distances);
      return { rect, distance: minDistance };
    }).sort((a, b) => a.distance - b.distance);

    // Process each unmerged rectangle
    rectDistances.forEach(({ rect: rectRef, distance }) => {
      // Find the actual rectangle in current state
      const currentRect = currentRects.find(r => r.id === rectRef.id);
      if (currentRect && currentRect.merged) return; // Skip if already merged
      
      // Find adjacent merged rectangles
      const adjacentMerged = currentRects.filter(otherRect => 
        otherRect.merged && areAdjacent(currentRect, otherRect)
      );

      if (adjacentMerged.length > 0) {
        // Merge with the first adjacent merged rectangle
        const targetGroup = adjacentMerged[0];
        currentRect.merged = true;
        currentRect.groupId = targetGroup.groupId;
        currentRect.color = targetGroup.color;

        steps.push({
          rects: JSON.parse(JSON.stringify(currentRects)), // Deep copy
          description: `Merging rectangle (distance: ${distance.toFixed(1)}) with adjacent merged group`,
          highlightedRect: currentRect.id
        });
      }
    });

    return steps;
  };

  const steps = useMemo(() => generateSteps(), [keyPoints, subdivisionLines]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && step < steps.length - 1) {
      const timer = setTimeout(() => {
        setStep(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (step >= steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, step, speed, steps.length]);

  const currentStep = steps[step] || { rects: [], description: "Generating...", highlightedRect: null };

  // Don't render if we don't have steps yet
  if (steps.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Rectangle Merging Algorithm</h2>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">Generating irregular grid and key points...</div>
        </div>
      </div>
    );
  }

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setStep(0);
    setIsPlaying(false);
  };
  const handleRandomize = () => {
    setSubdivisionLines(generateRandomLines());
    setKeyPoints(generateRandomKeyPoints());
    setStep(0);
    setIsPlaying(false);
  };
  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(prev => prev + 1);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Rectangle Merging Algorithm</h2>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
              onClick={handleNext}
              disabled={step >= steps.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 transition-colors"
            >
              <SkipForward size={16} />
              Next
            </button>
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              <RotateCcw size={16} />
              Reset
            </button>
            
            <button
              onClick={handleRandomize}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              <Shuffle size={16} />
              Randomize
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="speed" className="text-sm font-medium">Speed:</label>
            <input
              id="speed"
              type="range"
              min="200"
              max="2000"
              step="200"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600">{(2200 - speed) / 200}x</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {step + 1} of {steps.length}</span>
            <div className="text-sm text-gray-600">
              Progress: {Math.round(((step + 1) / steps.length) * 100)}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{currentStep.description}</p>
          <p className="text-xs text-gray-500 mt-1">Key points: {keyPoints.length}</p>
        </div>

        {/* Visualization */}
        <div className="flex justify-center">
          <svg width={GRID_SIZE + 40} height={GRID_SIZE + 40} className="border border-gray-300 rounded">
            <g transform="translate(20, 20)">
              {/* Grid lines */}
              {subdivisionLines.horizontal.map((y, i) => (
                <line
                  key={`h-line-${i}`}
                  x1={0}
                  y1={y}
                  x2={GRID_SIZE}
                  y2={y}
                  stroke="#ddd"
                  strokeWidth="1"
                />
              ))}
              {subdivisionLines.vertical.map((x, i) => (
                <line
                  key={`v-line-${i}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={GRID_SIZE}
                  stroke="#ddd"
                  strokeWidth="1"
                />
              ))}

              {/* Rectangles */}
              {currentStep.rects.map((rect) => (
                <rect
                  key={rect.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill={rect.color}
                  stroke={currentStep.highlightedRect === rect.id ? "#333" : "#999"}
                  strokeWidth={currentStep.highlightedRect === rect.id ? "3" : "1"}
                  opacity={rect.merged ? 0.8 : 0.3}
                />
              ))}

              {/* Key points */}
              {keyPoints.map((point, index) => (
                <g key={`point-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#333"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={point.x}
                    y={point.y - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#333"
                    fontWeight="bold"
                  >
                    K{index + 1}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Legend:</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 border rounded"></div>
              <span>Unmerged rectangle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-400 border rounded opacity-80"></div>
              <span>Merged rectangle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-black rounded-full"></div>
              <span>Key point</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RectMergeVisualization;