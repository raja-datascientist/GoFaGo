from flask import Flask, render_template, request, jsonify
import asyncio
import json
from typing import Dict, List, Any
import anthropic
from mcp_client import mcp_client
from config import ANTHROPIC_API_KEY
import os

# Create Flask app
app = Flask(__name__)

# Initialize Anthropic client
def get_anthropic_client():
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages and return AI response with products"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Call LLM with tools (sync)
        response = asyncio.run(call_llm_with_tools(user_message))
        
        return jsonify({
            'message': response['message'],
            'products': response.get('products', [])
        })
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/recommendations', methods=['POST'])
def get_recommendations():
    """Get product recommendations"""
    try:
        data = request.get_json()
        product = data.get('product', {})
        search_context = data.get('searchContext', {})
        
        if not product:
            return jsonify({'error': 'No product provided'}), 400
        
        # Get recommendations using MCP client (sync) with search context
        recommendations = asyncio.run(get_similar_products(product, search_context))
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        print(f"Error in recommendations endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

async def call_llm_with_tools(user_message: str) -> Dict[str, Any]:
    """Call Anthropic Claude with MCP tools"""
    anthropic_client = get_anthropic_client()
    
    try:
        # Get available tools
        tools = await mcp_client.get_tools_for_llm()
        
        # Create the system prompt
        system_prompt = """You are Sara, an AI fashion assistant. You have access to tools to search for products and get recommendations.

When a user asks about products:
1. Use the filter_products tool to search for products based on their request
2. Be smart about spelling - if someone types "womrn hoodie" or "women hoodie", understand they mean "women hoodie"
3. Use flexible search terms that will find products even with minor spelling variations
4. Present the results in a helpful, friendly way
5. If they click on a product, use get_similar_products to show recommendations

Always be helpful and suggest specific products based on what the user is looking for. Handle spelling mistakes gracefully by using the correct spelling in your search."""

        print(f"Calling Claude with {len(tools)} tools")
        print(f"Tools: {[tool['name'] for tool in tools]}")
        
        # Call Claude with tool calling
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            tools=tools
        )
        
        # Process the response
        print(f"Claude response: {response}")
        print(f"Response content: {response.content}")
        
        if response.content:
            message_content = response.content[0]
            print(f"Message content: {message_content}")
            print(f"Content type: {type(message_content)}")
            
            if hasattr(message_content, 'text'):
                # Simple text response
                return {
                    'message': message_content.text,
                    'products': []
                }
            elif hasattr(message_content, 'type') and message_content.type == 'tool_use':
                # Tool calling response
                tool_name = message_content.name
                tool_input = message_content.input
                
                print(f"Tool use detected: {tool_name}")
                print(f"Tool input: {tool_input}")
                
                # Call the MCP tool
                tool_result = await mcp_client.call_tool(tool_name, tool_input)
                
                print(f"Tool result: {tool_result}")
                
                # Return response based on tool
                if tool_name == "filter_products" and tool_result.get("success"):
                    product_count = len(tool_result.get("products", []))
                    if product_count > 0:
                        return {
                            'message': f"I found {product_count} products that match your request! Here are some great options:",
                            'products': tool_result.get("products", [])
                        }
                    else:
                        # Use the backend's no results message
                        backend_message = tool_result.get("message", "I couldn't find any products matching your search. Would you like me to search for a different product or style instead?")
                        return {
                            'message': backend_message,
                            'products': []
                        }
                elif tool_name == "get_similar_products":
                    rec_count = len(tool_result.get("recommendations", []))
                    return {
                        'message': f"I found {rec_count} similar products for you!",
                        'products': []
                    }
                else:
                    return {
                        'message': f"I used the {tool_name} tool to help with your request.",
                        'products': []
                    }
        
        print("No valid content in response")
        return {
            'message': "I'm sorry, I couldn't process your request right now.",
            'products': []
        }
        
    except Exception as e:
        print(f"Error calling LLM: {e}")
        import traceback
        traceback.print_exc()
        return {
            'message': "I'm sorry, I'm having trouble processing your request right now.",
            'products': []
        }

async def get_similar_products(product: Dict[str, Any], search_context: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """Get recommendations for a product using AI analysis and search context"""
    try:
        # Use Claude to analyze the product and determine appropriate filters for recommendations
        anthropic_client = get_anthropic_client()
        
        # Extract price constraints from search context
        price_constraints = ""
        if search_context and search_context.get('filtersApplied'):
            filters = search_context['filtersApplied']
            if filters.get('max_price'):
                price_constraints = f"Keep recommendations under ${filters['max_price']} to match the user's budget."
            elif filters.get('min_price'):
                price_constraints = f"Keep recommendations above ${filters['min_price']} to match the user's price range."
        
        # Create a prompt for Claude to analyze the product and suggest filters
        analysis_prompt = f"""You are a fashion expert analyzing this product to recommend complementary items:

Product Details:
- Name: {product.get('name', 'N/A')}
- Description: {product.get('description', 'N/A')}
- Detailed Description: {product.get('detailed_description', 'N/A')}
- Colors: {product.get('colors', 'N/A')}
- Gender: {product.get('gender', 'N/A')}
- Price: {product.get('price', 'N/A')}

Original Search Context:
- User Query: {search_context.get('userMessage', 'N/A') if search_context else 'N/A'}
- Applied Filters: {search_context.get('filtersApplied', {}) if search_context else {}}

IMPORTANT: {price_constraints}

Based on this product and the user's original search, determine what complementary items would pair well with it. Consider:
1. What type of item this is (top, bottom, dress, etc.)
2. What would complement it (if it's a top, suggest bottoms; if it's bottoms, suggest tops)
3. Color coordination (neutral colors that would work well)
4. Style matching (casual, athletic, etc.)
5. Price range (MUST respect the user's original price constraints)
6. Gender consistency (match the user's original search)

Return your analysis as a JSON object with these fields:
{{
    "item_type": "top|bottom|dress|accessory",
    "complementary_category": "hoodie|pants|shirt|jacket|etc",
    "suggested_colors": ["black", "white", "gray", "etc"],
    "gender_match": "men|women|unisex",
    "price_range": "budget|mid|premium",
    "reasoning": "Brief explanation of why these items would pair well"
}}

Focus on practical, stylish combinations that customers would actually want to buy together, while respecting their original price constraints."""

        # Get Claude's analysis
        analysis_response = anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1000,
            messages=[{"role": "user", "content": analysis_prompt}]
        )
        
        # Parse Claude's response
        analysis_text = analysis_response.content[0].text
        print(f"Claude's product analysis: {analysis_text}")
        
        # Extract JSON from Claude's response
        try:
            # Find JSON in the response
            import re
            json_match = re.search(r'\{.*\}', analysis_text, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                # Fallback analysis if JSON parsing fails
                analysis = {
                    "item_type": "top",
                    "complementary_category": "pants",
                    "suggested_colors": ["black", "white"],
                    "gender_match": product.get('gender', 'women').lower(),
                    "price_range": "mid",
                    "reasoning": "Complementary items for styling"
                }
        except:
            # Fallback analysis
            analysis = {
                "item_type": "top",
                "complementary_category": "pants", 
                "suggested_colors": ["black", "white"],
                "gender_match": product.get('gender', 'women').lower(),
                "price_range": "mid",
                "reasoning": "Complementary items for styling"
            }
        
        print(f"Parsed analysis: {analysis}")
        
        # Convert analysis to MCP tool parameters
        filters = {
            "product_description": product.get("description", ""),
            "current_product": json.dumps(product),
            "gender": analysis.get("gender_match"),
            "category": analysis.get("complementary_category"),
            "limit": 4
        }
        
        # Add color filter if suggested
        suggested_colors = analysis.get("suggested_colors", [])
        if suggested_colors:
            filters["color"] = suggested_colors[0]  # Use first suggested color
        
        # Add price constraints from search context (priority over analysis)
        if search_context and search_context.get('filtersApplied'):
            search_filters = search_context['filtersApplied']
            if search_filters.get('max_price'):
                filters["max_price"] = search_filters['max_price']
                print(f"Applied search context max_price: ${search_filters['max_price']}")
            if search_filters.get('min_price'):
                filters["min_price"] = search_filters['min_price']
                print(f"Applied search context min_price: ${search_filters['min_price']}")
        else:
            # Fallback to analysis-based price range if no search context
            price_range = analysis.get("price_range", "mid")
            if price_range == "budget":
                filters["max_price"] = 50.0
            elif price_range == "premium":
                filters["min_price"] = 100.0
        
        print(f"Calling MCP tool with filters: {filters}")
        
        # Call the MCP tool with intelligent filters
        result = await mcp_client.call_tool("get_similar_products", filters)
        
        if result.get("success"):
            recommendations = result.get("recommendations", [])
            print(f"Found {len(recommendations)} recommendations")
            return recommendations
        return []
        
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8503)