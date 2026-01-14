# SocialScour Enterprise Edition

A sophisticated "Search-First RAG" tool for real-time Reddit sentiment analysis, built with FastAPI, React, and Gemini 1.5 Flash.

## Features

- **Real-time Reddit Search**: Uses Tavily API to search Reddit discussions in real-time
- **AI-Powered Sentiment Analysis**: Gemini 1.5 Flash analyzes sentiment and generates structured reports
- **Three-Column Interface**: Clean, professional layout optimized for information density
- **Streaming Responses**: Real-time report generation with live sentiment gauges
- **Chat History**: Persistent storage of research sessions with editable titles
- **Subreddit Filtering**: Target specific communities or search across all of Reddit
- **Dark/Light Mode**: Full theme support with system preference detection

## Architecture

### Backend (FastAPI + Python)
- **FastAPI**: High-performance async web framework
- **Tavily API**: Real-time Reddit search integration
- **Gemini 1.5 Flash**: AI-powered sentiment analysis and report generation
- **Streaming**: Server-sent events for real-time response streaming
- **Modular Design**: Easy to swap file storage for PostgreSQL/Supabase

### Frontend (React + TypeScript)
- **React 18**: Modern React with hooks and context
- **TypeScript**: Full type safety and better developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **Three-Column Layout**: Navigation, Research Engine, Intelligence Sidebar
- **Streaming**: ReadableStream API for live content updates

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- Tavily API Key
- Gemini API Key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` to access the application.

## API Endpoints

### Chat Management
- `GET /api/chats` - Get all chat histories
- `POST /api/chats` - Create new chat
- `GET /api/chats/{chat_id}` - Get specific chat
- `PUT /api/chats/{chat_id}/title` - Update chat title
- `DELETE /api/chats/{chat_id}` - Delete chat

### Research
- `POST /api/research/{chat_id}/stream` - Stream research results
- `POST /api/research` - Create new research and stream results

### Health
- `GET /health` - Health check endpoint

## Configuration

### Environment Variables

```env
TAVILY_API_KEY=your_tavily_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Storage Configuration

The application uses a file-based storage system by default (`chats.json`). To switch to PostgreSQL:

1. Update `storage_service.py` to use SQLAlchemy
2. Modify the `StorageService` class methods
3. Update environment variables for database connection

## Project Structure

```
socialscour/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic models
│   ├── rag_service.py       # RAG and sentiment analysis
│   ├── storage_service.py   # Chat persistence
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── types/           # TypeScript types
│   │   ├── lib/             # Utility functions
│   │   └── styles/          # CSS and Tailwind
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Usage

1. **Start a Research Session**: Click "New Research" or enter a query in the search bar
2. **Enter Your Query**: Type any topic, brand, or product name
3. **Filter by Subreddit** (Optional): Target specific communities like r/technology
4. **Analyze Results**: View real-time sentiment analysis and detailed reports
5. **Explore Sources**: Click citation numbers to view original Reddit discussions
6. **Manage History**: Edit chat titles, delete old sessions, and revisit past research

## Prompt Engineering

The system uses a structured prompt for Gemini 1.5 Flash:

```
**Direct Answer:** (2-3 sentences summarizing sentiment)

**Key Sentiment Drivers:**
- Driver 1
- Driver 2
- Driver 3

**Contradicting Views:**
- Contradicting point 1
- Contradicting point 2
```

## Deployment

### Docker (Recommended)

```dockerfile
# Dockerfile for backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Build

```bash
# Frontend production build
cd frontend
npm run build

# Serve with nginx or any static file server
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For support, please open an issue on GitHub or contact the development team.