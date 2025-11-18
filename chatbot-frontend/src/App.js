import React, { useState, useEffect } from "react";
import "./App.css";
import {
  sendQuery,
  uploadFile,
  getUploadedFiles,
  downloadFile,
} from "./api";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // ---------------------------------------------------------------------------
  // Initial load: fetch uploaded files
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await getUploadedFiles();
        setUploadedFiles(data || []);
      } catch (err) {
        console.error("Error fetching uploaded files:", err);
      }
    };

    fetchFiles();
  }, []);

  // ---------------------------------------------------------------------------
  // Chat / query handling
  // ---------------------------------------------------------------------------
  const handleSend = async (message) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { sender: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendQuery(trimmed);
      const botMessage = data.answer || "No response found.";
      setMessages((prev) => [...prev, { sender: "bot", text: botMessage }]);
      speakText(botMessage);
    } catch (err) {
      const errorText = "Error: Unable to fetch response.";
      setMessages((prev) => [...prev, { sender: "bot", text: errorText }]);
      speakText(errorText);
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const current = input.trim();
    if (current) handleSend(current);
  };

  // ---------------------------------------------------------------------------
  // File upload / selection / download
  // ---------------------------------------------------------------------------
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    if (selected.length + files.length > 5) {
      alert("You can only upload up to 5 files at a time.");
      return;
    }

    setFiles((prev) => [...prev, ...selected]);
  };

  const handleFileUpload = async () => {
    if (!files.length) {
      alert("Please select files first!");
      return;
    }

    setUploading(true);

    try {
      const data = await uploadFile(files);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.message || "Files uploaded successfully.",
        },
      ]);
      setFiles([]);

      const updated = await getUploadedFiles();
      setUploadedFiles(updated || []);
    } catch (err) {
      console.error("Error uploading files:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error uploading files." },
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelection = (e) => {
    setSelectedFile(e.target.value);
  };

  const handleFileDownload = async () => {
    if (!selectedFile) {
      alert("Please select a file to download!");
      return;
    }

    try {
      await downloadFile(selectedFile);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert("Error downloading the file.");
    }
  };

  // ---------------------------------------------------------------------------
  // Speech recognition (STT)
  // ---------------------------------------------------------------------------
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log("SpeechRecognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) =>
      console.error("SpeechRecognition error:", event);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  // ---------------------------------------------------------------------------
  // Text-to-speech (TTS)
  // ---------------------------------------------------------------------------
  const speakText = (text) => {
    if (!ttsEnabled || !text) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    const speak = () => {
      const voices = synth.getVoices();
      utterance.voice =
        voices.find((v) => v.lang === "en-US") || voices[0] || null;
      synth.speak(utterance);
    };

    if (synth.getVoices().length > 0) {
      speak();
    } else {
      synth.onvoiceschanged = speak;
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="chat-container">
      <div className="stripe" />

      <div className="navbar">
        <h1>MindMate</h1>
        <button
          className={`tts-toggle ${ttsEnabled ? "enabled" : ""}`}
          onClick={() => setTtsEnabled((prev) => !prev)}
        >
          {ttsEnabled ? "Disable TTS" : "Enable TTS"}
        </button>
      </div>

      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message ${msg.sender === "bot" ? "bot" : "user"}`}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div className="loading-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </div>
        )}

        {uploading && <div className="spinner" />}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Type your message..."
        />
        <button
          onClick={() => {
            const current = input.trim();
            if (current) handleSend(current);
          }}
        >
          Send
        </button>
        <button onClick={startListening} onTouchStart={startListening}>
          {isListening ? "Listening..." : "Speak"}
        </button>
      </div>

      <div className="file-upload">
        <input type="file" multiple onChange={handleFileChange} />
        <button onClick={handleFileUpload} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload Files"}
        </button>

        <div className="file-preview">
          {files.length > 0 && (
            <>
              <span>Selected Files:</span>
              <ul>
                {files.map((file, idx) => (
                  <li key={`${file.name}-${idx}`}>
                    <span>{file.name}</span>
                    <span
                      className="remove-file"
                      onClick={() =>
                        setFiles((prev) =>
                          prev.filter((f) => f !== file)
                        )
                      }
                    >
                      Remove
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="uploaded-files">
        <h3>Uploaded Files</h3>
        <select value={selectedFile} onChange={handleFileSelection}>
          <option value="">Select a file</option>
          {uploadedFiles.length > 0 ? (
            uploadedFiles.map((file, idx) => (
              <option key={`${file}-${idx}`} value={file}>
                {file}
              </option>
            ))
          ) : (
            <option disabled>No files available</option>
          )}
        </select>

        {selectedFile && (
          <p>
            <strong>Selected File:</strong> {selectedFile}
          </p>
        )}

        <button onClick={handleFileDownload} disabled={!selectedFile}>
          Download Selected File
        </button>
      </div>
    </div>
  );
}

export default App;
