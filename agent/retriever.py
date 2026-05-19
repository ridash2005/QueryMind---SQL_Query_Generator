"""
retriever.py — RAG-based schema retrieval from ChromaDB.

# INTERN NOTE: RAG retrieval explained
# At query time we embed the user's natural-language question (e.g. "top
# revenue by category") using the same model that was used during indexing.
# ChromaDB performs an approximate nearest-neighbor (ANN) cosine similarity
# search and returns the k most semantically similar table schemas.
# We then format those schemas as a compact text block and inject them into
# the LLM system prompt. This gives the LLM precise, relevant context without
# overloading the prompt with irrelevant tables.
# The quality of retrieval directly impacts SQL accuracy — better descriptions
# in the semantic layer = better retrieval = fewer hallucinated joins.
"""

import os
import logging
from typing import Optional

import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

COLLECTION_NAME = "schema_index"
_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None


_last_api_key: Optional[str] = None

def _get_collection(api_key: str | None = None) -> chromadb.Collection:
    """Lazily initialise and cache the ChromaDB collection. Reinitialize if api_key changes."""
    global _client, _collection, _last_api_key
    
    current_key = api_key or os.getenv("OPENAI_API_KEY", "")
    
    if _collection is not None and _last_api_key == current_key:
        return _collection

    persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_store")
    embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    _client = chromadb.PersistentClient(path=persist_dir)
    embedding_fn = OpenAIEmbeddingFunction(
        api_key=current_key,
        model_name=embedding_model,
    )
    _collection = _client.get_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_fn,
    )
    _last_api_key = current_key
    return _collection


def get_relevant_schema(query: str, k: int = 3, api_key: str | None = None) -> str:
    """
    Embed *query*, similarity-search ChromaDB, and return a formatted
    table+column block suitable for injection into an LLM prompt.

    Args:
        query: The user's natural-language question.
        k:     Number of most relevant tables to retrieve.
        api_key: Dynamic OpenAI API Key.

    Returns:
        A newline-delimited schema block string.
    """
    try:
        collection = _get_collection(api_key)
        collection_count = collection.count()
        if collection_count == 0:
            logger.debug("Schema collection is empty; returning empty context for query: %s", query)
            return ""

        n_results = min(k, collection_count)
        if n_results < 1:
            logger.debug("Requested n_results=%d; returning empty context for query: %s", n_results, query)
            return ""

        results = collection.query(query_texts=[query], n_results=n_results)
        documents: list[str] = results["documents"][0]  # type: ignore[index]
        logger.debug("Retrieved %d schema snippets for query: %s", len(documents), query)
        return "\n\n---\n\n".join(documents)
    except Exception as exc:
        logger.warning("Schema retrieval failed: %s — falling back to empty context.", exc)
        return ""
