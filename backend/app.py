
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
    min_price: float = None,
    max_price: float = None,
    sort_by_price: str = None,
    limit: int = 100
) -> str:
    """Filter products based on gender, category, color, size, price range, and search terms.
    
    EXTRACT THESE ENTITIES from user queries:
    - gender: 'men', 'women', 'male', 'female' (matches 'Men's' or 'Women's' in product descriptions)
    - category: 'hoodie', 'pants', 'shirt', 'sweatshirt', 'jacket', 'top'
    - color: 'black', 'white', 'blue', 'red', 'pink', 'brown', 'gray'
    - size: 'S', 'M', 'L', 'XL', 'small', 'medium', 'large'
    - price: 'cheapest', 'under $50', 'under $100', 'expensive', 'budget', 'affordable'
    
    Examples:
    - "men hoodie" → gender='men', category='hoodie'
    - "women black pants" → gender='women', category='pants', color='black'
    - "blue shirt" → category='shirt', color='blue'
    - "cheapest hoodie" → category='hoodie', sort_by_price='asc'
    - "under $50" → max_price=50
    - "expensive jacket" → category='jacket', sort_by_price='desc'
    
    Args:
        gender: Product gender - 'men', 'women', 'male', 'female'
        category: Product category - 'hoodie', 'pants', 'shirt', 'sweatshirt', 'jacket', 'top'
        color: Product color - 'black', 'white', 'blue', 'red', 'pink', 'brown', 'gray'
        size: Product size - 'S', 'M', 'L', 'XL', 'small', 'medium', 'large'
        search_term: Fallback search term for complex queries
        min_price: Minimum price filter (float)
        max_price: Maximum price filter (float)
        sort_by_price: Sort by price - 'asc' for cheapest first, 'desc' for most expensive first
        limit: Maximum number of products to return (default: 100)
    
    Returns:
        JSON string containing filtered products
    """
    try:
        if df.empty:
            return json.dumps({"success": False, "error": "No products available", "products": []})
        
        filtered_df = df.copy()
        logger.info(f"Starting filter with {len(filtered_df)} products")
        logger.info(f"Filters - gender: {gender}, category: {category}, color: {color}, size: {size}, search_term: {search_term}, min_price: {min_price}, max_price: {max_price}, sort_by_price: {sort_by_price}")
        
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
        
        # Apply price filters
        if (min_price is not None or max_price is not None) and len(filtered_df) > 0:
            # Convert price column to numeric, handling any non-numeric values
            price_series = pd.to_numeric(filtered_df['Current Price'].str.replace('$', '').str.replace(',', '').str.replace('\u00a0', ''), errors='coerce')
            
            if min_price is not None:
                price_mask = price_series >= min_price
                logger.info(f"Min price filter '${min_price}': {price_mask.sum()} matches")
                filtered_df = filtered_df[price_mask]
            
            if max_price is not None:
                price_mask = price_series <= max_price
                logger.info(f"Max price filter '${max_price}': {price_mask.sum()} matches")
                filtered_df = filtered_df[price_mask]
        
        # Apply price sorting
        if sort_by_price and len(filtered_df) > 0:
            # Convert price column to numeric for sorting
            price_series = pd.to_numeric(filtered_df['Current Price'].str.replace('$', '').str.replace(',', '').str.replace('\u00a0', ''), errors='coerce')
            filtered_df = filtered_df.copy()
            filtered_df['numeric_price'] = price_series
            
            if sort_by_price.lower() == 'asc':
                filtered_df = filtered_df.sort_values('numeric_price', ascending=True)
                logger.info(f"Sorted by price ascending (cheapest first)")
            elif sort_by_price.lower() == 'desc':
                filtered_df = filtered_df.sort_values('numeric_price', ascending=False)
                logger.info(f"Sorted by price descending (most expensive first)")
            
            # Remove the temporary numeric_price column
            filtered_df = filtered_df.drop('numeric_price', axis=1)
        
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
            
            # Get brand from productcard_messaging or use first part of Category.1
            category_name = safe_str(row['Category.1'])
            brand = 'Nike'  # Default brand
            
            product = {
                "id": safe_str(row['ProductID']),  # Use ProductID from CSV
                "name": safe_str(row['Category']),  # Product brand/name
                "brand": brand,  # Brand name
                "description": category_name,  # Product description
                "detailed_description": safe_str(row['Detailed description']),
                "price": safe_str(row['Current Price']),
                "current_price": safe_str(row['Current Price']),  # Alias for price
                "original_price": safe_str(row['Original Price']),
                "image_url": safe_str(row['Image Url']),
                "Image_Url": safe_str(row['Image Url']),  # Alias with different casing
                "product_url": safe_str(row['Product page url']),
                "product_page_url": safe_str(row['Product page url']),  # Alias
                "sizes": safe_str(row['Sizes']),
                "Sizes": safe_str(row['Sizes']),  # Alias with different casing
                "colors": safe_str(row['Colors']),
                "Colors": safe_str(row['Colors']),  # Alias with different casing
                "colors_available": safe_str(row.get('Colors Available', '') if 'Colors Available' in row.index else ''),  # New field
                "Colors_Available": safe_str(row.get('Colors Available', '') if 'Colors Available' in row.index else ''),  # Alias
                "messaging": safe_str(row['productcard_messaging']),
                "productcard_messaging": safe_str(row['productcard_messaging']),
                "offer_percent": safe_str(row['Offer %']),
                "gender": safe_str(row['Gender']),
                "category": safe_str(row['Category']),  # Category field
                "Category": safe_str(row['Category'])  # Alias with different casing
            }
            products.append(product)
        
        result = {
            "success": True,
            "products": products,
            "total_count": len(products),
            "filters_applied": {
                "gender": gender,
                "category": category,
                "color": color,
                "size": size,
                "search_term": search_term,
                "min_price": min_price,
                "max_price": max_price,
                "sort_by_price": sort_by_price
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
    current_product: str,
    gender: str = None,
    category: str = None,
    color: str = None,
    size: str = None,
    min_price: float = None,
    max_price: float = None,
    sort_by_price: str = None,
    limit: int = 4
) -> str:
    """Get similar/recommended products based on the current product using AI-style pairing logic.
    
    This tool analyzes the clicked product and intelligently recommends complementary items
    that would pair well with it, using fashion knowledge and color coordination.
    
    Args:
        product_description: Description of the current product
        current_product: JSON string of current product object with name, colors, etc.
        gender: Filter by gender - 'men', 'women', 'male', 'female'
        category: Filter by category - 'hoodie', 'pants', 'shirt', 'sweatshirt', 'jacket', 'top'
        color: Filter by color - 'black', 'white', 'blue', 'red', 'pink', 'brown', 'gray'
        size: Filter by size - 'S', 'M', 'L', 'XL', 'small', 'medium', 'large'
        min_price: Minimum price filter (float)
        max_price: Maximum price filter (float)
        sort_by_price: Sort by price - 'asc' for cheapest first, 'desc' for most expensive first
        limit: Maximum number of products to return (default: 4)
    
    Returns:
        JSON string containing recommended products
    """
    try:
        if df.empty:
            return json.dumps({"success": False, "error": "No products available", "recommendations": []})
        
        # Parse current product
        current_product_obj = json.loads(current_product) if isinstance(current_product, str) else current_product
        
        # Start with all products
        filtered_df = df.copy()
        logger.info(f"Starting recommendations with {len(filtered_df)} products")
        logger.info(f"Current product: {current_product_obj.get('description', 'N/A')}")
        logger.info(f"Filters - gender: {gender}, category: {category}, color: {color}, size: {size}, min_price: {min_price}, max_price: {max_price}, sort_by_price: {sort_by_price}")
        
        # Apply gender filter first (most important for strict matching)
        if gender and len(filtered_df) > 0:
            gender_lower = gender.lower()
            if gender_lower in ['men', 'male']:
                gender_mask = filtered_df['Gender'] == 'Men'
                logger.info(f"Gender filter 'men': {gender_mask.sum()} matches")
                filtered_df = filtered_df[gender_mask]
            elif gender_lower in ['women', 'female']:
                gender_mask = filtered_df['Gender'] == 'Women'
                logger.info(f"Gender filter 'women': {gender_mask.sum()} matches")
                filtered_df = filtered_df[gender_mask]
        
        # Apply category filter
        if category and len(filtered_df) > 0:
            category_lower = category.lower()
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
        
        # Apply price filters
        if (min_price is not None or max_price is not None) and len(filtered_df) > 0:
            price_series = pd.to_numeric(filtered_df['Current Price'].str.replace('$', '').str.replace(',', '').str.replace('\u00a0', ''), errors='coerce')
            
            if min_price is not None:
                price_mask = price_series >= min_price
                logger.info(f"Min price filter '${min_price}': {price_mask.sum()} matches")
                filtered_df = filtered_df[price_mask]
            
            if max_price is not None:
                price_mask = price_series <= max_price
                logger.info(f"Max price filter '${max_price}': {price_mask.sum()} matches")
                filtered_df = filtered_df[price_mask]
        
        # Apply price sorting
        if sort_by_price and len(filtered_df) > 0:
            price_series = pd.to_numeric(filtered_df['Current Price'].str.replace('$', '').str.replace(',', '').str.replace('\u00a0', ''), errors='coerce')
            filtered_df = filtered_df.copy()
            filtered_df['numeric_price'] = price_series
            
            if sort_by_price.lower() == 'asc':
                filtered_df = filtered_df.sort_values('numeric_price', ascending=True)
                logger.info(f"Sorted by price ascending (cheapest first)")
            elif sort_by_price.lower() == 'desc':
                filtered_df = filtered_df.sort_values('numeric_price', ascending=False)
                logger.info(f"Sorted by price descending (most expensive first)")
            
            filtered_df = filtered_df.drop('numeric_price', axis=1)
        
        # If no products found after filtering, try to find complementary items based on the current product
        if len(filtered_df) == 0:
            logger.info("No products found with filters, trying complementary pairing logic...")
            
            # AI-style pairing logic based on the selected item
            pairing_terms = []
            product_name = current_product_obj.get('description', '').lower()
            product_colors = current_product_obj.get('colors', '').lower()
            
            # Determine what type of item this is and what would pair well
            if any(word in product_name for word in ['hoodie', 'sweatshirt', 'crew', 'fleece', 'sweater', 'top', 'shirt']):
                # This is a top - suggest bottoms
                pairing_terms.extend(['pant', 'legging', 'sweatpant', 'jogger', 'short'])
            elif any(word in product_name for word in ['pant', 'legging', 'sweatpant', 'jogger', 'short']):
                # This is a bottom - suggest tops
                pairing_terms.extend(['hoodie', 'sweatshirt', 'crew', 'fleece', 'sweater', 'top', 'shirt'])
            elif any(word in product_name for word in ['dress', 'skirt']):
                # This is a dress - suggest accessories
                pairing_terms.extend(['jacket', 'cardigan', 'blazer'])
            
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
            if pairing_terms:
                mask = df['Category.1'].str.contains('|'.join(pairing_terms), case=False, na=False)
                filtered_df = df[mask]
                logger.info(f"Found {len(filtered_df)} complementary items")
            
            # If still no matches, get products from the same brand
            if len(filtered_df) == 0:
                filtered_df = df[df['Category'].str.contains('Nike', case=False, na=False)]
                logger.info(f"Fallback to Nike products: {len(filtered_df)} items")
        
        logger.info(f"Final recommendation results: {len(filtered_df)} products")
        
        # Convert to list of dictionaries with safe string conversion
        recommendations = []
        for _, row in filtered_df.head(limit).iterrows():
            def safe_str(value):
                if pd.isna(value) or value is None:
                    return ""
                return str(value)
            
            product = {
                "id": len(recommendations) + 1,
                "name": safe_str(row['Category']),
                "description": safe_str(row['Category.1']),
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
            recommendations.append(product)
        
        result = {
            "success": True,
            "recommendations": recommendations,
            "total_count": len(recommendations),
            "filters_applied": {
                "gender": gender,
                "category": category,
                "color": color,
                "size": size,
                "min_price": min_price,
                "max_price": max_price,
                "sort_by_price": sort_by_price
            }
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
