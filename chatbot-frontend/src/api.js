import axios from "axios";

const API_BASE_URL = "http://localhost:5000"; // Replace with your backend URL

export const sendQuery = async (query) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/query`, { query });
    return response.data;
  } catch (error) {
    console.error("Error in sendQuery:", error);
    throw error;
  }
};

export const uploadFile = async (files) => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("Error in uploadFile:", error);
    throw error;
  }
};

export const getUploadedFiles = async () => {
  try {
    console.log("Fetching uploaded files...");
    const response = await axios.get(`${API_BASE_URL}/files`);
    console.log("Uploaded files response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in getUploadedFiles:", error);
    throw error;
  }
};

// New function for downloading a file
export const downloadFile = async (fileName) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/download/${fileName}`, {
      responseType: "blob", // Important for handling file downloads
    });

    // Create a download link and trigger it
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName); // Use the file name from the backend
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  } catch (error) {
    console.error("Error in downloadFile:", error);
    throw error;
  }
};
