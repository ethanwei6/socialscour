import os
import asyncio
from typing import List, Dict, Any, AsyncGenerator
import google.generativeai as genai
from tavily import TavilyClient
from dotenv import load_dotenv
import json
import re

from models import Source, SentimentAnalysis

load_dotenv()

class RAGService:
    def __init__(self):
        # Initialize Tavily client
        tavily_key = os.getenv("TAVILY_API_KEY")
        if not tavily_key:
            print("Warning: TAVILY_API_KEY not found in environment variables")
        self.tavily_client = TavilyClient(api_key=tavily_key) if tavily_key else None
        
        # Initialize Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            print("Warning: GEMINI_API_KEY not found in environment variables")
            self.gemini_model = None
        else:
            genai.configure(api_key=gemini_key)
            # Try gemini-1.5-flash first (faster and more cost-effective)
            # Fallback to gemini-1.5-pro if flash is not available
            # The old 'gemini-pro' model name is deprecated
            try:
                self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
                # Test the model with a simple call to verify it's valid
                test_response = self.gemini_model.generate_content("test")
                if test_response and hasattr(test_response, 'text'):
                    print("✓ Gemini model initialized and validated: gemini-1.5-flash")
                else:
                    raise ValueError("Model initialized but test call failed")
            except Exception as e:
                print(f"Error initializing gemini-1.5-flash: {e}")
                print("Attempting to use gemini-1.5-pro...")
                try:
                    self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')
                    test_response = self.gemini_model.generate_content("test")
                    if test_response and hasattr(test_response, 'text'):
                        print("✓ Gemini model initialized and validated: gemini-1.5-pro")
                    else:
                        raise ValueError("Model initialized but test call failed")
                except Exception as e2:
                    print(f"Error initializing gemini-1.5-pro: {e2}")
                    print("Attempting to list available models...")
                    try:
                        # Try to list available models
                        available_models = []
                        for model in genai.list_models():
                            if 'generateContent' in model.supported_generation_methods:
                                model_name = model.name.split('/')[-1]
                                available_models.append(model_name)
                                print(f"  Available model: {model_name}")
                        
                        # Try each available model until one works
                        for model_name in available_models:
                            try:
                                self.gemini_model = genai.GenerativeModel(model_name)
                                test_response = self.gemini_model.generate_content("test")
                                if test_response and hasattr(test_response, 'text'):
                                    print(f"✓ Using model: {model_name}")
                                    break
                            except Exception as test_err:
                                print(f"  Model {model_name} failed validation: {test_err}")
                                continue
                        else:
                            # If we get here, no model worked
                            print("❌ No valid Gemini models found")
                            self.gemini_model = None
                    except Exception as e3:
                        print(f"Could not list models: {e3}")
                        self.gemini_model = None
        
    async def search_reddit(self, query: str, subreddit_filter: str = None, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search Reddit using Tavily API"""
        try:
            if not self.tavily_client:
                raise ValueError("Tavily client not initialized. Check TAVILY_API_KEY.")
            
            # Construct search query with subreddit filter
            search_query = f"{query} site:reddit.com"
            if subreddit_filter:
                search_query = f"{query} site:reddit.com/r/{subreddit_filter}"
            
            # Perform search with advanced settings
            response = self.tavily_client.search(
                query=search_query,
                search_depth="advanced",
                include_domains=["reddit.com"],
                max_results=max_results,
                include_answer=False,
                include_raw_content=True
            )
            
            return response.get('results', [])
        except Exception as e:
            print(f"Error searching Reddit: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def extract_subreddit_from_url(self, url: str) -> str:
        """Extract subreddit name from Reddit URL"""
        match = re.search(r'reddit\.com/r/([^/]+)', url)
        return match.group(1) if match else "unknown"
    
    def extract_upvotes_from_content(self, content: str) -> int:
        """Extract upvote count from content if available"""
        # This is a simplified extraction - real implementation would need more sophisticated parsing
        upvote_match = re.search(r'(\d+)\s*(upvotes?|karma|points?)', content.lower())
        if upvote_match:
            return int(upvote_match.group(1))
        return 0
    
    async def analyze_sentiment(self, texts: List[str]) -> SentimentAnalysis:
        """Analyze sentiment using Gemini"""
        try:
            if not self.gemini_model:
                raise ValueError("Gemini model not initialized. Check GEMINI_API_KEY.")
            
            combined_text = " ".join(texts[:5])  # Limit to first 5 texts to avoid token limits
            
            if not combined_text.strip():
                print("Warning: No text provided for sentiment analysis")
                return SentimentAnalysis(score=50, label="Neutral", confidence=0.0)
            
            sentiment_prompt = f"""
Analyze the sentiment of the following text and provide:
1. A sentiment score from 0-100 (0=very negative, 50=neutral, 100=very positive)
2. A sentiment label (Very Negative, Negative, Neutral, Positive, Very Positive)
3. A confidence score from 0-1

Text: {combined_text[:2000]}

Respond only with a JSON object in this exact format:
{{
    "score": <number 0-100>,
    "label": "<sentiment label>",
    "confidence": <number 0-1>
}}
"""
            
            print(f"Calling Gemini for sentiment analysis with text length: {len(combined_text)}")
            response = self.gemini_model.generate_content(sentiment_prompt)
            
            if not response or not hasattr(response, 'text'):
                print("Error: Gemini response has no text attribute")
                return SentimentAnalysis(score=50, label="Neutral", confidence=0.0)
            
            response_text = response.text.strip()
            print(f"Gemini sentiment response: {response_text[:200]}")
            
            # Parse the JSON response - try to extract JSON from markdown code blocks if present
            try:
                # Remove markdown code blocks if present
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0].strip()
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0].strip()
                
                sentiment_data = json.loads(response_text)
                return SentimentAnalysis(
                    score=sentiment_data.get('score', 50),
                    label=sentiment_data.get('label', 'Neutral'),
                    confidence=sentiment_data.get('confidence', 0.5)
                )
            except json.JSONDecodeError as json_err:
                print(f"JSON parsing error: {json_err}")
                print(f"Response text: {response_text}")
                # Fallback if JSON parsing fails
                return SentimentAnalysis(score=50, label="Neutral", confidence=0.3)
                
        except Exception as e:
            print(f"Error analyzing sentiment: {e}")
            import traceback
            traceback.print_exc()
            return SentimentAnalysis(score=50, label="Neutral", confidence=0.0)
    
    async def generate_sentiment_report(
        self, 
        query: str, 
        search_results: List[Dict[str, Any]],
        subreddit_filter: str = None
    ) -> AsyncGenerator[str, None]:
        """Generate streaming sentiment report using Gemini"""
        
        # Prepare context from search results
        sources = []
        context_parts = []
        
        for i, result in enumerate(search_results[:8]):  # Limit to top 8 results
            title = result.get('title', 'No Title')
            content = result.get('content', '')
            url = result.get('url', '')
            
            subreddit = self.extract_subreddit_from_url(url)
            upvotes = self.extract_upvotes_from_content(content)
            
            source = Source(
                title=title,
                url=url,
                subreddit=subreddit,
                upvotes=upvotes,
                content=content[:1000]  # Limit content length
            )
            sources.append(source)
            
            context_parts.append(f"""
Source [{i+1}]: {title}
Subreddit: r/{subreddit}
Content: {content[:500]}...
""")
        
        context = "\n\n".join(context_parts)
        
        # Analyze overall sentiment
        sentiment_texts = [result.get('content', '') for result in search_results[:5]]
        sentiment = await self.analyze_sentiment(sentiment_texts)
        
        # Create system prompt with structured output that explains the sentiment
        system_prompt = f"""
You are a social listening analyst. Analyze the following Reddit discussions about "{query}" and provide comprehensive insights.

Context from Reddit:
{context}

The overall sentiment score for "{query}" is {sentiment.score}/100 ({sentiment.label}) with {sentiment.confidence*100:.0f}% confidence.

You MUST follow this exact structure in your response:

**Sentiment Explanation:** 
Explain why the sentiment score is {sentiment.score}/100 ({sentiment.label}). What specific aspects of "{query}" drive this sentiment? What are the main factors that led to this {sentiment.label.lower()} assessment? (2-3 sentences)

**Direct Answer:** 
Provide a 2-3 sentence summary of the overall sentiment about "{query}" on Reddit based on the discussions analyzed.

**Key Sentiment Drivers:** 
Explain WHY people feel this way. Provide a bulleted list of the main factors driving the sentiment:
- Driver 1 (with citation [X] if referencing a specific source)
- Driver 2 (with citation [X] if referencing a specific source)
- Driver 3 (with citation [X] if referencing a specific source)

**Contradicting Views:** 
What are the minority opinions or dissenting views? What do critics or skeptics say?
- Contradicting point 1 (with citation [X] if referencing a specific source)
- Contradicting point 2 (with citation [X] if referencing a specific source)

Use citations like [1], [2], etc., to reference the sources provided above. Be concise, data-driven, and specific in your analysis.
"""
        
        # Stream the response
        try:
            # Start with sentiment gauge
            yield f"data: {sentiment.model_dump_json()}\n\n"
            
            # Small delay to ensure frontend processes the sentiment
            await asyncio.sleep(0.1)
            
            # Generate streaming response from Gemini
            if not self.gemini_model:
                raise ValueError("Gemini model not initialized. Check GEMINI_API_KEY.")
            
            print(f"Calling Gemini API with prompt length: {len(system_prompt)}")
            try:
                response = self.gemini_model.generate_content(system_prompt, stream=True)
                
                # Check if response is iterable
                if not hasattr(response, '__iter__'):
                    raise ValueError("Gemini response is not iterable")
                
                chunk_count = 0
                for chunk in response:
                    chunk_count += 1
                    # Gemini streaming chunks have different structure
                    if hasattr(chunk, 'text') and chunk.text:
                        # Escape newlines and quotes for proper JSON streaming
                        cleaned_text = chunk.text.replace('"', '\\"').replace('\n', '\\n')
                        yield f'data: "{cleaned_text}"\n\n'
                    elif hasattr(chunk, 'parts') and chunk.parts:
                        # Handle parts if text is in parts
                        for part in chunk.parts:
                            if hasattr(part, 'text') and part.text:
                                cleaned_text = part.text.replace('"', '\\"').replace('\n', '\\n')
                                yield f'data: "{cleaned_text}"\n\n'
                    await asyncio.sleep(0.02)  # Small delay for smooth streaming
                
                print(f"Gemini streaming completed. Processed {chunk_count} chunks.")
                
                if chunk_count == 0:
                    print("Warning: No chunks received from Gemini")
                    yield 'data: "No response generated. Please try again."\n\n'
                
            except Exception as gemini_error:
                print(f"Gemini API error: {gemini_error}")
                print(f"Error type: {type(gemini_error)}")
                import traceback
                traceback.print_exc()
                yield f'data: "Error calling Gemini API: {str(gemini_error)}"\n\n'
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            print(f"Error generating report: {e}")
            import traceback
            traceback.print_exc()
            yield f'data: "Error generating report: {str(e)}"\n\n'
            yield "data: [DONE]\n\n"

# Singleton instance
rag_service = RAGService()