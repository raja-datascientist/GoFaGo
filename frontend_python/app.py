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
        
        if not product:
            return jsonify({'error': 'No product provided'}), 400
        
        # Get recommendations using MCP client (sync)
        recommendations = asyncio.run(get_similar_products(product))
        
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

async def get_similar_products(product: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get recommendations for a product"""
    try:
        result = await mcp_client.call_tool("get_similar_products", {
            "product_description": product.get("description", ""),
            "current_product": json.dumps(product)
        })
        
        if result.get("success"):
            return result.get("recommendations", [])
        return []
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        return []

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8503)