from flask import Flask, json, request, jsonify
import pinecone
import cohere
import numpy as np
import os
import time
from pinecone import ServerlessSpec

cohere_api_key = 'your cohere api key'
pinecone_api_key = 'your pinecone api key'

index_name = "personal-virtual-assitant"
namespace = "your's_namespace" 
dimension = 4096
metric = "cosine"

llm = cohere.Client(cohere_api_key)
database = pinecone.Pinecone(api_key = pinecone_api_key)

# Define the spec for the index
spec = ServerlessSpec(
    cloud='aws',
    region='us-east-1'
)

if index_name not in database.list_indexes().names():
    # Create the index only if it doesn't already exist
    database.create_index(
        name=index_name,
        dimension=dimension,
        metric=metric,
        spec=spec
    )
# Access the existing index
index = database.Index(index_name)

time.sleep(5)

# Generates the embedding for the user query from the llm
def get_embedding(text):
    response = llm.embed(texts=[text])
    embedding = response.embeddings[0]
    return embedding

# Function to upsert the document chunks to Pinecone
def upsert_to_database(chunks, file_name, file_path):
    ids = [str(i) for i in range(len(chunks))]
    vectors = [
        (ids[i], np.array(get_embedding(chunk)).tolist(), {"text": chunk, "file_name": file_name,
        "file_path": file_path, "upload_time": time.time()})
        for i, chunk in enumerate(chunks)
    ]
    # Upsert the vectors with metadata into Pinecone
    upserted = index.upsert(vectors=vectors, namespace=namespace)
    print(f"Upserted: {upserted}")
    time.sleep(5)  # Wait for 5 seconds to ensure upsert completion
