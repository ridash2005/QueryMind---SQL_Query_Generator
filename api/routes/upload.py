import os
import sqlite3
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from model.database import set_engine_url
from agent.semantic_layer import SEMANTIC_SCHEMA
from agent.build_index import build_index

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/api/upload")
async def upload_database(
    file: UploadFile = File(...),
    x_openai_key: str | None = Header(None)
):
    try:
        # Require API Key to build the Chroma index
        api_key = x_openai_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=400, detail="OpenAI API Key is required to index the database.")
            
        # Temporarily set the env var so build_index uses it
        os.environ["OPENAI_API_KEY"] = api_key

        upload_dir = os.path.join(os.getcwd(), "data")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, "uploaded.db")
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Update database engine
        set_engine_url("sqlite:///./data/uploaded.db")
        
        # Connect and extract tables
        conn = sqlite3.connect(file_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        new_schema = []
        for table in tables:
            table_name = table[0]
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            new_schema.append({
                "table_name": table_name,
                "description": f"Custom uploaded table {table_name}",
                "columns": [{"name": col[1], "description": f"Column {col[1]} of type {col[2]}"} for col in columns]
            })
            
        conn.close()
        
        # Update global semantic schema
        SEMANTIC_SCHEMA.clear()
        SEMANTIC_SCHEMA.extend(new_schema)
        
        # Build ChromaDB index
        build_index()
        
        return {"success": True, "message": f"Successfully loaded and indexed {len(new_schema)} tables."}
    except Exception as e:
        logger.error(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
