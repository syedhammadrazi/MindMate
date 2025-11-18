import os
import time

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from document_processing import (
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_text_from_jpeg,
    break_text_into_chunks,
)
from vector_generation import upsert_to_database, get_embedding, index, llm

# ------------------------------------------------------------------------------
# Config
# ------------------------------------------------------------------------------

UPLOAD_FOLDER = "uploaded_files"
ALLOWED_EXTENSIONS = {"pdf", "docx", "jpg", "jpeg", "png"}

MAX_FILES = 5
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
SIMILARITY_THRESHOLD = 0.5
NAMESPACE = "your_namespace"  # Make sure this matches vector_generation.py

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------

def allowed_file(filename: str) -> bool:
    """Return True if the filename has an allowed extension."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def file_too_large(file) -> bool:
    """Check if an uploaded file exceeds the size limit without loading into memory."""
    pos = file.tell()
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(pos, os.SEEK_SET)
    return size > MAX_FILE_SIZE_BYTES


# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------

@app.route("/")
def home():
    return "Backend is running."


@app.route("/upload", methods=["POST"])
def upload_file():
    if "files" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist("files")

    if not files:
        return jsonify({"error": "No files provided"}), 400

    if len(files) > MAX_FILES:
        return jsonify({"error": f"Only up to {MAX_FILES} files are allowed."}), 400

    uploaded_files = []

    # Validate sizes first
    for file in files:
        if file.filename == "":
            return jsonify({"error": "One of the files has no name."}), 400
        if file_too_large(file):
            return jsonify({
                "error": f"{file.filename} exceeds the file size limit of 10MB."
            }), 400

    # Process each file
    for file in files:
        filename = file.filename

        if not allowed_file(filename):
            return jsonify({"error": f"Invalid file type: {filename}"}), 400

        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        ext = filename.rsplit(".", 1)[1].lower()

        if ext == "pdf":
            text = extract_text_from_pdf(file_path)
        elif ext == "docx":
            text = extract_text_from_docx(file_path)
        elif ext in {"jpg", "jpeg", "png"}:
            text = extract_text_from_jpeg(file_path)
        else:
            # Shouldn't happen because of allowed_file, but just in case
            continue

        chunks = break_text_into_chunks(text)
        upsert_to_database(chunks, filename, file_path)

        uploaded_files.append(
            {
                "file_path": file_path,
                "chunks": chunks,
            }
        )

    return jsonify(
        {
            "message": "Files uploaded successfully",
            "uploaded_files": uploaded_files,
        }
    ), 200


@app.route("/query", methods=["POST"])
def query():
    data = request.get_json(silent=True) or {}
    query_text = data.get("query", "").strip()

    if not query_text:
        return jsonify({"error": "No query text provided."}), 400

    # Generate query embedding
    query_embedding = get_embedding(query_text)

    try:
        results = index.query(
            vector=query_embedding,
            namespace=NAMESPACE,
            top_k=10,
            include_metadata=True,
        )

        matches = [
            m
            for m in results.get("matches", [])
            if m.get("score", 0) >= SIMILARITY_THRESHOLD
        ]

        if not matches:
            return jsonify(
                {"answers": ["Sorry, I couldn't find an answer."]}
            ), 404

        # Combine matched chunks into a single context
        combined_context_parts = []
        for m in matches:
            metadata = m.get("metadata") or {}
            text_chunk = metadata.get("text")
            if text_chunk:
                combined_context_parts.append(text_chunk)

        combined_context = " ".join(combined_context_parts)

        prompt = (
            "Answer the following question based on the provided context.\n\n"
            f"Context:\n{combined_context}\n\n"
            f"Question:\n{query_text}\n\n"
            "Answer clearly and concisely:"
        )

        response = llm.generate(prompt=prompt, max_tokens=300)
        generated_text = response.generations[0].text.strip()

        return jsonify({"answer": generated_text})

    except Exception as e:
        # Optional: log error to stdout for debugging
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] /query error:", e)
        return jsonify({"error": "Internal server error."}), 500


@app.route("/files", methods=["GET"])
def get_uploaded_files():
    files = [
        f
        for f in os.listdir(UPLOAD_FOLDER)
        if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))
    ]
    return jsonify(files)


@app.route("/download/<filename>", methods=["GET"])
def download_file(filename):
    try:
        return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404


# ------------------------------------------------------------------------------
# Entry point
# ------------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
