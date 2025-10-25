
from typing import Any
import pandas as pd
import json
import os
import logging
from mcp.server.fastmcp import FastMCP

# Set up logging to stderr (required for MCP STDIO servers)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CSV file path
CSV_PATH = os.getenv("NIKE_CSV_PATH", "./data/nike.csv")

# Load CSV data
try:
    df = pd.read_csv(CSV_PATH)
    logger.info(f"Loaded {len(df)} products from {CSV_PATH}")
except Exception as e:
    logger.error(f"Error loading CSV: {e}")
    df = pd.DataFrame()

# Initialize MCP server
mcp = FastMCP("Nike Fashion Assistant")

# MCP Tools
@mcp.tool()
async def filter_products(
    gender: str = None,
    category: str = None,
    color: str = None,
    size: str = None,
    search_term: str = None,
    limit: int = 20
) -> str:
    """Filter products based on gender, category, color, size, and search terms.
    
    EXTRACT THESE ENTITIES from user queries:
    - gender: 'men', 'women', 'male', 'female' (matches 'Men's' or 'Women's' in product descriptions)
    - category: 'hoodie', 'pants', 'shirt', 'sweatshirt', 'jacket', 'top'
    - color: 'black', 'white', 'blue', 'red', 'pink', 'brown', 'gray'
    - size: 'S', 'M', 'L', 'XL', 'small', 'medium', 'large'
    
    Examples:
    - "men hoodie" → gender='men', category='hoodie'
    - "women black pants" → gender='women', category='pants', color='black'
    - "blue shirt" → category='shirt', color='blue'
    - "hoodie" → category='hoodie' (finds all hoodies)
    
    Args:
        gender: Product gender - 'men', 'women', 'male', 'female'
        category: Product category - 'hoodie', 'pants', 'shirt', 'sweatshirt', 'jacket', 'top'
        color: Product color - 'black', 'white', 'blue', 'red', 'pink', 'brown', 'gray'
        size: Product size - 'S', 'M', 'L', 'XL', 'small', 'medium', 'large'
        search_term: Fallback search term for complex queries
        limit: Maximum number of products to return (default: 20)
    
    Returns:
        JSON string containing filtered products
    """
    try:
        if df.empty:
            return json.dumps({"success": False, "error": "No products available", "products": []})
        
        filtered_df = df.copy()
        logger.info(f"Starting filter with {len(filtered_df)} products")
        logger.info(f"Filters - gender: {gender}, category: {category}, color: {color}, size: {size}, search_term: {search_term}")
        
        # Apply gender filter first (most important for strict matching)
        if gender and len(filtered_df) > 0:
            gender_lower = gender.lower()
            if gender_lower in ['men', 'male']:
                # Use exact gender matching
                gender_mask = filtered_df['Gender'] == 'Men'
                logger.info(f"Gender filter 'men': {gender_mask.sum()} matches")
                filtered_df = filtered_df[gender_mask]
            elif gender_lower in ['women', 'female']:
                # Use exact gender matching
                gender_mask = filtered_df['Gender'] == 'Women'
                logger.info(f"Gender filter 'women': {gender_mask.sum()} matches")
                filtered_df = filtered_df[gender_mask]
        
        # Apply category filter
        if category and len(filtered_df) > 0:
            category_lower = category.lower()
            # Map common category terms to search patterns
            category_patterns = {
                'hoodie': 'hoodie|sweatshirt',
                'pants': 'pants|trousers|sweatpants',
                'shirt': 'shirt|top|blouse',
                'sweatshirt': 'sweatshirt|hoodie',
                'jacket': 'jacket|coat|blazer',
                'top': 'top|shirt|blouse'
            }
            
            search_pattern = category_patterns.get(category_lower, category_lower)
            category_mask = filtered_df['Category.1'].str.contains(search_pattern, case=False, na=False)
            logger.info(f"Category filter '{category}': {category_mask.sum()} matches")
            filtered_df = filtered_df[category_mask]
        
        # Apply color filter
        if color and len(filtered_df) > 0:
            color_mask = filtered_df['Colors'].str.contains(color, case=False, na=False)
            logger.info(f"Color filter '{color}': {color_mask.sum()} matches")
            filtered_df = filtered_df[color_mask]
        
        # Apply size filter
        if size and len(filtered_df) > 0:
            size_mask = filtered_df['Sizes'].str.contains(size, case=False, na=False)
            logger.info(f"Size filter '{size}': {size_mask.sum()} matches")
            filtered_df = filtered_df[size_mask]
        
        # If search_term is provided, use it as additional filter (fallback)
        if search_term:
            search_cols = ['Category.1', 'Detailed description']
            search_words = [word for word in search_term.lower().split() if len(word) > 2]
            logger.info(f"Search term: '{search_term}', words: {search_words}")
            
            if search_words:
                # Create flexible search patterns for common spelling variations
                flexible_patterns = []
                for word in search_words:
                    # Add the original word
                    flexible_patterns.append(word)
                    # Add common variations
                    if word == 'womrn' or word == 'women':
                        flexible_patterns.extend(['women', 'woman', 'female'])
                    elif word == 'men' or word == 'man':
                        flexible_patterns.extend(['men', 'man', 'male'])
                    elif word == 'hoodie' or word == 'hoody':
                        flexible_patterns.extend(['hoodie', 'hoody', 'hood', 'sweatshirt'])
                    elif word == 'pant' or word == 'pants':
                        flexible_patterns.extend(['pant', 'pants', 'trouser', 'trousers'])
                    elif word == 'shirt' or word == 'shirts':
                        flexible_patterns.extend(['shirt', 'shirts', 'top', 'tops'])
                
                # Remove duplicates and create pattern
                unique_patterns = list(set(flexible_patterns))
                search_pattern = '|'.join(unique_patterns)
                logger.info(f"Flexible search pattern: {search_pattern}")
                
                # Use AND logic - all words must be present in the same row
                mask = filtered_df[search_cols].apply(
                    lambda x: x.str.contains(search_pattern, case=False, na=False, regex=True)
                ).any(axis=1)
                
                # Additional check: ensure we have matches for multiple words if they exist
                if len(search_words) > 1:
                    # For multi-word searches, ensure ALL words match (AND logic)
                    word_matches = []
                    for word in search_words:
                        word_variations = [word]
                        if word == 'womrn' or word == 'women':
                            word_variations.extend(['women', 'woman', 'female'])
                        elif word == 'men' or word == 'man':
                            word_variations.extend(['men', 'man', 'male'])
                        elif word == 'hoodie' or word == 'hoody':
                            word_variations.extend(['hoodie', 'hoody', 'hood', 'sweatshirt'])
                        elif word == 'pant' or word == 'pants':
                            word_variations.extend(['pant', 'pants', 'trouser', 'trousers'])
                        elif word == 'shirt' or word == 'shirts':
                            word_variations.extend(['shirt', 'shirts', 'top', 'tops'])
                        
                        word_pattern = '|'.join(word_variations)
                        word_mask = filtered_df[search_cols].apply(
                            lambda x: x.str.contains(word_pattern, case=False, na=False, regex=True)
                        ).any(axis=1)
                        word_matches.append(word_mask)
                    
                    # Combine all word matches with AND logic
                    combined_mask = word_matches[0]
                    for word_mask in word_matches[1:]:
                        combined_mask = combined_mask & word_mask
                    mask = combined_mask
                    
                    # STRICT GENDER FILTERING: If gender is specified, don't fall back to similar items
                    has_gender = any(word in search_words for word in ['women', 'men', 'woman', 'man', 'womrn'])
                    if mask.sum() == 0 and has_gender:
                        logger.info("No exact gender matches found - keeping strict gender filter")
                        # Don't fall back to similar items if gender was specified
                        # This ensures "men hoodie" returns 0 results, not women's hoodies
                    elif mask.sum() == 0 and not has_gender:
                        logger.info("No exact matches found, trying to find similar items...")
                        # Only try similar items if no gender was specified
                        similar_pattern = '|'.join(search_words)
                        similar_mask = filtered_df[search_cols].apply(
                            lambda x: x.str.contains(similar_pattern, case=False, na=False, regex=True)
                        ).any(axis=1)
                        if similar_mask.sum() > 0:
                            logger.info(f"Found {similar_mask.sum()} similar items without gender filter")
                            mask = similar_mask
                
                logger.info(f"Found {mask.sum()} matches for search_term")
                filtered_df = filtered_df[mask]
        
        
        logger.info(f"Final filtered results: {len(filtered_df)} products")
        
        # Convert to list of dictionaries with safe string conversion
        products = []
        for _, row in filtered_df.head(limit).iterrows():
            def safe_str(value):
                if pd.isna(value) or value is None:
                    return ""
                return str(value)
            
            product = {
                "id": len(products) + 1,
                "name": safe_str(row['Category']),  # Product brand/name
                "description": safe_str(row['Category.1']),  # Product description
                "detailed_description": safe_str(row['Detailed description']),
                "price": safe_str(row['Current Price']),
                "original_price": safe_str(row['Original Price']),
                "image_url": safe_str(row['Image Url']),
                "product_url": safe_str(row['Product page url']),
                "sizes": safe_str(row['Sizes']),
                "colors": safe_str(row['Colors']),
                "messaging": safe_str(row['productcard_messaging']),
                "offer_percent": safe_str(row['Offer %']),
                "gender": safe_str(row['Gender'])
            }
            products.append(product)
        
        result = {
            "success": True,
            "products": products,
            "total_count": len(products),
            "filters_applied": {
                "category": category,
                "color": color,
                "size": size,
                "search_term": search_term
            }
        }
        
        # Add helpful message if no products found
        if len(products) == 0:
            # Create specific suggestions based on what was searched
            suggestions = []
            if gender and gender.lower() in ['men', 'male']:
                suggestions.append("men's clothing")
            elif gender and gender.lower() in ['women', 'female']:
                suggestions.append("women's clothing")
            
            if category:
                suggestions.append(f"{category}s")
            
            if color:
                suggestions.append(f"{color} items")
            
            # Default suggestions
            if not suggestions:
                suggestions = ["hoodies", "sweatshirts", "pants", "tops", "jackets"]
            
            suggestion_text = ", ".join(suggestions[:3])
            result["message"] = f"Sorry, I couldn't find any products matching your search criteria. 😔\n\nHow about trying one of these instead?\n• {suggestion_text}\n• Or try a different color or size\n\nI'm here to help you find the perfect fashion items! 💫"
        
        return json.dumps(result)
        
    except Exception as e:
        return json.dumps({"success": False, "error": str(e), "products": []})

@mcp.tool()
async def get_similar_products(
    product_description: str,
    current_product: str
) -> str:
    """Get similar/recommended products based on the current product using AI-style pairing logic.
    
    Args:
        product_description: Description of the current product
        current_product: JSON string of current product object with name, colors, etc.
    
    Returns:
        JSON string containing recommended products
    """
    try:
        if df.empty:
            return json.dumps({"success": False, "error": "No products available", "recommendations": []})
        
        # Parse current product
        current_product_obj = json.loads(current_product) if isinstance(current_product, str) else current_product
        
        # AI-style pairing logic based on the selected item
        pairing_terms = []
        
        # Analyze the current product to determine pairing items
        product_name = current_product_obj.get('name', '').lower()
        product_colors = current_product_obj.get('colors', '').lower()
        
        # Determine what type of item this is and what would pair well
        if any(word in product_name for word in ['hoodie', 'sweatshirt', 'crew', 'fleece', 'sweater']):
            # This is a top - suggest bottoms and shoes
            pairing_terms.extend(['pant', 'legging', 'sweatpant', 'jogger', 'short'])
        elif any(word in product_name for word in ['pant', 'legging', 'sweatpant', 'jogger']):
            # This is a bottom - suggest tops and shoes
            pairing_terms.extend(['hoodie', 'sweatshirt', 'crew', 'fleece', 'sweater', 'top', 'shirt'])
        elif any(word in product_name for word in ['dress', 'skirt']):
            # This is a dress - suggest shoes and accessories
            pairing_terms.extend(['shoe', 'sneaker', 'boot'])
        
        # Color pairing logic
        if 'black' in product_colors or 'navy' in product_colors:
            pairing_terms.extend(['white', 'gray', 'beige', 'cream'])
        elif 'white' in product_colors or 'cream' in product_colors:
            pairing_terms.extend(['black', 'navy', 'brown', 'gray'])
        elif 'blue' in product_colors:
            pairing_terms.extend(['black', 'white', 'gray', 'navy'])
        elif 'pink' in product_colors or 'red' in product_colors:
            pairing_terms.extend(['black', 'white', 'gray', 'navy'])
        
        # Search for pairing products
        similar_df = df.copy()
        
        if pairing_terms:
            mask = similar_df['Category.1'].str.contains('|'.join(pairing_terms), case=False, na=False)
            similar_df = similar_df[mask]
        
        # If no matches found, get products from the same brand/category
        if similar_df.empty:
            similar_df = df[df['Category'].str.contains('Nike', case=False, na=False)]
        
        # If still no matches, get random products
        if similar_df.empty:
            similar_df = df.sample(n=min(4, len(df)))
        
        # Convert to list of dictionaries with safe string conversion
        similar_products = []
        for _, row in similar_df.head(4).iterrows():
            def safe_str(value):
                if pd.isna(value) or value is None:
                    return ""
                return str(value)
            
            product = {
                "id": len(similar_products) + 1,
                "name": safe_str(row['Category']),
                "description": safe_str(row['Category.1']),
                "price": safe_str(row['Current Price']),
                "image_url": safe_str(row['Image Url']),
                "product_url": safe_str(row['Product page url']),
                "sizes": safe_str(row['Sizes']),
                "colors": safe_str(row['Colors'])
            }
            similar_products.append(product)
        
        result = {
            "success": True,
            "recommendations": similar_products,
            "total_count": len(similar_products)
        }
        return json.dumps(result)
        
    except Exception as e:
        return json.dumps({"success": False, "error": str(e), "recommendations": []})

def main():
    """Initialize and run the MCP server"""
    logger.info("Starting Nike Fashion Assistant MCP Server")
    mcp.run(transport='stdio')

if __name__ == "__main__":
    main()
