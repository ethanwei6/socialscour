import json
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from models import Chat, Message, Source

class StorageService:
    """
    Storage service that can use either localStorage (frontend) or file-based storage (backend).
    Designed to be easily swappable with PostgreSQL/Supabase backend.
    """
    
    def __init__(self, storage_file: str = "chats.json"):
        self.storage_file = storage_file
        self.chats: Dict[str, Chat] = {}
        self._load_chats()
    
    def _load_chats(self):
        """Load chats from storage file"""
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    # Convert loaded data back to Chat objects
                    for chat_data in data.get('chats', []):
                        chat = Chat(
                            id=chat_data['id'],
                            title=chat_data['title'],
                            messages=[Message(**msg) for msg in chat_data.get('messages', [])],
                            sources=[Source(**src) for src in chat_data.get('sources', [])],
                            created_at=datetime.fromisoformat(chat_data['created_at']),
                            updated_at=datetime.fromisoformat(chat_data['updated_at']),
                            subreddit_filter=chat_data.get('subreddit_filter')
                        )
                        self.chats[chat.id] = chat
            except Exception as e:
                print(f"Error loading chats: {e}")
                self.chats = {}
    
    def _save_chats(self):
        """Save chats to storage file"""
        try:
            # Convert chats to serializable format
            chats_data = []
            for chat in self.chats.values():
                chat_data = {
                    'id': chat.id,
                    'title': chat.title,
                    'messages': [
                        {
                            'id': msg.id,
                            'role': msg.role,
                            'content': msg.content,
                            'timestamp': msg.timestamp.isoformat()
                        } for msg in chat.messages
                    ],
                    'sources': [
                        {
                            'id': src.id,
                            'title': src.title,
                            'url': src.url,
                            'subreddit': src.subreddit,
                            'upvotes': src.upvotes,
                            'content': src.content,
                            'timestamp': src.timestamp.isoformat()
                        } for src in chat.sources
                    ],
                    'created_at': chat.created_at.isoformat(),
                    'updated_at': chat.updated_at.isoformat(),
                    'subreddit_filter': chat.subreddit_filter
                }
                chats_data.append(chat_data)
            
            with open(self.storage_file, 'w') as f:
                json.dump({'chats': chats_data}, f, indent=2)
        except Exception as e:
            print(f"Error saving chats: {e}")
    
    def create_chat(self, title: str, subreddit_filter: Optional[str] = None) -> Chat:
        """Create a new chat"""
        chat = Chat(
            title=title,
            subreddit_filter=subreddit_filter
        )
        self.chats[chat.id] = chat
        self._save_chats()
        return chat
    
    def get_chat(self, chat_id: str) -> Optional[Chat]:
        """Get a chat by ID"""
        return self.chats.get(chat_id)
    
    def get_all_chats(self) -> List[Chat]:
        """Get all chats, sorted by updated_at (most recent first)"""
        return sorted(
            self.chats.values(), 
            key=lambda x: x.updated_at, 
            reverse=True
        )
    
    def add_message(self, chat_id: str, role: str, content: str) -> Optional[Message]:
        """Add a message to a chat"""
        chat = self.get_chat(chat_id)
        if not chat:
            return None
        
        message = Message(role=role, content=content)
        chat.messages.append(message)
        chat.updated_at = datetime.now()
        self._save_chats()
        return message
    
    def add_sources(self, chat_id: str, sources: List[Source]) -> bool:
        """Add sources to a chat"""
        chat = self.get_chat(chat_id)
        if not chat:
            return False
        
        chat.sources.extend(sources)
        chat.updated_at = datetime.now()
        self._save_chats()
        return True
    
    def update_chat_title(self, chat_id: str, new_title: str) -> bool:
        """Update chat title"""
        chat = self.get_chat(chat_id)
        if not chat:
            return False
        
        chat.title = new_title
        chat.updated_at = datetime.now()
        self._save_chats()
        return True
    
    def delete_chat(self, chat_id: str) -> bool:
        """Delete a chat"""
        if chat_id in self.chats:
            del self.chats[chat_id]
            self._save_chats()
            return True
        return False
    
    def generate_chat_title(self, query: str) -> str:
        """Generate a 3-4 word title for a chat based on the initial query"""
        # Simple implementation - in production, you might use AI to generate better titles
        words = query.split()[:4]
        title = " ".join(words)
        
        # Clean up the title
        title = title.strip()
        if len(title) > 30:
            title = title[:27] + "..."
        
        return title or "New Research"

# Singleton instance
storage_service = StorageService()