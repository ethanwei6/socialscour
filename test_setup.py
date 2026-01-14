#!/usr/bin/env python3
"""
Test script to validate SocialScour setup and functionality
"""

import os
import sys
import json
import time
import requests
from typing import Dict, Any

def test_environment():
    """Test if environment variables are set"""
    print("🔍 Testing environment variables...")
    
    required_vars = ['TAVILY_API_KEY', 'GEMINI_API_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set these variables in your .env file")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

def test_backend_health():
    """Test if backend is running and healthy"""
    print("\n🏥 Testing backend health...")
    
    try:
        response = requests.get('http://localhost:8000/health', timeout=5)
        if response.status_code == 200:
            print("✅ Backend is healthy and responding")
            return True
        else:
            print(f"❌ Backend returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend at http://localhost:8000")
        print("Please make sure the backend server is running")
        return False
    except Exception as e:
        print(f"❌ Error testing backend: {e}")
        return False

def test_chat_creation():
    """Test creating a new chat"""
    print("\n💬 Testing chat creation...")
    
    try:
        # Create a new chat
        response = requests.post(
            'http://localhost:8000/api/chats',
            data={'query': 'Test Query'},
            timeout=10
        )
        
        if response.status_code == 200:
            chat_data = response.json()
            print(f"✅ Chat created successfully: {chat_data['id']}")
            print(f"   Title: {chat_data['title']}")
            return chat_data['id']
        else:
            print(f"❌ Failed to create chat: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating chat: {e}")
        return None

def test_research_streaming(chat_id: str):
    """Test research streaming functionality"""
    print(f"\n🔄 Testing research streaming for chat {chat_id}...")
    
    try:
        response = requests.post(
            f'http://localhost:8000/api/research/{chat_id}/stream',
            json={
                'query': 'iPhone 16 sentiment',
                'subreddit_filter': 'technology'
            },
            stream=True,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ Research request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        print("✅ Research request accepted, streaming response...")
        
        # Collect streaming response
        content_received = False
        sentiment_received = False
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data = line_str[6:]
                    
                    if data == '[DONE]':
                        print("   ✅ Stream completed")
                        break
                    
                    # Try to parse as JSON (sentiment data)
                    try:
                        json_data = json.loads(data)
                        if 'score' in json_data and 'label' in json_data:
                            print(f"   ✅ Sentiment received: {json_data['label']} ({json_data['score']}%)")
                            sentiment_received = True
                            continue
                    except:
                        pass
                    
                    # Regular text content
                    if len(data) > 10:  # Only show meaningful content
                        content_received = True
        
        if content_received:
            print("   ✅ Content received successfully")
        if sentiment_received:
            print("   ✅ Sentiment analysis completed")
            
        return True
        
    except Exception as e:
        print(f"❌ Error during research streaming: {e}")
        return False

def test_chat_retrieval():
    """Test retrieving chat history"""
    print("\n📋 Testing chat retrieval...")
    
    try:
        response = requests.get('http://localhost:8000/api/chats', timeout=10)
        
        if response.status_code == 200:
            chats = response.json()
            print(f"✅ Retrieved {len(chats)} chat(s)")
            
            if chats:
                latest_chat = chats[0]
                print(f"   Latest chat: {latest_chat['title']}")
                print(f"   Messages: {len(latest_chat['messages'])}")
                print(f"   Sources: {len(latest_chat['sources'])}")
            
            return True
        else:
            print(f"❌ Failed to retrieve chats: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error retrieving chats: {e}")
        return False

def test_external_apis():
    """Test external API connectivity"""
    print("\n🌐 Testing external API connectivity...")
    
    # Test Tavily API
    try:
        import tavily
        client = tavily.TavilyClient(api_key=os.getenv('TAVILY_API_KEY'))
        
        # Quick test search
        response = client.search(
            query="test reddit",
            include_domains=["reddit.com"],
            max_results=1
        )
        
        if 'results' in response:
            print("✅ Tavily API is accessible and working")
        else:
            print("❌ Tavily API response format unexpected")
            
    except Exception as e:
        print(f"❌ Tavily API error: {e}")
    
    # Test Gemini API
    try:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        
        # Quick test generation
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Hello, this is a test.")
        
        if response.text:
            print("✅ Gemini API is accessible and working")
        else:
            print("❌ Gemini API response format unexpected")
            
    except Exception as e:
        print(f"❌ Gemini API error: {e}")

def main():
    """Run all tests"""
    print("🚀 SocialScour Test Suite")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 5
    
    # Run tests
    if test_environment():
        tests_passed += 1
    
    if test_backend_health():
        tests_passed += 1
    
    chat_id = test_chat_creation()
    if chat_id:
        tests_passed += 1
    
    if chat_id and test_research_streaming(chat_id):
        tests_passed += 1
    
    if test_chat_retrieval():
        tests_passed += 1
    
    # Test external APIs (not counted in main test count)
    test_external_apis()
    
    # Summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! SocialScour is ready to use.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())