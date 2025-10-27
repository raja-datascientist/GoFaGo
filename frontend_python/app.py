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
        conversation_history = data.get('conversationHistory', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Call LLM with tools (sync) and conversation history
        response = asyncio.run(call_llm_with_tools(user_message, conversation_history))
        
        return jsonify({
            'message': response['message'],
            'products': response.get('products', []),
            'is_clarification': response.get('is_clarification', False)
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

def detect_confirmation_response(message: str) -> bool:
    """Detect if user is confirming a previous correction or suggestion"""
    confirmation_words = [
        'ok', 'okay', 'yes', 'sure', 'go ahead', 'proceed', 'continue',
        'that\'s right', 'correct', 'right', 'yep', 'yeah', 'sounds good',
        'perfect', 'great', 'good', 'fine', 'alright', 'all right'
    ]
    
    message_lower = message.lower().strip()
    return message_lower in confirmation_words or any(word in message_lower for word in confirmation_words)

def detect_and_correct_fashion_typos(text: str) -> str:
    """Detect and suggest corrections for common fashion-related typos"""
    common_typos = {
        'woem': 'women',
        'womrn': 'women', 
        'womens': 'women\'s',
        'mens': 'men\'s',
        'hoodie': 'hoodie',
        'hoody': 'hoodie',
        'hoodies': 'hoodies',
        'sweater': 'sweater',
        'sweaters': 'sweaters',
        'pants': 'pants',
        'pant': 'pants',
        'jeans': 'jeans',
        'jean': 'jeans',
        'shirt': 'shirt',
        'shirts': 'shirts',
        'dress': 'dress',
        'dresses': 'dresses',
        'jacket': 'jacket',
        'jackets': 'jackets',
        'shoes': 'shoes',
        'shoe': 'shoes',
        'sneaker': 'sneakers',
        'sneakers': 'sneakers',
        'boots': 'boots',
        'boot': 'boots',
        'leggings': 'leggings',
        'legging': 'leggings',
        'shorts': 'shorts',
        'short': 'shorts',
        'tank': 'tank top',
        'tanks': 'tank tops',
        'tshirt': 't-shirt',
        'tshirts': 't-shirts',
        't-shirt': 't-shirt',
        't-shirts': 't-shirts'
    }
    
    corrected_text = text.lower()
    corrections_made = []
    
    for typo, correction in common_typos.items():
        if typo in corrected_text:
            corrected_text = corrected_text.replace(typo, correction)
            corrections_made.append(f"'{typo}' → '{correction}'")
    
    return corrected_text, corrections_made

async def call_llm_with_tools(user_message: str, conversation_history: list = None) -> Dict[str, Any]:
    """Call Anthropic Claude with MCP tools"""
    anthropic_client = get_anthropic_client()
    
    try:
        # Check for typos and prepare enhanced message
        corrected_text, corrections_made = detect_and_correct_fashion_typos(user_message)
        
        # If corrections were made, include them in the context
        enhanced_message = user_message
        if corrections_made:
            correction_note = f"Note: I detected some potential typos and will use the corrected terms: {', '.join(corrections_made)}"
            enhanced_message = f"{user_message}\n\n{correction_note}"
        
        # Get available tools
        tools = await mcp_client.get_tools_for_llm()
        
        # Create the system prompt
        system_prompt = """You are Sara, a professional AI fashion assistant and stylist. Your role is to:
1. Provide personalized fashion advice and feedback to customers
2. Filter and recommend products based on their specific needs
3. Combine fashion expertise with practical product recommendations

CRITICAL TEXT FORMATTING RULES:
- NEVER use markdown formatting like **bold**, *italic*, or __underline__
- NEVER use asterisks (*), hashes (#), underscores (_), or other special formatting characters
- NEVER use emojis or smileys
- Write in plain, professional text that is easy to read
- Use simple line breaks for clarity
- Format lists with simple bullet points (dashes) or numbered lists
- Keep responses clean, professional, and user-friendly without special characters

CRITICAL RECOMMENDATION RULES:
- When providing fashion recommendations, ALWAYS give a brief explanation (1-2 sentences) of WHY this style, color, or choice works for the user
- Before showing products, explain why these specific items suit them
- This applies to ALL fashion advice and recommendations

CRITICAL WORKFLOW for follow-up questions:
Step 1: Analyze the user's question in the context of conversation history
Step 2: Provide fashion advice/feedback explaining your recommendation  
Step 3: Use filter_products tool with appropriate criteria to find matching products
Step 4: Return BOTH your advice text AND the filtered products

Example for "I'm dark skinned, which tops are better for me?":
- Step 1: Understand they want tops suitable for dark skin
- Step 2: Give advice: "For dark skin tones, colors like deep jewel tones such as burgundy and emerald, rich blacks, navy blues, and warm earth tones work beautifully. These colors complement your skin tone and create a sophisticated look. Here are some tops in these colors for you."
- Step 3: Use filter_products with colors=['black', 'navy', 'burgundy', 'emerald']
- Step 4: Return the advice + filtered products

IMPORTANT: When user asks follow-up questions about existing results:
- DO NOT start a completely new search
- DO provide fashion advice/feedback first
- DO then filter products based on the advice
- Combine your advice text with the filter_products tool call
- The advice should explain WHY you're filtering certain colors/styles

Here's how to handle different situations:

1. **Typo Detection & Correction:**
   - If someone types "woem" instead of "women", "wmne" instead of "women", etc., gently correct them
   - ALWAYS ask for confirmation before proceeding with the search
   - Example: "I think you meant 'women' - did you want me to search for women's tops under $50?"
   - Wait for user confirmation before using the filter_products tool
   - Don't immediately search - ask first, then search after confirmation

2. **Conversation Flow:**
   - When you provide a correction and the user responds with "ok", "yes", "sure", "go ahead", etc., proceed with the corrected search
   - Don't restart the conversation - continue with the search using the corrected terms
   - Maintain context throughout the conversation
   - If the user confirms a correction, immediately use the filter_products tool with the corrected terms
   - IMPORTANT: After user confirms with "yes", "ok", etc., you MUST call the filter_products tool - don't just say you'll search, actually do it!

3. **Unclear Requests:**
   - If a request is vague or unclear, ask clarifying questions
   - Examples of unclear requests: "I need clothes", "Show me something nice", "What should I wear?"
   - Ask specific questions like:
     * "What type of clothing are you looking for? (tops, pants, dresses, etc.)"
     * "What's the occasion? (work, casual, workout, etc.)"
     * "What's your budget range?"
     * "Any specific colors or styles you prefer?"

4. **Product Search:**
   - Use the filter_products tool to search for products based on their request
   - Be flexible with search terms to find products even with minor variations
   - Present results in a helpful, friendly way

5. **Follow-up Questions & Filtering:**
   - When user asks follow-up questions like "which one is better for dark skin", "show me cheaper options", "any red ones?"
   - These are requests to FILTER or REFINE existing search results
   - You MUST use the filter_products tool with the new criteria to show filtered results
   - DO NOT just provide text advice - ALWAYS filter and show the actual products
   - CRITICAL: ALWAYS provide a brief explanation BEFORE showing products explaining WHY these items work for the user
   - Examples:
     * "I'm dark skinned, which one is better?" → First explain why certain colors work for dark skin, then use filter_products with those colors
     * "Show me cheaper ones" → Use filter_products with lower price range
     * "Any red options?" → Use filter_products with color='red'
   - IMPORTANT: Always return filtered products, not just advice text

6. **Recommendations:**
   - If they click on a product, use get_similar_products to show recommendations
   - Suggest complementary items that would pair well

7. **Fashion Advice:**
   - Provide styling tips and suggestions
   - Explain why certain items work well together
   - CRITICAL: When providing fashion recommendations, always give a brief explanation (1-2 sentences) of why this style, color, or choice suits the user
   - Consider factors like color coordination, style matching, and occasion appropriateness

CONVERSATION EXAMPLES:
- User: "wmne tops less than 50$" → You: "I think you meant 'women' - did you want me to search for women's tops under $50?" → User: "ok" → You: [proceed with search using filter_products tool]
- User: "I need clothes" → You: "I'd love to help! What type of clothing are you looking for?" → User: "tops" → You: [search for tops]
- User: "hoodie under 30" → You: "I'd be happy to help you find hoodies under $30! Are you looking for men's or women's hoodies?" → User: "women" → You: [search for women's hoodies under $30]
- User: "women tops" → You: [shows results] → User: "I'm dark skinned, which one is better?" → You: [Use filter_products to show darker colors like black, navy, burgundy that work well for dark skin - return actual filtered products]
- User: "hoodies" → You: [shows results] → User: "show me cheaper ones" → You: [Use filter_products with lower max_price and return filtered products]

IMPORTANT CONVERSATION RULES:
- Be conversational and friendly, not robotic
- Ask questions to clarify before searching
- For typos: Ask "Did you mean...?" and wait for confirmation
- For unclear requests: Ask specific questions to understand their needs
- Only use tools AFTER getting confirmation or clear understanding
- Make the conversation feel natural and helpful
- CRITICAL: When user confirms with "yes", "ok", etc., you MUST immediately call the appropriate tool (filter_products or get_similar_products)
- Don't just say you'll search - actually call the tool!
- CRITICAL: For follow-up questions about existing results (e.g., "which one for dark skin", "cheaper ones"), ALWAYS use filter_products to show filtered products, NEVER just give text advice
- IMPORTANT: When calling filter_products, DO NOT say "Let me search for you" or "I'll find those". Instead, call the tool directly and your message should say "Here are the [items] perfect for you:" or similar user-friendly result messaging

Always be encouraging, helpful, and focus on helping the customer find exactly what they're looking for. If you're unsure about their request, ask questions to better understand their needs."""

        print(f"Calling Claude with {len(tools)} tools")
        print(f"Tools: {[tool['name'] for tool in tools]}")
        
        # Build conversation messages
        messages = []
        
        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history[-20:]:  # Keep last 20 messages for context
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": enhanced_message
        })
        
        # Call Claude with tool calling
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4000,
            system=system_prompt,
            messages=messages,
            tools=tools
        )
        
        # Process the response
        print(f"Claude response: {response}")
        print(f"Response content: {response.content}")
        print(f"Number of content blocks: {len(response.content)}")
        
        if response.content:
            # Check if there are multiple content blocks
            tool_use_found = False
            text_response = ""
            
            for i, message_content in enumerate(response.content):
                print(f"Content block {i}: {message_content}")
                print(f"Content type: {type(message_content)}")
                
                if hasattr(message_content, 'type') and message_content.type == 'tool_use':
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
                            # Check if there was text response before the tool use
                            advice_text = ""
                            # Look for text content before the tool use
                            for j in range(i-1, -1, -1):
                                if hasattr(response.content[j], 'text'):
                                    advice_text = response.content[j].text
                                    break
                            
                            # If no advice text, use default message
                            if not advice_text:
                                advice_text = f"I found {product_count} products that match your request! Here are some great options:"
                            
                            return {
                                'message': advice_text,
                                'products': tool_result.get("products", [])
                            }
                        else:
                            # No results found - provide helpful suggestions
                            backend_message = tool_result.get("message", "")
                            if backend_message:
                                return {
                                    'message': backend_message,
                                    'products': []
                                }
                            else:
                                # Provide helpful suggestions when no results
                                return {
                                    'message': "I couldn't find any products matching your search. Let me help you refine your search! Could you tell me:\n\n• What type of clothing you're looking for? (tops, pants, dresses, etc.)\n• What's your budget range?\n• Any specific colors or styles you prefer?\n• What's the occasion? (work, casual, workout, etc.)\n\nI'm here to help you find exactly what you need!",
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
                
                elif hasattr(message_content, 'text'):
                    text_response += message_content.text + " "
            
            # If we get here, it was a text-only response
            if text_response.strip():
                print(f"Text-only response: {text_response}")
                
                # Check if this looks like a clarification question or typo correction
                clarification_indicators = [
                    "did you mean", "do you mean", "i think you meant", 
                    "what type of", "what's your", "could you tell me",
                    "what are you looking for", "what occasion", "what budget",
                    "did you want me to", "would you like me to", "should i search",
                    "are you looking for", "what's your budget", "what occasion"
                ]
                
                is_clarification = any(indicator in text_response.lower() for indicator in clarification_indicators)
                
                return {
                    'message': text_response.strip(),
                    'products': [],
                    'is_clarification': is_clarification
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