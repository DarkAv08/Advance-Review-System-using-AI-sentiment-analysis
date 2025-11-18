StreamWave Review Analyzer: AI-Driven Product Review System

🚀 Project Summary

This repository contains the full-stack, three-tier architecture for an intelligent product review platform. The system ingests user reviews, processes them using a Python Natural Language Processing (NLP) microservice for sentiment scoring, and stores the results in a Google Firestore database.

The primary goal is to provide actionable business intelligence by transforming raw, unstructured text into quantifiable sentiment data.

🛠️ Prerequisites

Before starting, ensure you have the following software installed on your machine:

Node.js (v18.x or higher)

npm (comes with Node.js)

Python (v3.10 or higher)

Git

Database Setup (Google Firestore)

Create a new project in the Firebase Console.

Enable Firestore Database in the project dashboard.

Generate a Service Account Key:

Go to Project Settings -> Service Accounts -> Generate new private key.

Save the downloaded JSON file (e.g., firebase-adminsdk.json) in the root of your project directory or specifically in the backend/ directory.

⚙️ Installation and Setup

This project is divided into three interconnected services: frontend, backend, and nlp-service. You must install dependencies for all three.

1. Repository Clone

# Clone the repository
git clone [YOUR_REPOSITORY_URL]
cd streamwave-review-analyzer


2. Backend (Node.js API) Setup

The backend handles all API routes, database connections, and triggers the NLP service.

cd backend/

# Install Node dependencies (Express, Firebase Admin SDK, etc.)
npm install

# Create a configuration file (e.g., .env)
# This file must contain your Firebase Admin SDK path or credentials.
cp .env.example .env

# OPEN .env and update the paths/secrets with your credentials.


3. Frontend (React/Angular UI) Setup

The frontend provides the user interface for review submission and data display.

cd ../frontend/

# Install Node dependencies (React, Tailwind CSS, etc.)
npm install

# Create a configuration file for the client-side Firebase connection
cp .env.example .env

# OPEN .env and update the client-side Firebase Config details.


4. NLP Service (Python Microservice) Setup

The Python microservice is responsible for the heavy lifting of sentiment calculation.

cd ../nlp-service/

# Create a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install required Python libraries (VADER, NLTK, FastAPI/Flask for API access)
pip install -r requirements.txt

# Deactivate virtual environment (optional, but good practice)
deactivate


▶️ Running the Application

All three services must be running concurrently for the application to function correctly.

1. Launch the Python NLP Service

This service must be running first as the Node.js backend will call its API endpoint.

cd nlp-service/
# Activate virtual environment if you deactivated it
source venv/bin/activate
# Start the Python server (replace 'app.py' with your main file name)
python3 app.py
# Example output: Running on [http://127.0.0.1:5000/](http://127.0.0.1:5000/)


2. Launch the Node.js Backend API

The backend exposes the REST API used by the frontend.

cd backend/
npm run start 
# Example output: Server running on port 3001


3. Launch the Frontend UI

The frontend provides the main user experience.

cd frontend/
npm run dev 
# Example output: Vite server running on http://localhost:5173/


The application should now be accessible in your web browser, typically at http://localhost:5173/ (or the port specified by your frontend framework).
