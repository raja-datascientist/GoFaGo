// StyleAI Application JavaScript
class StyleAI {
    constructor() {
        this.currentPage = 'search';
        this.cart = this.loadCart();
        this.favorites = this.loadFavorites();
        this.searchHistory = this.loadSearchHistory();
        this.selectedProducts = new Set();
        this.currentProduct = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCartBadge();
        this.updateFavoritesBadge();
        // Don't load initial products - start with empty state
    }

    setupEventListeners() {
        // Quick Links navigation
        document.querySelectorAll('.quick-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateToPage(page);
            });
        });

        // Search history navigation
        document.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToPage('search');
            });
        });

        // New search button
        document.querySelector('.new-search-btn').addEventListener('click', () => {
            this.startNewSearch();
        });

        // Load more button (if exists)
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreProducts();
            });
}

// Send message
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        if (messageInput) {
            // Message input enter key
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // Quick refinements
        document.querySelectorAll('.refinement-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                this.applyFilter(filter);
            });
        });

        // Search pills
        document.querySelectorAll('.search-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const query = e.currentTarget.textContent;
                this.performSearch(query);
            });
        });

        // Filter chip removal
        document.querySelectorAll('.remove-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.currentTarget.parentElement.remove();
            });
        });

        // Modal close
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });

        // Modal overlay click
        document.getElementById('quickViewModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        // Modal interactions
        this.setupModalInteractions();
        
        // Use event delegation at document level for all dynamically created buttons
        document.addEventListener('click', (e) => {
            console.log('Click event:', e.target);
            
            // Handle View button
            if (e.target.classList.contains('view-btn-action')) {
                const productId = e.target.getAttribute('data-product-id');
                console.log('View button clicked for:', productId);
                if (productId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openQuickView(productId);
                    return false;
                }
            }
            
            // Handle Add button
            if (e.target.classList.contains('add-btn-action')) {
                const productId = e.target.getAttribute('data-product-id');
                console.log('Add button clicked for:', productId);
                if (productId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.addToCart(productId);
                    return false;
                }
            }
            
            // Handle Quick View button in recommendations
            if (e.target.classList.contains('quick-view-btn')) {
                const productId = e.target.getAttribute('data-product-id');
                console.log('Quick view button clicked for:', productId);
                if (productId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openQuickView(productId);
                    return false;
                }
            }
        }, true); // Use capture phase
    }

    setupModalInteractions() {
        // Thumbnail gallery
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.addEventListener('click', () => {
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                // Update main image
                const color = thumb.style.backgroundColor;
                document.getElementById('mainImage').style.backgroundColor = color;
            });
        });

        // Color selector
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Size selector
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Add to cart from modal
        document.querySelector('.add-to-cart-btn').addEventListener('click', () => {
            this.addToCartFromModal();
        });

        // Visit vendor button
        document.querySelector('.visit-vendor-btn').addEventListener('click', () => {
            this.visitVendor();
        });
    }

    // Product data
    getProductData() {
        return [
            {
                id: 'product_1',
                brand: 'Ralph Lauren',
                name: 'Classic Fit Polo',
                price: 89.50,
                vendor: 'ralphlauren.com',
                vendorUrl: 'https://ralphlauren.com/product/classic-fit-polo?ref=styleai',
                imageColor: 'blue',
                matchPercentage: 96,
                color: 'Blue Harbor',
                size: 'L',
                rating: 4.8,
                reviews: '2.3k',
                features: ['100% Cotton mesh fabric', 'Classic fit for comfort', 'Machine washable']
            },
            {
                id: 'product_2',
                brand: 'Lacoste',
                name: 'Sport Polo Shirt',
                price: 95.00,
                vendor: 'lacoste.com',
                vendorUrl: 'https://lacoste.com/product/sport-polo?ref=styleai',
                imageColor: 'green',
                matchPercentage: 94,
                color: 'White',
                size: 'M',
                rating: 4.6,
                reviews: '1.8k',
                features: ['100% Cotton piqué', 'Sport fit', 'Easy care']
            },
            {
                id: 'product_3',
                brand: 'Tommy Hilfiger',
                name: 'Slim Fit Polo',
                price: 69.99,
                vendor: 'tommy.com',
                vendorUrl: 'https://tommy.com/product/slim-fit-polo?ref=styleai',
                imageColor: 'pink',
                matchPercentage: 92,
                color: 'Navy',
                size: 'S',
                rating: 4.4,
                reviews: '1.2k',
                features: ['Cotton blend', 'Slim fit', 'Pre-shrunk']
            },
            {
                id: 'product_4',
                brand: 'Nike',
                name: 'Dri-FIT Polo',
                price: 65.00,
                vendor: 'nike.com',
                vendorUrl: 'https://nike.com/product/dri-fit-polo?ref=styleai',
                imageColor: 'yellow',
                matchPercentage: 90,
                color: 'Black',
                size: 'XL',
                rating: 4.7,
                reviews: '3.1k',
                features: ['Dri-FIT technology', 'Athletic fit', 'Quick-dry']
            },
            {
                id: 'product_5',
                brand: 'Polo Ralph Lauren',
                name: 'Custom Fit Mesh',
                price: 98.50,
                vendor: 'ralphlauren.com',
                vendorUrl: 'https://ralphlauren.com/product/custom-fit-mesh?ref=styleai',
                imageColor: 'purple',
                matchPercentage: 89,
                color: 'Red',
                size: 'L',
                rating: 4.5,
                reviews: '956',
                features: ['Mesh fabric', 'Custom fit', 'Breathable']
            },
            {
                id: 'product_6',
                brand: 'Calvin Klein',
                name: 'Liquid Cotton Polo',
                price: 59.99,
                vendor: 'calvinklein.com',
                vendorUrl: 'https://calvinklein.com/product/liquid-cotton-polo?ref=styleai',
                imageColor: 'gray',
                matchPercentage: 87,
                color: 'Gray',
                size: 'M',
                rating: 4.3,
                reviews: '789',
                features: ['Liquid cotton', 'Modern fit', 'Wrinkle-resistant']
            }
        ];
    }

    loadInitialProducts() {
        const products = this.getProductData();
        this.displayProducts(products);
    }

    displayProducts(products) {
        const chatMessages = document.getElementById('chatMessages');
        const productGridContainer = document.getElementById('productGridContainer');
        
        // Store products for modal and recommendations
        this.productsData = products;
        
        // Create product grid
        productGridContainer.innerHTML = '<div class="product-grid" id="productGrid"></div>';
        const productGrid = document.getElementById('productGrid');
        
        productGrid.innerHTML = '';
        
        products.forEach((product, index) => {
            const productCard = this.createProductCard(product, index);
            productGrid.appendChild(productCard);
        });
        
        // Scroll to products
        productGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    createProductCard(product, index = 0) {
        const card = document.createElement('div');
        const productId = product.product_id || product.id || `product_${index}`;
        card.className = 'product-card';
        card.dataset.productId = productId;
        
        // Use image URL if available, otherwise use color class as fallback
        const imageUrl = product.image_url || product.imageUrl || '';
        const colorClass = product.imageColor || ['blue', 'green', 'pink', 'yellow', 'purple', 'gray'][index % 6];
        
        const productName = product.name || product.title || 'Product Name';
        const productBrand = product.brand || 'Brand';
        const productPrice = product.price || product.current_price || '0.00';
        const matchScore = product.matchPercentage || Math.floor(Math.random() * 10) + 85;
        
        card.innerHTML = `
            <div class="product-image ${colorClass}" ${imageUrl ? `style="background-image: url(${imageUrl}); background-size: cover; background-position: center;"` : ''}>
                <button class="favorite-btn" onclick="styleAI.toggleFavorite('${productId}')">♡</button>
                <div class="match-badge">
                    <span class="match-percentage">${matchScore}</span>
                    <span class="match-text">match</span>
                </div>
            </div>
            <div class="product-info">
                <div class="product-brand">${productBrand}</div>
                <div class="product-name">${productName}</div>
                <div class="product-price">$${productPrice}</div>
                <div class="product-actions">
                    <button class="action-btn view-btn-action" data-product-id="${productId}">👁️ View</button>
                    <button class="action-btn add-btn-action" data-product-id="${productId}">🛍️ Add</button>
                </div>
            </div>
        `;
        
        return card;
    }

    loadMoreProducts() {
        const productGrid = document.getElementById('productGrid');
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'ai-response';
        loadingMessage.innerHTML = '<p>✨ Loading 6 more results...</p>';
        
        productGrid.parentNode.insertBefore(loadingMessage, productGrid.nextSibling);
        
        // Simulate loading delay
        setTimeout(() => {
            loadingMessage.remove();
            
            // Add more products (duplicate for demo)
            const products = this.getProductData();
            products.forEach(product => {
                const productCard = this.createProductCard(product);
                productGrid.appendChild(productCard);
            });
            
            // Scroll to new products
            productGrid.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 1000);
    }

    openQuickView(productId) {
        console.log('Opening quick view for product:', productId);
        
        // Try to find product in displayed products first
        let product = null;
        if (this.productsData) {
            product = this.productsData.find(p => {
                const pId = p.product_id || p.id || '';
                return pId === productId;
            });
        }
        
        if (!product) {
            console.error('Product not found:', productId);
            return;
        }
        
        this.currentProduct = product;
        
        // Fetch recommendations for this product
        this.loadRecommendations(productId);
        
        // Update modal content with real product data
        const brandEl = document.querySelector('.product-brand');
        if (brandEl) brandEl.textContent = (product.brand || 'Brand').toUpperCase();
        
        const nameEl = document.querySelector('.product-name');
        if (nameEl) nameEl.textContent = product.name || product.title || 'Product Name';
        
        const priceEl = document.querySelector('.product-price');
        if (priceEl) priceEl.textContent = `$${product.price || product.current_price || '0.00'}`;
        
        const vendorUrl = document.querySelector('.vendor-url');
        if (vendorUrl) {
            const vendor = product.brand || 'vendor.com';
            vendorUrl.textContent = `🔗 ${vendor}`;
            vendorUrl.href = product.product_url || product.productUrl || '#';
        }
        
        // Update image if available
        const mainImage = document.getElementById('mainImage');
        if (mainImage && product.image_url) {
            mainImage.style.backgroundImage = `url(${product.image_url})`;
            mainImage.style.backgroundSize = 'cover';
            mainImage.style.backgroundPosition = 'center';
        }
        
        // Update features
        const featuresList = document.querySelector('.features ul');
        if (featuresList) {
            featuresList.innerHTML = '';
            // Create features from product data
            const description = product.detailed_description || product.description || '';
            if (description) {
                const features = description.split('.').slice(0, 3).filter(f => f.trim());
                features.forEach(feature => {
                    const li = document.createElement('li');
                    li.textContent = feature.trim() + '.';
                    featuresList.appendChild(li);
                });
            }
        }
        
        // Update match badge
        const matchPercentage = Math.floor(Math.random() * 10) + 85;
        const matchBadge = document.querySelector('.modal-left .match-percentage');
        if (matchBadge) {
            matchBadge.textContent = matchPercentage;
        }
        
        // Show modal
        document.getElementById('quickViewModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async loadRecommendations(productId) {
        // Load recommendations from backend
        try {
            const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId: productId })
            });
            
            const data = await response.json();
            
            if (data.products && data.products.length > 0) {
                this.displayRecommendations(data.products);
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
        }
    }

    displayRecommendations(products) {
        const lookItemsContainer = document.getElementById('lookItems');
        if (!lookItemsContainer) return;
        
        lookItemsContainer.innerHTML = '';
        
        const displayProducts = products.slice(0, 2);
        
        if (displayProducts.length === 0) {
            lookItemsContainer.innerHTML = '<p style="color: #64748b; font-size: 14px;">No recommendations available yet.</p>';
            return;
        }
        
        displayProducts.forEach((product, index) => {
            const lookItem = document.createElement('div');
            lookItem.className = 'look-item';
            
            const productId = product.product_id || product.id || `rec_${index}`;
            const color = this.getRandomColor();
            const imageUrl = product.image_url || product.imageUrl || '';
            
            lookItem.innerHTML = `
                <div class="look-image" style="background-color: ${color}; ${imageUrl ? `background-image: url(${imageUrl}); background-size: cover; background-position: center;` : ''}"></div>
                <div class="look-info">
                    <div class="look-name">${product.name || product.title || 'Product'}</div>
                    <div class="look-price">$${product.price || product.current_price || '0.00'}</div>
                    <button class="quick-view-btn" data-product-id="${productId}">Quick View</button>
                </div>
            `;
            
            lookItemsContainer.appendChild(lookItem);
        });
    }

    getRandomColor() {
        const colors = ['#d9e8ff', '#fce4ec', '#e8f5e8', '#fef3c7', '#e9d5ff', '#f0f0f0', '#e0e0e0'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    closeModal() {
        document.getElementById('quickViewModal').classList.remove('active');
        document.body.style.overflow = '';
        this.currentProduct = null;
    }

    addToCart(productId) {
        const products = this.getProductData();
        const product = products.find(p => p.id === productId);
        
        if (!product) return;
        
        const cartItem = {
            id: product.id,
            brand: product.brand,
            name: product.name,
            price: product.price,
            vendor: product.vendor,
            vendorUrl: product.vendorUrl,
            imageColor: product.imageColor,
            color: product.color,
            size: product.size,
            addedAt: Date.now()
        };
        
        // Check if item already exists
        const existingIndex = this.cart.findIndex(item => item.id === productId);
        if (existingIndex === -1) {
            this.cart.push(cartItem);
            this.saveCart();
            this.updateCartBadge();
            this.showToast('Added to cart!');
        } else {
            this.showToast('Item already in cart');
        }
    }

    addToCartFromModal() {
        if (this.currentProduct) {
            this.addToCart(this.currentProduct.id);
        }
    }

    visitVendor() {
        if (this.currentProduct) {
            window.open(this.currentProduct.vendorUrl, '_blank');
        }
    }

    toggleFavorite(productId) {
        const index = this.favorites.indexOf(productId);
        if (index === -1) {
            this.favorites.push(productId);
        } else {
            this.favorites.splice(index, 1);
        }
        
        this.saveFavorites();
        this.updateFavoritesBadge();
        this.showToast(index === -1 ? 'Added to favorites!' : 'Removed from favorites');
    }

    navigateToPage(page) {
        // Update active states
        document.querySelectorAll('.quick-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        // Update search history active state
        document.querySelectorAll('.search-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (page === 'search') {
            document.querySelector('.search-item').classList.add('active');
        }
        
        this.currentPage = page;
        
        // Handle different page content
        switch (page) {
            case 'cart':
                this.showCartPage();
                break;
            case 'favorites':
                this.showFavoritesPage();
                break;
            case 'trending':
                this.showTrendingPage();
                break;
            case 'new':
                this.showNewArrivalsPage();
                break;
            case 'sale':
                this.showSalePage();
                break;
            default:
                this.showSearchPage();
        }
    }

    showCartPage() {
        // This would show the shopping cart page
        // For now, just show a message
        this.showToast('Shopping Cart page would load here');
    }

    showFavoritesPage() {
        this.showToast('Favorites page would load here');
    }

    showTrendingPage() {
        this.showToast('Trending page would load here');
    }

    showNewArrivalsPage() {
        this.showToast('New Arrivals page would load here');
    }

    showSalePage() {
        this.showToast('Sale Items page would load here');
    }

    showSearchPage() {
        this.showToast('Search page loaded');
    }

    applyFilter(filter) {
        // Add filter chip
        const filterChips = document.querySelector('.filter-chips');
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `
            ${filter.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            <button class="remove-filter">×</button>
        `;
        
        // Add remove functionality
        chip.querySelector('.remove-filter').addEventListener('click', (e) => {
            e.stopPropagation();
            chip.remove();
        });
        
        filterChips.appendChild(chip);
        
        this.showToast(`Filter applied: ${filter}`);
    }

    performSearch(query) {
        document.querySelector('.search-title').textContent = query;
        this.showToast(`Searching for: ${query}`);
        
        // Add to search history
        this.addToSearchHistory(query);
    }

    addToSearchHistory(query) {
        const searchItem = {
            query: query,
            timestamp: Date.now(),
            resultCount: Math.floor(Math.random() * 20) + 10,
            thumbnail: this.getRandomColor()
        };
        
        this.searchHistory.unshift(searchItem);
        if (this.searchHistory.length > 3) {
            this.searchHistory = this.searchHistory.slice(0, 3);
        }
        
        this.saveSearchHistory();
        this.updateSearchHistory();
    }

    getRandomColor() {
        const colors = ['#d9e8ff', '#fce4ec', '#e8f5e8', '#fef3c7', '#e9d5ff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateSearchHistory() {
        const searchHistory = document.querySelector('.search-history');
        searchHistory.innerHTML = '';
        
        this.searchHistory.forEach((item, index) => {
            const searchItem = document.createElement('div');
            searchItem.className = `search-item ${index === 0 ? 'active' : ''}`;
            
            const timeAgo = this.getTimeAgo(item.timestamp);
            
            searchItem.innerHTML = `
                <div class="search-thumbnail" style="background-color: ${item.thumbnail};"></div>
                <div class="search-info">
                    <div class="search-title">${item.query.length > 15 ? item.query.substring(0, 15) + '...' : item.query}</div>
                    <div class="search-meta">${timeAgo} • ${item.resultCount} items</div>
        </div>
    `;
    
            searchItem.addEventListener('click', () => {
                this.navigateToPage('search');
            });
            
            searchHistory.appendChild(searchItem);
        });
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes} min ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    async sendMessage() {
        console.log('sendMessage called');
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        console.log('Message:', message);
        
        if (!message) {
            console.log('Empty message, returning');
            return;
        }
        
        // Hide empty state and show chat messages
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'flex';
        document.getElementById('chatMessages').style.flexDirection = 'column';
        
        const chatMessages = document.getElementById('chatMessages');
        
        // Add user message to chat
        const userMessage = document.createElement('div');
        userMessage.className = 'user-message';
        userMessage.textContent = message;
        chatMessages.appendChild(userMessage);
        
        // Clear input
        input.value = '';
        
        // Show loading
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'ai-message';
        loadingMessage.innerHTML = '<div class="loading-spinner-inline"></div> Searching...';
        chatMessages.appendChild(loadingMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // Send message to backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            // Remove loading message
            loadingMessage.remove();
            
            // Add AI response
            const aiResponse = document.createElement('div');
            aiResponse.className = 'ai-message';
            aiResponse.textContent = data.message || `I found results for "${message}"! Here are the top picks:`;
            chatMessages.appendChild(aiResponse);
            
            // Load products if available
            if (data.products && data.products.length > 0) {
                this.displayProducts(data.products);
            }
            
            // Update header with search title
            document.querySelector('.search-title').textContent = message;
            
        } catch (error) {
            console.error('Error sending message:', error);
            loadingMessage.remove();
            
            const errorMessage = document.createElement('div');
            errorMessage.className = 'ai-message';
            errorMessage.innerHTML = `<p>I found results for "${message}"! Here are the top picks:</p>`;
            chatMessages.appendChild(errorMessage);
            
            // Fallback to mock data if backend fails
            this.displayProducts(this.getProductData());
            document.querySelector('.search-title').textContent = message;
        }
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    startNewSearch() {
        document.getElementById('messageInput').focus();
        this.showToast('Start typing your search...');
    }

    updateCartBadge() {
        const badge = document.querySelector('[data-page="cart"] .badge');
        if (badge) {
            badge.textContent = this.cart.length;
        }
    }

    updateFavoritesBadge() {
        const badge = document.querySelector('[data-page="favorites"] .badge');
        if (badge) {
            badge.textContent = this.favorites.length;
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = toast.querySelector('.toast-message');
        
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Local Storage Methods
    loadCart() {
        try {
            const cart = localStorage.getItem('styleai_session_cart');
            return cart ? JSON.parse(cart) : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    }

    saveCart() {
        try {
            localStorage.setItem('styleai_session_cart', JSON.stringify(this.cart));
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    loadFavorites() {
        try {
            const favorites = localStorage.getItem('styleai_session_favorites');
            return favorites ? JSON.parse(favorites) : [];
        } catch (error) {
            console.error('Error loading favorites:', error);
            return [];
        }
    }

    saveFavorites() {
        try {
            localStorage.setItem('styleai_session_favorites', JSON.stringify(this.favorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    }

    loadSearchHistory() {
        try {
            const history = localStorage.getItem('styleai_search_history');
            return history ? JSON.parse(history) : [
                {
                    query: 'Blue Polo Shirts',
                    timestamp: Date.now() - 60000,
                    resultCount: 12,
                    thumbnail: '#d9e8ff'
                },
                {
                    query: 'Summer Dresses',
                    timestamp: Date.now() - 300000,
                    resultCount: 24,
                    thumbnail: '#fce4ec'
                },
                {
                    query: 'Running Shoes',
                    timestamp: Date.now() - 720000,
                    resultCount: 18,
                    thumbnail: '#e8f5e8'
                }
            ];
        } catch (error) {
            console.error('Error loading search history:', error);
            return [];
        }
    }

    saveSearchHistory() {
        try {
            localStorage.setItem('styleai_search_history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    }
}

// Initialize the application
let styleAI;
document.addEventListener('DOMContentLoaded', () => {
    styleAI = new StyleAI();
});

// Handle page refresh - clear session data if needed
window.addEventListener('beforeunload', () => {
    // Session data persists until browser closes
    // This is handled by localStorage
});