# Nike Fashion Assistant

A complete AI-powered fashion assistant built with **Model Context Protocol (MCP)**, **Anthropic Claude**, and **Python Streamlit**.

## 🏗️ Architecture

```
Python Frontend (Streamlit)
    ↓ MCP Protocol (STDIO)
MCP Server (Python)
    ↓ Data Access
Nike CSV Database
```

## ✨ Features

- 🤖 **AI-Powered Chat**: Uses Anthropic Claude for natural language understanding
- 🛠️ **MCP Tool Integration**: Proper MCP server with tool calling
- 🎨 **Modern UI**: Clean, responsive interface built with Streamlit
- 🔍 **Smart Search**: Intelligent product search with category, color, size filtering
- 💡 **Recommendations**: AI-powered product recommendations based on selected items
- 📊 **Real-time Data**: Live product data from Nike CSV

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Anthropic API key
- Nike CSV data file

### 1. Setup Environment

```bash
# Clone and navigate to project
cd GoFaGo2

# Set up backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up frontend
cd ../frontend_python
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="your_anthropic_api_key_here"

# Optional: Set custom paths
export NIKE_CSV_PATH="./data/nike.csv"
```

### 3. Start the Application

```bash
# From project root
python start_frontend.py
```

The app will be available at `http://localhost:8501`

## 🧪 Testing

Test the MCP server independently:

```bash
python test_mcp.py
```

## 📁 Project Structure

```
GoFaGo2/
├── backend/
│   ├── app.py              # MCP Server (FastMCP)
│   ├── requirements.txt    # Backend dependencies
│   └── data/
│       └── nike.csv        # Product data
├── frontend_python/
│   ├── app.py              # Streamlit frontend
│   ├── mcp_client.py       # MCP client
│   ├── config.py           # Configuration
│   └── requirements.txt    # Frontend dependencies
├── test_mcp.py             # MCP server test
├── start_frontend.py       # Startup script
└── README.md
```

## 🛠️ MCP Tools

The MCP server exposes two tools:

### `filter_products`
Search and filter Nike products by various criteria.

**Parameters:**
- `category` (string): Product category (hoodie, sweatshirt, pants, shoes, dress)
- `color` (string): Product color (black, white, blue, red, pink, etc.)
- `size` (string): Product size (S, M, L, XL, etc.)
- `search_term` (string): Search term to match in descriptions
- `limit` (integer): Maximum number of results (default: 20)

### `get_similar_products`
Get AI-powered product recommendations.

**Parameters:**
- `product_description` (string): Description of current product
- `current_product` (string): JSON string of current product object

## 🔧 How It Works

1. **User Input**: User types a message in the Streamlit chat
2. **LLM Processing**: Anthropic Claude analyzes the message and determines which MCP tool to call
3. **MCP Tool Execution**: The appropriate MCP tool is called on the backend server
4. **Data Retrieval**: Backend filters Nike products from CSV data using pandas
5. **Response**: Results are displayed in the UI with product cards and details

## 🎯 Usage Examples

- "Show me women's hoodies"
- "I want black Nike shoes in size 10"
- "Find me some pants for men"
- "What goes well with this blue sweatshirt?"

## 🔍 Troubleshooting

### MCP Server Issues
- Check that `backend/app.py` runs without errors
- Verify CSV file exists at `backend/data/nike.csv`
- Check logs for MCP protocol errors

### Frontend Issues
- Ensure `ANTHROPIC_API_KEY` is set
- Check that MCP server is accessible
- Verify all Python dependencies are installed

### Connection Issues
- Make sure backend and frontend are in correct directories
- Check that MCP client can connect to server
- Verify Anthropic API key is valid

## 📚 Dependencies

### Backend
- `mcp` - Model Context Protocol
- `pandas` - Data manipulation
- `fastapi` - Web framework (for MCP)

### Frontend
- `streamlit` - Web UI framework
- `anthropic` - Claude AI client
- `mcp` - MCP client library

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP framework
- [Anthropic](https://www.anthropic.com/) for Claude AI
- [Streamlit](https://streamlit.io/) for the web framework
- Nike for the product data (for demonstration purposes)