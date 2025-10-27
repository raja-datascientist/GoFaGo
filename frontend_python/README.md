# AI Fashion Assistant - Python Frontend

A Python-based frontend for the Nike Fashion Assistant using Streamlit, Anthropic Claude, and MCP Tools.

## Features

- 🤖 **AI-Powered Chat**: Uses Anthropic Claude for natural language understanding
- 🛠️ **MCP Tool Integration**: Connects to MCP server for product filtering and recommendations
- 🎨 **Modern UI**: Clean, responsive interface built with Streamlit
- 🔍 **Smart Search**: Intelligent product search with category, color, size filtering
- 💡 **Recommendations**: AI-powered product recommendations based on selected items

## Architecture

```
Frontend (Python/Streamlit) 
    ↓ Tool Calling
Anthropic Claude
    ↓ MCP Protocol
Backend (FastAPI + MCP Server)
    ↓ Data Access
Nike CSV Data
```

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**:
   ```bash
   export ANTHROPIC_API_KEY="your_anthropic_api_key_here"
   export MCP_SERVER_URL="http://localhost:8000/mcp"
   ```

   Or create a `.env` file:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   MCP_SERVER_URL=http://localhost:8000/mcp
   ```

3. **Start the Backend Server**:
   ```bash
   cd ../backend
   source venv/bin/activate
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Start the Frontend**:
   ```bash
   python run.py
   ```

   Or directly with Streamlit:
   ```bash
   streamlit run app.py --server.port 8501
   ```

## Usage

1. **Open your browser** to `http://localhost:8501`
2. **Chat with Sara** in the sidebar - ask about products like:
   - "Show me women's hoodies"
   - "I want black Nike shoes"
   - "Find me some pants in size M"
3. **Browse products** in the main area
4. **Click on products** to see details and get recommendations
5. **Get recommendations** for similar/matching items

## How It Works

1. **User Input**: User types a message in the chat
2. **LLM Processing**: Anthropic Claude analyzes the message and determines which MCP tool to call
3. **Tool Execution**: The appropriate MCP tool is called on the backend server
4. **Data Retrieval**: Backend filters Nike products from CSV data
5. **Response**: Results are displayed in the UI with product cards and details

## MCP Tools

- **filter_products**: Search and filter Nike products by category, color, size, etc.
- **get_similar_products**: Get AI-powered recommendations for matching items

## Requirements

- Python 3.8+
- Anthropic API key
- Backend server running on port 8000
- Internet connection for Anthropic API calls

## Troubleshooting

- **"ANTHROPIC_API_KEY not set"**: Set your Anthropic API key in environment variables
- **"Connection refused"**: Make sure the backend server is running on port 8000
- **"No products found"**: Check if the CSV file exists in the backend/data directory
