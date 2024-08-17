# Eye Tracking Explorations

This web application built with React and WebGazer provides real-time eye tracking capabilities and hosts two experimental tools designed to enhance focus and productivity by detecting distractions and analyzing gaze patterns. Both tools require an initial calibration process to ensure accurate results tailored to the user. 

## Overview

This application consists of a main page that leads to two experimental tools:
1. Distraction Detection Tool
2. Heatmap Visualization Tool

### Distraction Detection Tool

This monitors the user's gaze and detects when they are distracted to notify them to get back on task, making it an ideal companion for study sessions or any task requiring sustained attention. It includes smart detection for phone distractions, alerting the user if their attention shifts to a device away from the hosting one. The tool aims to help users maintain focus and minimize distractions during critical work periods.

### Heatmap Visualization Tool

This tool generates a heatmap of where the user looks most frequently on the screen. By analyzing gaze data, it visualizes areas of the screen that capture the user's attention the most, providing insights into user interaction patterns. This can be particularly useful for UI/UX research, web design optimization, or simply understanding personal attention habits.

## Use Cases
* **Study Sessions**: The distraction detecion tool monitors focus and reduces the impact of distractions, which can be particularly useful when studying for upcoming exams.
* **Productivity Enhancement**: By minimizing distractions and tracking gaze patterns, these tools can help improve productivity and time management.
* **UI/UX Research**: The heatmap visualization tool gathers data on where users focus most on a webpage. This information can be valuable for refining design elements and improving overall user experience.
* **Personal Attention Analysis**: Individuals interested in understanding their own attention habits can learn more about their focus patterns and natural gave movements. 

## Usage
To run EyeTrackingExplorations locally, follow these steps:
1. **Clone the Repository:**
- Clone the QuizMeAI repository to your local machine.
2. **Navigate to the project directory:**
```
cd EyeTrackingExplorations
```
3. **Install dependencies:**
```
npm install
```
4. **Start the development server:**
```
npm start
