import React, { useState, useEffect } from "react";
import "./App.css";
import { sendQuery, uploadFile, getUploadedFiles, downloadFile } from "./api";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false); // State to toggle TTS

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await getUploadedFiles();
        setUploadedFiles(data || []);
      } catch (error) {
        console.error("Error fetching uploaded files:", error);
      }
    };
    fetchFiles();
  }, []);

  const handleSend = async (message) => {
    if (!message.trim()) return;

    setMessages([...messages, { sender: "user", text: message }]);
    setInput(""); // Clear input immediately
    setLoading(true);

    try {
      const data = await sendQuery(message);
      const botMessage = data.answer || "No response found.";
      setMessages((prev) => [...prev, { sender: "bot", text: botMessage }]);
      speakText(botMessage); // Voice output
    } catch (error) {
      const errorMessage = "Error: Unable to fetch response.";
      setMessages((prev) => [...prev, { sender: "bot", text: errorMessage }]);
      speakText(errorMessage); // Voice output
    }

    setLoading(false);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      alert("You can only upload up to 5 files at a time.");
      return;
    }
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const handleFileUpload = async () => {
    if (files.length === 0) {
      alert("Please select files first!");
      return;
    }

    setUploading(true);

    try {
      const data = await uploadFile(files);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.message || "Files uploaded successfully." },
      ]);
      setFiles([]);
      const updatedFiles = await getUploadedFiles();
      setUploadedFiles(updatedFiles || []);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error uploading files." },
      ]);
    }

    setUploading(false);
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
    } catch (error) {
      alert("Error downloading the file.");
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  
    // Check if SpeechRecognition is supported
    if (!SpeechRecognition) {
      console.log("SpeechRecognition is not supported on this browser.");
      return; // Exit if SpeechRecognition is not supported
    }
  
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
  
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => console.error("SpeechRecognition error:", event);
  
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
  
    recognition.start();
  };  

  const speakText = (text) => {
    if (!ttsEnabled) return;
  
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    
    function speak() {
      let voices = synth.getVoices();
      utterance.voice = voices.find(v => v.lang === "en-US") || voices[0];
      synth.speak(utterance);
    }
  
    if (synth.getVoices().length > 0) {
      speak();
    } else {
      synth.onvoiceschanged = speak;
    }
  };

  return (
    <div className="chat-container">
      <div className="stripe"></div>
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
        {messages.map((msg, index) => (
          <div
            key={index}
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
        {uploading && <div className="spinner"></div>}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const currentInput = input.trim();
              if (currentInput) handleSend(currentInput);
            }
          }}
          placeholder="Type your message..."
        />
        <button
          onClick={() => {
            const currentInput = input.trim();
            if (currentInput) handleSend(currentInput);
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
                {files.map((file, index) => (
                  <li key={index}>
                    <span>{file.name}</span>
                    <span
                      className="remove-file"
                      onClick={() => setFiles(files.filter((f) => f !== file))}
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
            uploadedFiles.map((file, index) => (
              <option key={index} value={file}>
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
