import fitz  # PyMuPDF for PDF text extraction
from docx import Document
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_pdf(file_path):
    # Open the PDF using PyMuPDF (fitz)
    document = fitz.open(file_path)
    text = ""
    for page in document:
        text += page.get_text("text")  # Extract text from each page
    return text

def extract_text_from_docx(file_path):
    try:
        doc = Document(file_path)
        text = []
        for paragraph in doc.paragraphs:
            text.append(paragraph.text)
        # Extract text from tables (if any)
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    text.append(cell.text)

        # Extract text from headers and footers
        for section in doc.sections:
            header = section.header
            footer = section.footer
            for para in header.paragraphs + footer.paragraphs:
                text.append(para.text)
        print(f"Extracted text from docx: {text[:200]}...")  # Print the first 200 characters for debugging
        return "\n".join(text)
    except Exception as e:
        print(f"Error extracting text from DOCX: {e}")
        return ""

def extract_text_from_jpeg(file_path):
    """Extract text from a JPEG image using Tesseract."""
    try:
        image = Image.open(file_path)
        gray_image = image.convert('L')
        enhancer = ImageEnhance.Contrast(gray_image)
        gray_image = enhancer.enhance(2)
        threshold_image = gray_image.point(lambda p: p > 128 and 255)
        processed_image = threshold_image.filter(ImageFilter.MedianFilter())
        custom_config = r'--oem 3 --psm 6'  # Use OEM 3 (both standard and LSTM OCR models) and PSM 6 (Assume a single uniform block of text)
        text = pytesseract.image_to_string(processed_image, config=custom_config)
        if not text.strip():
            raise ValueError("No text found in the image.")
        print(text)
        return text
    except Exception as e:
        raise ValueError(f"Error processing image: {e}")
    
def break_text_into_chunks(text, chunk_size=300):
    # Split the text into chunks of the specified size
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    return chunks
