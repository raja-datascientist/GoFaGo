// Global state
let messages = [];
let products = [];
let selectedProduct = null;
let recommendations = [];
let lastSearchContext = null; // Store the last search context for recommendations

// DOM elements
const messagesContainer = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const searchResultsSection = document.getElementById('searchResultsSection');
const productsGrid = document.getElementById('productsGrid');
const productDetailsSection = document.getElementById('productDetailsSection');
const productDetails = document.getElementById('productDetails');
const recommendationsSection = document.getElementById('recommendationsSection');
const recommendationsGrid = document.getElementById('recommendationsGrid');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');

// Event listeners (moved to main initialization at end of file)

// Add message to chat
function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    if (role === 'user') {
        messageDiv.innerHTML = `<strong>You:</strong> ${content}`;
    } else {
        messageDiv.innerHTML = `<strong>Sara:</strong> ${content}`;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage('user', message);
    chatInput.value = '';
    
    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing';
    typingDiv.innerHTML = '<strong>Sara:</strong> <span class="search-progress">🔍 Searching for your perfect fashion items...</span>';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Disable input
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    
    try {
        // Build conversation history from current messages
        const conversationHistory = [];
        const messageElements = messagesContainer.querySelectorAll('.message');
        
        for (let i = 0; i < messageElements.length - 1; i++) { // Exclude the typing indicator
            const msgElement = messageElements[i];
            const isUser = msgElement.classList.contains('user');
            const content = msgElement.textContent.replace(/^(You|Sara):\s*/, ''); // Remove speaker prefix
            
            conversationHistory.push({
                role: isUser ? 'user' : 'assistant',
                content: content
            });
        }
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: message,
                conversationHistory: conversationHistory
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        messagesContainer.removeChild(typingDiv);
        
        if (data.error) {
            addMessage('assistant', `Sorry, there was an error: ${data.error}`);
        } else {
            // Show the message from the assistant
            addMessage('assistant', data.message);
            
            if (data.products && data.products.length > 0) {
                products = data.products;
                // Store the search context for recommendations
                lastSearchContext = {
                    userMessage: message,
                    filtersApplied: data.filters_applied || null
                };
                showSearchResults();
            } else if (data.products && data.products.length === 0) {
                // Clear products and DON'T show search results page when no results
                products = [];
                lastSearchContext = null; // Clear search context if no results
                // Don't call showSearchResults() - keep the chat layout
            }
        }
    } catch (error) {
        console.error('Error:', error);
        messagesContainer.removeChild(typingDiv);
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
    }
}

// Show search results
function showSearchResults() {
    displayProducts();
    
    // Change layout to search results (30% chat, 70% results)
    const mainContent = document.querySelector('.main-content');
    mainContent.className = 'main-content search-results';
}

// Display products
function displayProducts() {
    productsGrid.innerHTML = '';
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<div class="empty-state"><p>No products found. Try asking Go Fa Go for different items!</p></div>';
        return;
    }
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product, index);
        productsGrid.appendChild(productCard);
    });
}

// Create product card
function createProductCard(product, index) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.onclick = () => viewProduct(index);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View details for ${product.description || product.name || 'Product'}`);
    
    // Handle price display
    const priceDisplay = product.original_price && product.original_price !== product.price 
        ? `<span class="product-price">${product.price || 'N/A'}</span><span class="product-original-price">${product.original_price}</span>`
        : `<span class="product-price">${product.price || 'N/A'}</span>`;
    
    // Handle offer display
    const offerDisplay = product.offer_percent 
        ? `<div class="product-offer">${product.offer_percent} off</div>`
        : '';
    
    // Handle messaging display
    const messagingDisplay = product.messaging 
        ? `<div class="product-messaging">${product.messaging}</div>`
        : '';
    
    card.innerHTML = `
        <div class="product-image-container">
            <img 
                src="${product.image_url || ''}" 
                alt="${product.name || product.description || 'Product'}" 
                class="product-image"
                loading="lazy"
                onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'"
            >
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name || 'Unknown Product'}</h3>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-price-container">
                ${priceDisplay}
            </div>
            ${offerDisplay}
            ${messagingDisplay}
        </div>
    `;
    
    // Add keyboard support
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProductWebsite(product);
        }
    });
    
    return card;
}

// View product details
async function viewProduct(index) {
    console.log('viewProduct called with index:', index, 'products:', products);
    selectedProduct = products[index];
    console.log('Selected product:', selectedProduct);
    
    // Change layout to product details (30% chat, 30% results, 40% details)
    const mainContent = document.querySelector('.main-content');
    mainContent.className = 'main-content product-details';
    console.log('Layout changed to product-details');
    
    // Add border to search results section to indicate selection
    const searchResultsSection = document.getElementById('searchResultsSection');
    searchResultsSection.classList.add('has-selection');
    
    // Show recommendations header
    const recommendationsHeader = document.getElementById('recommendationsHeader');
    recommendationsHeader.style.display = 'block';
    
    // Hide recommendations section initially
    recommendationsSection.style.display = 'none';
    recommendationsSection.classList.remove('show');
    
    // Display product details first
    displayProductDetails();
    
    // Wait for product details to be fully rendered, then show recommendations
    setTimeout(async () => {
        // Show recommendations section
        recommendationsSection.style.display = 'block';
        recommendationsSection.classList.add('show');
        
        // Clear and show loading
        recommendationsGrid.innerHTML = '<div class="empty-state"><p>Loading recommendations...</p></div>';
        
        // Get recommendations
        await getRecommendations();
    }, 800);
}

// Display product details
function displayProductDetails() {
    console.log('displayProductDetails called with:', selectedProduct);
    if (!selectedProduct) {
        console.log('No selected product, returning');
        return;
    }
    
    console.log('Setting product details HTML...');
    productDetails.innerHTML = `
        <div class="product-details-content">
            <div class="product-image-container">
                <img src="${selectedProduct.image_url || ''}" 
                     alt="Product Image" 
                     class="product-image"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'">
            </div>
            <div class="product-info">
                <h3 class="product-title">${selectedProduct.name || 'Unknown Product'}</h3>
                <div class="price-section">
                    <span class="current-price">${selectedProduct.price || 'N/A'}</span>
                    ${selectedProduct.original_price ? `<span class="original-price">${selectedProduct.original_price}</span>` : ''}
                    ${selectedProduct.offer_percent ? `<span class="offer-badge">${selectedProduct.offer_percent}</span>` : ''}
                </div>
                
                <div class="product-attributes">
                    <div class="attribute-group">
                        <h4>Available Colors</h4>
                        <p class="attribute-value">${selectedProduct.colors || 'N/A'}</p>
                    </div>
                    
                    <div class="attribute-group">
                        <h4>Available Sizes</h4>
                        <p class="attribute-value">${selectedProduct.sizes || 'N/A'}</p>
                    </div>
                    
                    ${selectedProduct.messaging ? `
                    <div class="attribute-group">
                        <h4>Special</h4>
                        <p class="attribute-value special">${selectedProduct.messaging}</p>
                    </div>
                    ` : ''}
                </div>
                
                <div class="description-section">
                    <h4>Description</h4>
                    <p class="product-description">${selectedProduct.detailed_description || selectedProduct.description || 'No description available'}</p>
                </div>
                
                ${selectedProduct.product_url ? `
                <div class="action-section">
                    <a href="${selectedProduct.product_url}" target="_blank" class="buy-button">View Product on Website</a>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    console.log('Product details HTML set successfully');
}

// Get recommendations
async function getRecommendations() {
    if (!selectedProduct) return;
    
    try {
        const response = await fetch('/api/recommendations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                product: selectedProduct,
                searchContext: lastSearchContext
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.recommendations) {
            recommendations = data.recommendations;
            displayRecommendations();
        }
    } catch (error) {
        console.error('Error getting recommendations:', error);
    }
}

// Display recommendations
function displayRecommendations() {
    recommendationsGrid.innerHTML = '';
    
    if (recommendations.length === 0) {
        recommendationsGrid.innerHTML = '<div class="empty-state"><p>No recommendations available for this product</p></div>';
        return;
    }
    
    recommendations.forEach((rec, index) => {
        const recCard = createRecommendationCard(rec, index);
        recommendationsGrid.appendChild(recCard);
    });
}

// Create recommendation card
function createRecommendationCard(product, index) {
    const card = document.createElement('article');
    card.className = 'recommendation-card';
    card.onclick = () => openProductWebsite(product);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open ${product.description || product.name || 'Product'} website`);
    
    // Handle price display
    const priceDisplay = product.original_price && product.original_price !== product.price 
        ? `<span class="recommendation-price">${product.price || 'N/A'}</span><span class="product-original-price">${product.original_price}</span>`
        : `<span class="recommendation-price">${product.price || 'N/A'}</span>`;
    
    card.innerHTML = `
        <div class="product-image-container">
            <img 
                src="${product.image_url || ''}" 
                alt="${product.description || product.name || 'Product'}" 
                class="recommendation-image"
                loading="lazy"
                onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'"
            >
        </div>
        <div class="recommendation-info">
            <h4 class="recommendation-title">${product.description || product.name || 'Unknown Product'}</h4>
            <div class="product-price-container">
                ${priceDisplay}
            </div>
        </div>
    `;
    
    // Add keyboard support
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProductWebsite(product);
        }
    });
    
    return card;
}

// Open product website
function openProductWebsite(product) {
    if (product.product_url) {
        window.open(product.product_url, '_blank', 'noopener,noreferrer');
    } else {
        console.warn('No product URL available for:', product);
        alert('Sorry, the product website link is not available.');
    }
}

// Close product details
function closeProductDetails() {
    // Change layout back to search results (30% chat, 70% results)
    const mainContent = document.querySelector('.main-content');
    mainContent.className = 'main-content search-results';
    
    // Remove border from search results section
    const searchResultsSection = document.getElementById('searchResultsSection');
    searchResultsSection.classList.remove('has-selection');
    
    // Hide recommendations header
    const recommendationsHeader = document.getElementById('recommendationsHeader');
    recommendationsHeader.style.display = 'none';
    
    // Clear product details
    productDetails.innerHTML = '<div class="empty-state"><p>Click on a product to see details here</p></div>';
    recommendationsGrid.innerHTML = '<div class="empty-state"><p>Product recommendations will appear here</p></div>';
    
    // Hide recommendations section
    recommendationsSection.style.display = 'none';
    recommendationsSection.classList.remove('show');
    
    // Clear selected product
    selectedProduct = null;
    recommendations = [];
}

// Handle image errors
function handleImageError(img) {
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Add welcome message
    addMessage('assistant', 'Hello! I\'m Sara, your AI fashion assistant. I can help you find the perfect clothing items. What are you looking for today?');
    
    // Add event listeners
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Add close button event listener
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', closeProductDetails);
    }
});