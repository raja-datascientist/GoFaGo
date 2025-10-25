# Nike Fashion Chatbot POC

A working proof-of-concept for a fashion chatbot that fetches Nike products from CSV data and provides intelligent recommendations.

## Features

- **Chat Interface**: Natural language product search
- **Product Filtering**: Filter by category, color, size, and search terms
- **Product Details**: Detailed view with images, descriptions, and specifications
- **Smart Recommendations**: AI-powered similar product suggestions
- **MCP Integration**: Model Context Protocol for structured data access

## Architecture

### Backend (Python FastAPI)
- **CSV Data Source**: Reads from `backend/data/nike.csv`
- **MCP Tools**: 
  - `/mcp/filter_products` - Filter products by criteria
  - `/mcp/get_similar_products` - Get recommendations
- **Chat API**: `/chat` - Process natural language queries

### Frontend (Next.js + TypeScript)
- **Three-Section Layout**:
  1. Chat interface (30% width)
  2. Search results grid (70% → 30% when product selected)
  3. Product details + recommendations (40% width, appears on click)

## Quick Start

### 1. Backend Setup
```bash
cd backend
source venv/bin/activate  # or create new venv
pip install -r requirements.txt
uvicorn app:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Test the API
```bash
cd backend
python test_api.py
```

## Usage Examples

### Chat Queries
- "I want to buy a Nike hoodie"
- "Show me black Nike shoes"
- "Find me Nike sweatpants in size M"
- "I need a red dress"

### MCP Tool Usage

#### Filter Products
```bash
curl -X POST "http://localhost:8000/mcp/filter_products" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "hoodie",
    "color": "black",
    "size": "M"
  }'
```

#### Get Recommendations
```bash
curl -X POST "http://localhost:8000/mcp/get_similar_products" \
  -H "Content-Type: application/json" \
  -d '{
    "product_description": "Nike hoodie for women",
    "current_product": {
      "name": "Nike Sportswear Phoenix Fleece",
      "description": "Women'\''s Oversized Crew-Neck Sweatshirt"
    }
  }'
```

## Data Structure

The CSV contains Nike products with columns:
- `Category` - Product category/name
- `Image Url` - Product image
- `Product page url` - Nike product page
- `Product Description` - Short description
- `Current Price` - Current price
- `Original Price` - Original price (if on sale)
- `Sizes` - Available sizes
- `Colors` - Available colors
- `Detailed description` - Full product description

## API Endpoints

### Chat
- **POST** `/chat` - Process natural language queries
- **Body**: `{"message": "your query"}`
- **Response**: `{"success": true, "bot_message": "...", "products": [...], "has_products": true}`

### MCP Tools
- **POST** `/mcp/filter_products` - Filter products
- **POST** `/mcp/get_similar_products` - Get recommendations

### Health Check
- **GET** `/` - API status and product count

## Frontend Features

### Chat Interface
- Real-time messaging with Sara (AI assistant)
- Natural language processing for product queries
- Error handling and connection status

### Search Results
- Grid layout with product cards
- Product images, names, prices, and descriptions
- Click to view details
- Empty state when no products found

### Product Details
- Large product image
- Detailed product information
- Price comparison (original vs current)
- Available colors and sizes
- Direct link to Nike product page

### Recommendations
- AI-powered similar product suggestions
- Grid layout with recommended items
- Click to view or buy recommended products

## Technical Details

### Backend Dependencies
- `fastapi` - Web framework
- `pandas` - CSV data processing
- `pydantic` - Data validation
- `uvicorn` - ASGI server

### Frontend Dependencies
- `next.js` - React framework
- `typescript` - Type safety
- `tailwindcss` - Styling

### Data Processing
- CSV loading and filtering
- Keyword extraction from user queries
- Similarity matching for recommendations
- JSON response formatting

## Next Steps for Production

1. **Database Migration**: Replace CSV with PostgreSQL
2. **Authentication**: Add user accounts and sessions
3. **Payment Integration**: Add checkout functionality
4. **Inventory Management**: Real-time stock tracking
5. **Advanced AI**: Integrate with OpenAI/Anthropic for better recommendations
6. **Caching**: Add Redis for performance
7. **Monitoring**: Add logging and analytics
8. **Security**: Add rate limiting and input validation

## Troubleshooting

### Backend Issues
- Ensure CSV file exists at `backend/data/nike.csv`
- Check Python dependencies are installed
- Verify port 8000 is available

### Frontend Issues
- Ensure backend is running on port 8000
- Check CORS settings if running on different ports
- Verify all dependencies are installed

### Data Issues
- Check CSV file format and encoding
- Verify column names match the code
- Ensure CSV has data in all required columns
