# MindMate - Personal Virtual Assistant Chatbot

MindMate is an AI-powered personal virtual assistant chatbot built using Python, it is designed to help users retrieve information from the documents they upload.
It integrates with a react built web-based frontend for interactive communication.

## Technologies Used
- Python
- Flask (Backend)
- JavaScript
- React.js (Frontend)
- Cohere (for NLP)
- Pinecone (for vector storage)

## Features
- Real-time chat with the virtual assistant
- Document uploads with vector search for content retrieval
- Retrieval-Augmented Generation (RAG) workflow for generating responses
- User-friendly interface with a dynamic chat window
- Able to scroll through the uploaded files and be able to download them
- Ask your queries using by voice or typing
- Text to speech available

## Installation Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/MindMate.git
   ```
2. Navigate to the project directory:
   ```bash
   cd MindMate
   ```
3. Install dependencies:
   - For the backend (Python):
     ```bash
     pip install -r requirements.txt
     ```
   - For the frontend (React.js):
     ```bash
     cd chatbot-frontend
     npm install
     ```
4. Start the backend server:
   ```bash
   python app.py
   ```
5. Start the frontend server:
   ```bash
   npm start
   ```
## Usage
After setting up the project, you can interact with the virtual assistant through the web interface. The assistant can help with a variety of tasks, such as answering questions and managing documents.

