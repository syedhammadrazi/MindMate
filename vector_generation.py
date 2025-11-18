import time
from typing import List

import cohere
import numpy as np
import pinecone
from pinecone import ServerlessSpec

# --- Config -------------------------------------------------------------------

COHERE_API_KEY = "your_cohere_api_key"
PINECONE_API_KEY = "your_pinecone_api_key"

INDEX_NAME = "personal-virtual-assistant"
NAMESPACE = "your_namespace"
EMBEDDING_DIM = 4096
METRIC = "cosine"

# --- Clients ------------------------------------------------------------------

co = cohere.Client(COHERE_API_KEY)
pc = pinecone.Pinecone(api_key=PINECONE_API_KEY)

spec = ServerlessSpec(
    cloud="aws",
    region="us-east-1",
)

# Create index if needed
if INDEX_NAME not in pc.list_indexes().names():
    pc.create_index(
        name=INDEX_NAME,
        dimension=EMBEDDING_DIM,
        metric=METRIC,
        spec=spec,
    )

index = pc.Index(INDEX_NAME)


# --- Embeddings ---------------------------------------------------------------

def get_embedding(text: str) -> List[float]:
    """Return a Cohere embedding for the given text."""
    resp = co.embed(texts=[text])
    return resp.embeddings[0]


# --- Upsert helper ------------------------------------------------------------

def upsert_chunks(chunks: List[str], file_name: str, file_path: str) -> None:
    """Upsert text chunks to Pinecone with basic file metadata."""
    now = time.time()
    vectors = [
        (
            str(i),
            np.array(get_embedding(chunk)).tolist(),
            {
                "text": chunk,
                "file_name": file_name,
                "file_path": file_path,
                "upload_time": now,
            },
        )
        for i, chunk in enumerate(chunks)
    ]

    result = index.upsert(vectors=vectors, namespace=NAMESPACE)
    print(f"Upserted {len(chunks)} vectors: {result}")
