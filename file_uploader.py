from flask import Flask, request, jsonify, send_from_directory
import os
import json
import logging
from datetime import datetime
from document_processing import extract_text_from_pdf, extract_text_from_docx, extract_text_from_jpeg, break_text_into_chunks
from vector_generation import upsert_to_database, get_embedding, index, llm
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Directory to store uploaded files
UPLOAD_FOLDER = 'uploaded_files'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'jpg', 'jpeg', "png"}

# Ensure the upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Max number of files to upload
MAX_FILES = 5
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@app.route('/')
def home():
    return "Backend is running."

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist('files')

    # Check if the number of files exceeds the limit
    if len(files) > MAX_FILES:
        return jsonify({"error": f"Only up to {MAX_FILES} files are allowed."}), 400

    # Check if file size exceeds the limit
    for file in files:
        if len(file.read()) > MAX_FILE_SIZE:
            return jsonify({"error": f"{file.filename} exceeds the file size limit of 10MB."}), 400
        file.seek(0)  # Reset file pointer after checking size

    # Process each file
    uploaded_files = []
    for file in files:
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Check if the file has an allowed extension
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400

        # Save the file to the upload directory
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(file_path)

        # Determine the file type and extract text
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        if file_extension == 'pdf':
            text = extract_text_from_pdf(file_path)
        elif file_extension == 'docx':
            text = extract_text_from_docx(file_path)
        elif file_extension in {"jpg", "jpeg", "png"}:
            text = extract_text_from_jpeg(file_path)
        else:
            continue  # Skip unsupported file types

        chunks = break_text_into_chunks(text)
        upsert_to_database(chunks, file.filename, file_path)

        uploaded_files.append({
            "file_path": file_path,
            "chunks": chunks
        })

    return jsonify({
        "message": "Files uploaded successfully",
        "uploaded_files": uploaded_files
    }), 200

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/query', methods=['POST'])
def query():
    data = request.json
    query_text = data.get('query', '')

    if not query_text:
        return jsonify({'error': 'No query text provided.'}), 400

    # Generate the query embedding
    query_embedding = np.array(get_embedding(query_text)).tolist()

    try:
        # Query Pinecone
        results = index.query(vector=query_embedding, namespace="your_namespace", top_k=10, include_metadata=True)

        similarity_threshold = 0.5

        # Check if any match exceeds the threshold
        matches = [
            match for match in results['matches'] if match['score'] >= similarity_threshold
        ]

        if matches:
            # Combine matched chunks into a single coherent response
            combined_answer = " ".join(
                match['metadata']['text'] for match in matches if 'metadata' in match
            )
            # Use a generative model to create a response
            prompt = f"Answer the following question based on the provided context:\nContext: {combined_answer}\nQuestion: {query_text}"
            response = llm.generate(prompt=prompt, max_tokens=300)

            # Extract the generated text
            generated_text = response.generations[0].text.strip()
            return jsonify({'answer': generated_text})
        else:
            return jsonify({'answers': ["Sorry, I couldn't find an answer."]}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/files', methods=['GET'])
def get_uploaded_files():
    # Get list of files in the upload folder
    uploaded_files = os.listdir(UPLOAD_FOLDER)
    # Filter out directories if needed
    uploaded_files = [f for f in uploaded_files if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))]
    return jsonify(uploaded_files)

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    """Endpoint to download a specific file."""
    try:
        return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
