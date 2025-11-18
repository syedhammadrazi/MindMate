import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

export const sendQuery = async (query) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/query`, { query });
    return res.data;
  } catch (err) {
    console.error("sendQuery failed:", err);
    throw err;
  }
};

// -----------------------------------------------------------------------------
// File upload / listing / download
// -----------------------------------------------------------------------------

export const uploadFile = async (files) => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  } catch (err) {
    console.error("uploadFile failed:", err);
    throw err;
  }
};

export const getUploadedFiles = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/files`);
    return res.data;
  } catch (err) {
    console.error("getUploadedFiles failed:", err);
    throw err;
  }
};

export const downloadFile = async (fileName) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/download/${fileName}`, {
      responseType: "blob",
    });

    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");

    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error("downloadFile failed:", err);
    throw err;
  }
};
