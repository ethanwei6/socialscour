from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import uuid

class Message(BaseModel):
    id: str = str(uuid.uuid4())
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = datetime.now()

class Source(BaseModel):
    id: str = str(uuid.uuid4())
    title: str
    url: str
    subreddit: str
    upvotes: Optional[int] = None
    content: str
    timestamp: datetime = datetime.now()

class Chat(BaseModel):
    id: str = str(uuid.uuid4())
    title: str
    messages: List[Message] = []
    sources: List[Source] = []
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    subreddit_filter: Optional[str] = None

class QueryRequest(BaseModel):
    query: str
    chat_id: Optional[str] = None
    subreddit_filter: Optional[str] = None

class ChatTitleUpdate(BaseModel):
    title: str

class SentimentAnalysis(BaseModel):
    score: float  # 0-100, where 0 is very negative and 100 is very positive
    label: str  # "Very Negative", "Negative", "Neutral", "Positive", "Very Positive"
    confidence: float  # 0-1 confidence score