from fastapi import FastAPI, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
import asyncio
import json

from models import QueryRequest, ChatTitleUpdate, Chat, Message, Source, SentimentAnalysis
from rag_service import rag_service
from storage_service import storage_service

# Create FastAPI app
app = FastAPI(title="SocialScour API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SocialScour API"}

# Chat management endpoints
@app.get("/api/chats", response_model=List[Chat])
async def get_chats():
    """Get all chat histories"""
    return storage_service.get_all_chats()

@app.post("/api/chats", response_model=Chat)
async def create_chat(query: str = Form(...), subreddit_filter: Optional[str] = Form(None)):
    """Create a new chat"""
    # Generate title from query
    title = storage_service.generate_chat_title(query)
    chat = storage_service.create_chat(title, subreddit_filter)
    
    # Add initial user message
    storage_service.add_message(chat.id, "user", query)
    
    return chat

@app.get("/api/chats/{chat_id}", response_model=Chat)
async def get_chat(chat_id: str):
    """Get a specific chat by ID"""
    chat = storage_service.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.put("/api/chats/{chat_id}/title")
async def update_chat_title(chat_id: str, update: ChatTitleUpdate):
    """Update chat title"""
    success = storage_service.update_chat_title(chat_id, update.title)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"success": True}

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat"""
    success = storage_service.delete_chat(chat_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"success": True}

# Helper function to generate research stream
async def generate_research_stream(chat_id: str, query: str, subreddit_filter: Optional[str] = None):
    """Generate streaming research results"""
    accumulated_content = []
    sentiment_data = None
    
    try:
        # Search Reddit
        search_results = await rag_service.search_reddit(
            query, 
            subreddit_filter
        )
        
        if not search_results:
            error_msg = "No relevant discussions found on Reddit."
            yield f'data: "{error_msg}"\n\n'
            yield "data: [DONE]\n\n"
            storage_service.add_message(chat_id, "assistant", error_msg)
            return
        
        # Stream the report generation and accumulate content
        async for chunk in rag_service.generate_sentiment_report(
            query, 
            search_results,
            subreddit_filter
        ):
            # Parse the chunk to extract content
            if chunk.startswith('data: '):
                data = chunk[6:].strip()
                
                # Skip [DONE] marker
                if data == '[DONE]':
                    yield chunk
                    continue
                
                # Try to parse as sentiment JSON (skip accumulation)
                try:
                    parsed = json.loads(data)
                    if isinstance(parsed, dict) and 'score' in parsed and 'label' in parsed:
                        sentiment_data = parsed
                        yield chunk
                        continue
                except (json.JSONDecodeError, ValueError):
                    pass
                
                # This is text content - accumulate it
                # Remove quotes if present and unescape
                text_content = data
                if text_content.startswith('"') and text_content.endswith('"'):
                    text_content = text_content[1:-1]
                text_content = text_content.replace('\\n', '\n').replace('\\"', '"')
                
                if text_content and text_content != '[DONE]':
                    accumulated_content.append(text_content)
            
            yield chunk
        
        # Save the accumulated content as the assistant message
        full_content = ''.join(accumulated_content).strip()
        if full_content:
            storage_service.add_message(chat_id, "assistant", full_content)
        else:
            # Fallback if no content was accumulated
            storage_service.add_message(chat_id, "assistant", "Report generated successfully")
        
        # Convert search results to sources and save them
        sources = []
        for i, result in enumerate(search_results[:8]):
            source = Source(
                title=result.get('title', 'No Title'),
                url=result.get('url', ''),
                subreddit=rag_service.extract_subreddit_from_url(result.get('url', '')),
                upvotes=rag_service.extract_upvotes_from_content(result.get('content', '')),
                content=result.get('content', '')[:1000]
            )
            sources.append(source)
        
        # Add sources to chat
        storage_service.add_sources(chat_id, sources)
        
    except Exception as e:
        yield f'data: "Error: {str(e)}"\n\n'
        yield "data: [DONE]\n\n"

# Research query endpoint with streaming
@app.post("/api/research/{chat_id}/stream")
async def stream_research(chat_id: str, request: QueryRequest):
    """Stream research results for a chat"""
    
    # Verify chat exists
    chat = storage_service.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Add user message to chat
    storage_service.add_message(chat_id, "user", request.query)
    
    return StreamingResponse(
        generate_research_stream(chat_id, request.query, request.subreddit_filter),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# New research endpoint
@app.post("/api/research")
async def create_new_research(request: QueryRequest):
    """Create a new research session and return streaming response"""
    
    # Create new chat
    chat = storage_service.create_chat(
        storage_service.generate_chat_title(request.query),
        request.subreddit_filter
    )
    
    # Add user message
    storage_service.add_message(chat.id, "user", request.query)
    
    # Return streaming response
    return StreamingResponse(
        generate_research_stream(chat.id, request.query, request.subreddit_filter),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Chat-ID": chat.id
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)