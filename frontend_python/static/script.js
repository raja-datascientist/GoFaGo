// StyleAI Application JavaScript
class StyleAI {
    constructor() {
        this.currentPage = 'search';
        this.cart = this.loadCart();
        this.favorites = this.loadFavorites();
        this.searchSessions = this.loadSessions();
        this.currentSessionId = this.searchSessions.length > 0 ? this.searchSessions[this.searchSessions.length - 1].id : null;
        this.selectedProducts = new Set();
        this.currentProduct = null;
        this.conversationHistory = []; // Track conversation
        this.currentSearchContext = null; // Track current search context
        this.activeFilters = []; // Track active filter chips
        this.originalProductsData = null; // Store original unfiltered products
        
        this.init();
    }

    cleanPrice(price) {
        // Remove any existing $ symbols and whitespace, return as number
        if (typeof price === 'number') return price;
        if (typeof price === 'string') {
            return parseFloat(price.replace(/[$,\s]/g, '')) || 0;
        }
        return 0;
    }

    formatPrice(price) {
        // Clean and format price
        const cleanPrice = this.cleanPrice(price);
        return cleanPrice.toFixed(2);
    }

    init() {
        this.setupEventListeners();
        this.updateCartBadge();
        this.updateFavoritesBadge();
        this.updateSearchSessions();
        this.setupPageRefreshWarning();
        // Don't load initial products - start with empty state
    }

    setupPageRefreshWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.searchSessions.length > 0) {
                e.preventDefault();
                e.returnValue = 'Your search sessions will be cleared. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
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

        // New search button (now inline in THIS SESSION header, handled by onclick)
        const newSearchBtn = document.querySelector('.new-search-btn');
        if (newSearchBtn) {
            newSearchBtn.addEventListener('click', () => {
                this.startNewSearch();
            });
        }

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

        // Filter chip removal - Use document-level event delegation  
        document.body.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-filter')) {
                console.log('Remove filter button clicked');
                e.stopPropagation();
                e.preventDefault();
                const chip = e.target.closest('.filter-chip');
                console.log('Chip found:', chip);
                if (chip) {
                    const filterToRemove = chip.getAttribute('data-filter');
                    console.log('Filter to remove:', filterToRemove);
                    console.log('Active filters before:', this.activeFilters);
                    
                    if (filterToRemove) {
                        this.activeFilters = this.activeFilters.filter(f => f !== filterToRemove);
                    }
                    console.log('Active filters after:', this.activeFilters);
                    
                    chip.remove();
                    // Apply all remaining filters or restore all products
                    this.applyActiveFilters();
                }
            }
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
        // Thumbnail gallery - removed since thumbnails are now hidden
        // document.querySelectorAll('.thumbnail').forEach(thumb => {
        //     thumb.addEventListener('click', () => {
        //         document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
        //         thumb.classList.add('active');
        //         // Update main image
        //         const color = thumb.style.backgroundColor;
        //         document.getElementById('mainImage').style.backgroundColor = color;
        //     });
        // });

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
        // Don't load mock products - wait for user search
    }

    displayProducts(products) {
        const chatMessages = document.getElementById('chatMessages');
        const productGridContainer = document.getElementById('productGridContainer');
        
        // Store products for modal and recommendations
        this.productsData = products;
        
        // Store original products if not already set (first time displaying results)
        if (!this.originalProductsData) {
            this.originalProductsData = [...products];
        }
        
        // Save products to current session
        this.saveCurrentSession();
        
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
        // Backend returns 'id' as the product ID from CSV
        const productId = product.id || product.product_id || `product_${index}`;
        card.className = 'product-card';
        card.dataset.productId = productId;
        
        // Use image URL if available, otherwise use color class as fallback
        const imageUrl = product.image_url || product.imageUrl || '';
        const colorClass = product.imageColor || ['blue', 'green', 'pink', 'yellow', 'purple', 'gray'][index % 6];
        
        const productName = product.name || product.title || 'Product Name';
        const productBrand = product.brand || 'Brand';
        const productPrice = this.formatPrice(product.price || product.current_price || '0.00');
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
        
        // Don't load more products - just remove loading message
        loadingMessage.remove();
    }

    openQuickView(productId) {
        console.log('=== OPENING QUICK VIEW ===');
        console.log('Product ID:', productId);
        console.log('Products data:', this.productsData);
        console.log('Number of products:', this.productsData?.length);
        
        // Remove previous highlighting
        document.querySelectorAll('.product-card').forEach(card => {
            card.classList.remove('highlighted');
        });
        
        // Highlight the clicked product
        const clickedProduct = document.querySelector(`[data-product-id="${productId}"]`);
        if (clickedProduct) {
            clickedProduct.classList.add('highlighted');
        }
        
        // Try to find product in displayed products first
        let product = null;
        if (this.productsData) {
            console.log('Available product IDs:', this.productsData.map(p => ({id: p.id, product_id: p.product_id})));
            product = this.productsData.find(p => {
                const pId = p.id || p.product_id || '';
                console.log('Comparing:', String(pId), 'with', String(productId));
                return String(pId) === String(productId);
            });
        }
        
        if (!product) {
            console.error('=== PRODUCT NOT FOUND ===');
            console.error('Looking for:', productId);
            console.error('Available IDs:', this.productsData?.map(p => p.id || p.product_id));
            alert('Product not found: ' + productId);
            return;
        }
        
        console.log('=== FOUND PRODUCT ===');
        console.log('Product object:', JSON.stringify(product, null, 2));
        
        this.currentProduct = product;
        
        // Fetch recommendations for this product
        this.loadRecommendations(productId);
        
        // Show modal first
        document.getElementById('quickViewModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Update modal content with real product data - use modal-specific selectors
        const brandEl = document.querySelector('.modal-right .product-brand');
        // Use category as brand or first part of product name
        const brand = product.Category || product.category || product.brand || 'Nike';
        if (brandEl) {
            brandEl.textContent = brand.toUpperCase();
            console.log('Updated brand to:', brand.toUpperCase());
        } else {
            console.error('Brand element not found');
        }
        
        const nameEl = document.querySelector('.modal-right .product-name');
        // Use the same field as search results (product.name)
        if (nameEl) {
            // Search results use: product.name || product.title
            // So modal should also use: product.name || product.title
            const productName = product.name || product.title || product.description || product.Category || 'Unknown Product';
            console.log('=== MODAL PRODUCT DATA ===');
            console.log('Full product object:', product);
            console.log('product.name:', product.name);
            console.log('product.description:', product.description);
            console.log('product.Category:', product.Category);
            console.log('Final productName:', productName);
            nameEl.textContent = productName;
            console.log('Updated product name to:', productName);
        } else {
            console.error('Product name element not found in modal');
        }
        
        const priceEl = document.querySelector('.modal-right .product-price');
        const rawPrice = product.price || product.current_price;
        console.log('Raw price value:', rawPrice);
        if (priceEl) {
            const cleanPrice = this.formatPrice(rawPrice);
            console.log('Cleaned price:', cleanPrice);
            priceEl.textContent = `$${cleanPrice}`;
            console.log('Updated price to: $' + cleanPrice);
        } else {
            console.error('Price element not found in modal');
        }
        
        const vendorUrl = document.querySelector('.vendor-url');
        if (vendorUrl) {
            const vendor = 'nike.com';
            vendorUrl.textContent = `🔗 ${vendor}`;
            vendorUrl.href = product.product_url || product.product_page_url || '#';
        }
        
        // Update image if available
        const mainImage = document.getElementById('mainImage');
        const imageUrl = product.image_url || product.Image_Url || product.imageUrl || product.image_urls;
        if (mainImage && imageUrl) {
            mainImage.style.backgroundImage = `url(${imageUrl})`;
            mainImage.style.backgroundSize = 'cover';
            mainImage.style.backgroundPosition = 'center';
        } else {
            // Use color fallback
            mainImage.style.backgroundColor = product.imageColor || '#d9e8ff';
        }
        
        // Update features - show full detailed description
        const featuresContainer = document.querySelector('.features');
        if (featuresContainer) {
            const description = product.detailed_description || product.Detailed_description || product.productcard_messaging || '';
            const featuresList = featuresContainer.querySelector('ul');
        if (featuresList) {
            featuresList.innerHTML = '';
            if (description) {
                    // Show the full detailed description as a single feature
                    const li = document.createElement('li');
                    li.style.cssText = 'margin-bottom: 8px; line-height: 1.6;';
                    li.textContent = description;
                    featuresList.appendChild(li);
                } else {
                    const li = document.createElement('li');
                    li.textContent = 'No description available.';
                    featuresList.appendChild(li);
                }
            }
        }
        
        // Update match badge
        const matchPercentage = Math.floor(Math.random() * 10) + 85;
        const matchBadge = document.querySelector('.modal-left .match-percentage');
        if (matchBadge) {
            matchBadge.textContent = matchPercentage;
        }
        
        // Update ratings (from product data if available, otherwise use defaults)
        const ratingStars = document.querySelector('.product-rating .stars');
        const ratingText = document.querySelector('.product-rating .rating-text');
        if (ratingStars) {
            const rating = product.rating || 4.5;
            const stars = Math.round(rating);
            ratingStars.textContent = '★★★★☆'.slice(0, stars) + '☆'.repeat(5 - stars);
        }
        if (ratingText && product.reviews) {
            ratingText.textContent = `${product.rating || 4.5} (${product.reviews})`;
        }
        
        // Update colors from product data
        const colorLabel = document.querySelector('.color-selector label');
        if (colorLabel) {
            const colors = product.Colors_Available || product.colors_available || product.Colors || product.colors || 'Various colors';
            colorLabel.textContent = `Available Colors: ${colors}`;
        }
        // Hide color options tiles below image
        const colorOptions = document.querySelector('.color-options');
        if (colorOptions) {
            colorOptions.innerHTML = ''; // Clear hardcoded color tiles
        }
        
        // Update sizes from product data
        const sizeLabel = document.querySelector('.size-selector label');
        const sizeOptions = document.querySelector('.size-options');
        if (sizeLabel) {
            const sizes = product.Sizes || product.sizes || '';
            if (sizes) {
                sizeLabel.textContent = `Available Sizes: ${sizes}`;
            } else {
                sizeLabel.textContent = 'Available Sizes: Various';
            }
        }
        if (sizeOptions) {
            sizeOptions.innerHTML = '';
            // Remove hardcoded sizes
        }
        
        // Update visit vendor button
        const visitBtn = document.querySelector('.visit-vendor-btn');
        if (visitBtn) {
            visitBtn.textContent = `Visit ${brand} →`;
            visitBtn.addEventListener('click', () => {
                window.open(product.product_url || product.product_page_url || product.url || product.product_link || product.productUrl || '#', '_blank');
            });
        }
        
        // Modal is already shown above
    }

    async loadRecommendations(productId) {
        // Show loading state
        this.showRecommendationsLoading();
        
        // Load recommendations from backend
        try {
            // Find the product object from current product or productsData
            let product = this.currentProduct;
            if (!product && this.productsData) {
                product = this.productsData.find(p => {
                    const pId = p.id || p.product_id || '';
                    return String(pId) === String(productId);
                });
            }
            
            if (!product) {
                console.error('Product not found for recommendations:', productId);
                this.hideRecommendationsLoading();
                return;
            }
            
            console.log('Loading recommendations for product:', product);
            console.log('Search context:', this.currentSearchContext);
            
            const response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    product: product,
                    searchContext: this.currentSearchContext
                })
            });
            
            const data = await response.json();
            console.log('Recommendations API response:', data);
            
            if (data.recommendations && data.recommendations.length > 0) {
                console.log('Found recommendations, calling displayRecommendations');
                this.displayRecommendations(data.recommendations);
            } else {
                console.log('No recommendations found');
                this.displayNoRecommendations();
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
            this.displayNoRecommendations();
        }
    }

    showRecommendationsLoading() {
        // Recommendations section removed
        return;
    }

    hideRecommendationsLoading() {
        // Recommendations section removed
    }

    displayNoRecommendations() {
        const recommendationsGrid = document.querySelector('.recommendations-grid');
        if (recommendationsGrid) {
            recommendationsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px; font-size: 14px;">No recommendations available at this time</p>';
        }
    }

    displayRecommendations(products) {
        console.log('displayRecommendations called with:', products);
        const recommendationsGrid = document.querySelector('.recommendations-grid');
        console.log('Recommendations grid:', recommendationsGrid);
        if (!recommendationsGrid) {
            console.log('Recommendations grid not found');
            return;
        }
        
        // Clear existing recommendations
        recommendationsGrid.innerHTML = '';
        
        if (!products || products.length === 0) {
            recommendationsGrid.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">No recommendations available</p>';
            return;
        }
        
        // Display each recommendation
        console.log('Displaying', products.length, 'products');
        products.forEach((product, index) => {
            console.log(`Creating card for product ${index}:`, product);
            const productCard = document.createElement('div');
            productCard.className = 'recommended-product-card';
            productCard.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                height: 100%;
            `;
            
            const imageUrl = product.image_url || product.Image_Url || '';
            const productName = product.name || product.Category || 'Product';
            const productPrice = product.price || product.current_price || '0.00';
            const cleanPrice = this.cleanPrice(productPrice);
            
            productCard.innerHTML = `
                <div style="width: 100%; aspect-ratio: 1; overflow: hidden; border-radius: 6px; margin-bottom: 12px; background: #f1f5f9;">
                    <img src="${imageUrl}" alt="${productName}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="font-size: 13px; font-weight: 500; color: #1e293b; margin-bottom: 8px; line-height: 1.4; height: 36px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${productName}</div>
                <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; flex-grow: 1;">$${cleanPrice}</div>
                <button class="add-to-cart-recommendation" data-product-id="${product.id || product.product_id}" style="width: 100%; background: #8b5cf6; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; margin-top: auto;">Add to Cart</button>
            `;
            
            // Add hover effect
            productCard.addEventListener('mouseenter', () => {
                productCard.style.transform = 'translateY(-2px)';
                productCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            });
            
            productCard.addEventListener('mouseleave', () => {
                productCard.style.transform = '';
                productCard.style.boxShadow = '';
            });
            
            // Add button hover effect
            const addToCartBtn = productCard.querySelector('.add-to-cart-recommendation');
            addToCartBtn.addEventListener('mouseenter', () => {
                addToCartBtn.style.background = '#7c3aed';
            });
            addToCartBtn.addEventListener('mouseleave', () => {
                addToCartBtn.style.background = '#8b5cf6';
            });
            
            // Click to view product (only on non-button areas)
            productCard.addEventListener('click', (e) => {
                // Don't open modal if clicking the add to cart button
                if (!e.target.classList.contains('add-to-cart-recommendation')) {
                    const productId = product.id || product.product_id;
                    if (productId) {
                        this.openQuickView(productId);
                    }
                }
            });
            
            // Add to cart button handler
            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click
                    const productId = addToCartBtn.getAttribute('data-product-id');
                    console.log('Adding recommendation to cart:', productId);
                    this.addRecommendedToCart(product);
                });
            }
            
            recommendationsGrid.appendChild(productCard);
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
        
        // Remove highlighting from product cards
        document.querySelectorAll('.product-card').forEach(card => {
            card.classList.remove('highlighted');
        });
        
        // Clear recommendations when closing modal
        const recommendationsGrid = document.querySelector('.recommendations-grid');
        if (recommendationsGrid) {
            recommendationsGrid.innerHTML = `
                <div class="recommendations-loading" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <div style="display: inline-flex; align-items: center; gap: 8px;">
                        <div class="loading-spinner"></div>
                        <span style="color: #64748b; font-size: 14px; font-weight: 500;">AI is finding matching items<span class="loading-dots"></span></span>
                    </div>
                </div>
            `;
        }
    }

    addToCart(productId) {
        // First try to find in current products data (from search results)
        let product = null;
        if (this.productsData) {
            product = this.productsData.find(p => {
                const pId = p.id || p.product_id || '';
                return String(pId) === String(productId);
            });
        }
        
        if (!product) {
            this.showToast('Product not found');
            return;
        }
        
        // Get all available product fields from the actual data
        const rawPrice = product.price || product.current_price || product.list_price || '0.00';
        const cleanPrice = this.formatPrice(rawPrice);
        
        const cartItem = {
            id: product.id || product.product_id || Date.now().toString(),
            brand: product.brand || '',
            name: product.name || product.title || product.product_name || 'Product',
            price: cleanPrice,
            vendor: product.vendor || product.brand || product.manufacturer || 'Vendor',
            vendorUrl: product.vendorUrl || product.product_url || product.url || product.product_link || '#',
            imageColor: product.imageColor || product.color || '#d9e8ff',
            image_url: product.image_url || product.image_urls || product.imageUrl || '',
            color: product.color || product.colors || '',
            size: product.size || '',
            category: product.category || product.product_category || '',
            description: product.description || product.detailed_description || '',
            addedAt: Date.now()
        };
        
        // Check if item already exists
        const existingIndex = this.cart.findIndex(item => item.id === cartItem.id);
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

    addRecommendedToCart(product) {
        // Get all available product fields from the recommendation
        const rawPrice = product.price || product.current_price || '0.00';
        const cleanPrice = this.formatPrice(rawPrice);
        
        const cartItem = {
            id: product.id || product.product_id || Date.now().toString(),
            brand: product.brand || 'Nike',
            name: product.name || product.Category || product.description || 'Product',
            price: cleanPrice,
            vendor: product.vendor || 'nike.com',
            vendorUrl: product.product_url || product.url || '#',
            imageColor: product.imageColor || '#d9e8ff',
            image_url: product.image_url || product.Image_Url || '',
            color: product.colors || product.colors_available || '',
            size: product.sizes || '',
            category: product.category || '',
            description: product.detailed_description || product.description || '',
            addedAt: Date.now()
        };
        
        // Check if item already exists
        const existingIndex = this.cart.findIndex(item => item.id === cartItem.id);
        if (existingIndex === -1) {
            this.cart.push(cartItem);
            this.saveCart();
            this.updateCartBadge();
            this.showToast('Added to cart!');
        } else {
            this.showToast('Item already in cart');
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
        
        // Show chat input for non-cart pages
        const messageInputContainer = document.querySelector('.message-input-container');
        if (messageInputContainer && page !== 'cart') {
            messageInputContainer.style.display = 'flex';
        }
    }

    showCartPage() {
        const chatMessages = document.getElementById('chatMessages');
        const productGridContainer = document.getElementById('productGridContainer');
        const messageInputContainer = document.querySelector('.message-input-container');
        
        // Hide empty state
        document.getElementById('emptyState').style.display = 'none';
        
        // Hide chat input
        if (messageInputContainer) {
            messageInputContainer.style.display = 'none';
        }
        
        // Clear previous content
        chatMessages.style.display = 'none';
        productGridContainer.innerHTML = '';
        
        if (this.cart.length === 0) {
            productGridContainer.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; grid-column: 1 / -1;">
                    <h3 style="color: #64748b; margin-bottom: 16px;">Your cart is empty</h3>
                    <p style="color: #94a3b8;">Add items to your cart to continue shopping</p>
                </div>
            `;
            return;
        }
        
        // Calculate total
        const total = this.cart.reduce((sum, item) => sum + this.cleanPrice(item.price), 0);
        
        // Display cart view with header and list
        productGridContainer.innerHTML = `
            <div id="cartView" style="display: flex; flex-direction: column; height: 100%; position: relative;">
                <div style="flex: 1; overflow-y: auto; padding-right: 8px; padding-bottom: 20px;">
                    <div class="cart-header">
                        <div>
                            <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Session Cart</p>
                            <h2 style="font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">Shopping Cart (${this.cart.length})</h2>
                        </div>
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="selectAllCart" style="width: 18px; height: 18px;">
                            <span style="color: #475569; font-weight: 500;">Select All (${this.cart.length})</span>
                        </label>
                    </div>
                    
                    <div style="background: #fef3c7; border: 1px solid #fde047; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px; color: #92400e;">
                            <span style="font-size: 18px;">▲</span>
                            <span style="font-weight: 500;">Cart expires when browser closes</span>
                        </div>
                        <p style="color: #a16207; margin: 4px 0 0 26px; font-size: 13px;">Items saved in this session only</p>
                    </div>
                    
                    <div style="background: #dcfce7; border: 1px solid #86efac; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #166534; font-weight: 600;">${this.cart.length} items selected</span>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="styleAI.openAllCartItems()" style="background: #22c55e; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Open All (${this.cart.length} tabs)</button>
                            <button onclick="styleAI.removeSelectedItems()" style="background: #ef4444; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Remove</button>
                        </div>
                    </div>
                    
                    <div id="cartItemsList" style="display: flex; flex-direction: column; gap: 16px;"></div>
                </div>
                
                <div style="flex-shrink: 0; background: linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0f9ff 100%); padding: 24px 0; border-top: 2px solid #e2e8f0; position: sticky; bottom: 0;">
                    <p style="text-align: center; color: #64748b; margin-bottom: 16px;">
                        Total estimated: <strong style="color: #1e293b; font-size: 18px;">$${total.toFixed(2)}</strong> (from ${this.cart.length} vendor${this.cart.length > 1 ? 's' : ''})
                    </p>
                    <button onclick="styleAI.openAllCartItems()" style="width: 100%; background: #8b5cf6; color: white; padding: 16px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer;">Open All ${this.cart.length} Items in separate tabs</button>
                </div>
            </div>
        `;
        
        const cartItemsList = document.getElementById('cartItemsList');
        
        // Display cart items as list
        this.cart.forEach((item) => {
            const addedTime = this.getTimeAgo(item.addedAt);
            const itemTotal = parseFloat(item.price || 0);
            
            const cartItem = document.createElement('div');
            cartItem.style.cssText = 'border: 2px solid #8b5cf6; border-radius: 12px; padding: 16px; background: white;';
            
            const imageUrl = item.image_url || item.imageUrl || '';
            const imageColor = item.imageColor || '#d9e8ff';
            
            cartItem.innerHTML = `
                <div style="display: flex; gap: 16px; align-items: start;">
                    <input type="checkbox" class="cart-item-checkbox" style="width: 20px; height: 20px; margin-top: 4px;">
                    <div class="cart-item-image" style="width: 80px; height: 80px; min-width: 80px; border-radius: 8px; background-color: ${imageColor}; ${imageUrl ? `background-image: url(${imageUrl}); background-size: cover; background-position: center;` : ''}"></div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <div>
                                <div style="font-size: 15px; color: #475569; margin-bottom: 2px; font-weight: 500;">${item.name}</div>
                                <div style="font-size: 12px; color: #64748b;">${item.vendor || item.brand || 'Vendor'}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; font-size: 18px; color: #1e293b;">$${this.formatPrice(item.price)}</div>
                            </div>
                        </div>
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Added ${addedTime}</div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="styleAI.openCartItem('${item.vendorUrl}')" style="background: #8b5cf6; color: white; padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">Open Link →</button>
                            <button onclick="styleAI.removeFromCart('${item.id}')" style="background: #ef4444; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
                        </div>
                    </div>
                </div>
            `;
            
            cartItemsList.appendChild(cartItem);
        });
        
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllCart');
        selectAllCheckbox.addEventListener('change', (e) => {
            document.querySelectorAll('.cart-item-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }
    
    openCartItem(url) {
        if (url && url !== '#') {
            window.open(url, '_blank');
        }
    }
    
    async openAllCartItems() {
        let openedCount = 0;
        
        for (const item of this.cart) {
            if (item.vendorUrl && item.vendorUrl !== '#') {
                window.open(item.vendorUrl, '_blank');
                openedCount++;
                
                // Add a small delay between opening tabs to avoid browser blocking
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        this.showToast(`Opening ${openedCount} items in new tabs`);
    }
    
    removeSelectedItems() {
        const checkboxes = document.querySelectorAll('.cart-item-checkbox');
        let removed = 0;
        
        checkboxes.forEach((cb, index) => {
            if (cb.checked) {
                this.cart.splice(index - removed, 1);
                removed++;
            }
        });
        
        if (removed > 0) {
            this.saveCart();
            this.updateCartBadge();
            this.showCartPage();
            this.showToast(`Removed ${removed} item${removed > 1 ? 's' : ''} from cart`);
        } else {
            this.showToast('No items selected');
        }
    }

    removeFromCart(productId) {
        const index = this.cart.findIndex(item => item.id === productId);
        if (index !== -1) {
            this.cart.splice(index, 1);
            this.saveCart();
            this.updateCartBadge();
            this.showCartPage(); // Refresh cart view
            this.showToast('Removed from cart');
        }
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
        const messageInputContainer = document.querySelector('.message-input-container');
        if (messageInputContainer) {
            messageInputContainer.style.display = 'flex';
        }
        // Don't clear the current session's content - just enable chat
    }

    applyFilter(filter) {
        // Refine existing search results
        if (!this.productsData || this.productsData.length === 0) {
            this.showToast('No search results to refine. Please search first.');
            return;
        }
        
        // Create filter text mapping
        const filterTexts = {
            'under-50': 'Under $50',
            'premium': 'Premium Brands',
            'sale': 'Sale Items',
            'sustainable': 'Sustainable'
        };
        
        const filterText = filterTexts[filter] || filter;
        
        // Store active filters if not already stored
        if (!this.activeFilters) {
            this.activeFilters = [];
        }
        this.activeFilters.push(filter);
        
        // Add filter chip
        const filterChips = document.querySelector('.filter-chips');
        if (filterChips) {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.setAttribute('data-filter', filter);
            chip.innerHTML = `
                ${filterText}
                <button class="remove-filter">×</button>
            `;
            
            // Event handling is done via event delegation in init
            filterChips.appendChild(chip);
        }
        
        // Apply the filter
        this.applyActiveFilters();
    }
    
    applyActiveFilters() {
        console.log('applyActiveFilters called, activeFilters:', this.activeFilters);
        // Use original products data, not the current filtered productsData
        const sourceProducts = this.originalProductsData || this.productsData;
        if (!sourceProducts) {
            console.log('No products data available');
            return;
        }
        
        let filteredProducts = [...sourceProducts];
        console.log('Starting with', filteredProducts.length, 'products');
        
        // Apply all active filters if any
        if (this.activeFilters.length > 0) {
            for (const filter of this.activeFilters) {
                if (filter === 'under-50') {
                    filteredProducts = filteredProducts.filter(p => {
                        const price = this.cleanPrice(p.price || p.current_price);
                        return price < 50;
                    });
                } else if (filter === 'premium') {
                    filteredProducts = filteredProducts.filter(p => {
                        const price = this.cleanPrice(p.price || p.current_price);
                        return price >= 100;
                    });
                } else if (filter === 'sale') {
                    filteredProducts = filteredProducts.filter(p => {
                        const listPrice = this.cleanPrice(p.list_price || p.list_price);
                        const currentPrice = this.cleanPrice(p.price || p.current_price);
                        return listPrice > currentPrice;
                    });
                }
            }
        }
        
        console.log('After filtering:', filteredProducts.length, 'products');
        
        // Always display products (filtered or all)
        if (filteredProducts.length > 0) {
            this.displayProducts(filteredProducts);
            if (this.activeFilters.length > 0) {
                this.showToast(`Showing ${filteredProducts.length} results`);
            }
        } else {
            this.showToast('No products match the filters');
        }
    }

    async performSearch(query) {
        // Set the search text in the input field and trigger search
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = query;
            // Trigger the sendMessage method to perform the search
            await this.sendMessage();
        }
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
        
        // Create session if this is the first search
        if (!this.currentSessionId) {
            const newSession = {
                id: Date.now().toString(),
                title: message.length > 30 ? message.substring(0, 30) + '...' : message,
                timestamp: Date.now(),
                conversationHistory: [],
                products: [],
                searchContext: null
            };
            this.searchSessions.push(newSession);
            this.currentSessionId = newSession.id;
            this.updateSearchSessions();
        }
        
        // Hide empty state and show chat messages
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'flex';
        document.getElementById('chatMessages').style.flexDirection = 'column';
        
        // Clear filter chips for new search
        const filterChips = document.querySelector('.filter-chips');
        if (filterChips) {
            filterChips.innerHTML = '';
        }
        this.activeFilters = [];
        this.originalProductsData = null; // Reset original products for new search
        
        const chatMessages = document.getElementById('chatMessages');
        
        // Add user message to chat
        const userMessage = document.createElement('div');
        userMessage.className = 'user-message';
        userMessage.textContent = message;
        chatMessages.appendChild(userMessage);
        
        // Add user message to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Clear input
        input.value = '';
        
        // Show loading
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'ai-message';
        loadingMessage.innerHTML = '<div class="loading-spinner-inline"></div> Searching...';
        chatMessages.appendChild(loadingMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // Send message to backend with conversation history
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: message,
                    conversationHistory: this.conversationHistory
                })
            });
            
            const data = await response.json();
            console.log('Server response:', data);
            console.log('Products count:', data.products ? data.products.length : 0);
            
            // Remove loading message
            loadingMessage.remove();
            
            // Add AI response
            const aiResponse = document.createElement('div');
            aiResponse.className = 'ai-message';
            aiResponse.textContent = data.message || `I found results for "${message}"! Here are the top picks:`;
            chatMessages.appendChild(aiResponse);
            
            // Add AI response to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: data.message || `I found results for "${message}"! Here are the top picks:`
            });
            
            // Limit conversation history to last 20 messages to avoid context window issues
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
            
            // Store search context for recommendations
            this.currentSearchContext = {
                userMessage: message,
                filtersApplied: {} // Can be extended with filters later
            };
            
            // Extract price constraints from user message if any
            const priceMatch = message.match(/(?:under|below|less than|<)\s*\$?(\d+)/i);
            if (priceMatch) {
                this.currentSearchContext.filtersApplied.max_price = parseFloat(priceMatch[1]);
            }
            
            const minPriceMatch = message.match(/(?:above|over|more than|>)\s*\$?(\d+)/i);
            if (minPriceMatch) {
                this.currentSearchContext.filtersApplied.min_price = parseFloat(minPriceMatch[1]);
            }
            
            // Load products if available
            console.log('Checking products...');
            if (data.products && data.products.length > 0) {
                console.log('Displaying products from server');
                this.displayProducts(data.products);
            } else {
                console.log('No products in response');
            }
            
            // Update header with search title
            document.querySelector('.search-title').textContent = message;
            
            // Update session with title and save
            if (this.currentSessionId) {
                const session = this.searchSessions.find(s => s.id === this.currentSessionId);
                if (session) {
                    // Set title from first search if not set
                    if (session.title === 'New Search') {
                        session.title = message.length > 30 ? message.substring(0, 30) + '...' : message;
                    }
                    this.saveCurrentSession();
                    this.updateSearchSessions();
                }
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            loadingMessage.remove();
            
            const errorMessage = document.createElement('div');
            errorMessage.className = 'ai-message';
            const errorText = `<p>I encountered an error. Please try again.</p>`;
            errorMessage.innerHTML = errorText;
            chatMessages.appendChild(errorMessage);
            
            // Add error message to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: errorText
            });
            
            // Limit conversation history to last 20 messages
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
        }
        

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    startNewSearch() {
        // Create new session
        const newSession = {
            id: Date.now().toString(),
            title: 'New Search',
            timestamp: Date.now(),
            conversationHistory: [],
            products: [],
            searchContext: null
        };
        
        this.searchSessions.push(newSession);
        this.currentSessionId = newSession.id;
        this.conversationHistory = [];
        this.currentSearchContext = null;
        this.productsData = null;
        
        // Clear UI
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('chatMessages').style.display = 'none';
        document.getElementById('chatMessages').innerHTML = '';
        document.getElementById('productGridContainer').innerHTML = '';
        
        // Update sessions display
        this.updateSearchSessions();
        
        // Focus input
        document.getElementById('messageInput').focus();
        this.showToast('New search session started');
    }

    loadSessions() {
        try {
            const sessions = localStorage.getItem('styleai_search_sessions');
            return sessions ? JSON.parse(sessions) : [];
        } catch (error) {
            console.error('Error loading sessions:', error);
            return [];
        }
    }

    saveSessions() {
        try {
            localStorage.setItem('styleai_search_sessions', JSON.stringify(this.searchSessions));
        } catch (error) {
            console.error('Error saving sessions:', error);
        }
    }

    updateSearchSessions() {
        const sessionContainer = document.querySelector('.search-history');
        if (!sessionContainer) return;
        
        sessionContainer.innerHTML = '';
        
        // Display last 5 sessions
        const displaySessions = this.searchSessions.slice(-5).reverse();
        
        displaySessions.forEach((session, index) => {
            const sessionItem = document.createElement('div');
            sessionItem.className = `search-item ${session.id === this.currentSessionId ? 'active' : ''}`;
            sessionItem.dataset.sessionId = session.id;
            
            const title = session.title || 'New Search';
            const timeAgo = this.getTimeAgo(session.timestamp);
            
            sessionItem.innerHTML = `
                <div class="search-info" style="flex: 1;">
                    <div class="search-title">${title.length > 15 ? title.substring(0, 15) + '...' : title}</div>
                    <div class="search-meta">${timeAgo}</div>
                </div>
                <button class="delete-session-btn" data-session-id="${session.id}" style="background: transparent; border: none; color: #64748b; font-size: 16px; padding: 4px 8px; cursor: pointer; border-radius: 4px;" onmouseover="this.style.background='#ef4444'; this.style.color='white';" onmouseout="this.style.background='transparent'; this.style.color='#64748b';">×</button>
            `;
            
            sessionItem.addEventListener('click', (e) => {
                // Don't switch if clicking the delete button
                if (!e.target.classList.contains('delete-session-btn')) {
                    this.switchSession(session.id);
                }
            });
            
            // Add delete button event listener
            const deleteBtn = sessionItem.querySelector('.delete-session-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSession(session.id);
            });
            
            sessionContainer.appendChild(sessionItem);
        });
    }

    switchSession(sessionId) {
        const session = this.searchSessions.find(s => s.id === sessionId);
        if (!session) return;
        
        this.currentSessionId = sessionId;
        this.conversationHistory = session.conversationHistory || [];
        this.currentSearchContext = session.searchContext;
        this.productsData = session.products || null;
        
        // Show chat input
        const messageInputContainer = document.querySelector('.message-input-container');
        if (messageInputContainer) {
            messageInputContainer.style.display = 'flex';
        }
        
        // Clear product grid
        document.getElementById('productGridContainer').innerHTML = '';
        
        // Restore UI
        if (session.products && session.products.length > 0) {
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('chatMessages').style.display = 'flex';
            this.displayProducts(session.products);
        } else {
            document.getElementById('emptyState').style.display = 'flex';
            document.getElementById('chatMessages').style.display = 'none';
        }
        
        // Update header if there's a search
        if (session.title && session.title !== 'New Search') {
            const searchTitleEl = document.querySelector('.search-title');
            if (searchTitleEl) {
                searchTitleEl.textContent = session.title;
            }
        }
        
        this.updateSearchSessions();
    }

    saveCurrentSession() {
        if (!this.currentSessionId) return;
        
        const session = this.searchSessions.find(s => s.id === this.currentSessionId);
        if (session) {
            session.conversationHistory = this.conversationHistory;
            session.searchContext = this.currentSearchContext;
            session.products = this.productsData;
            this.saveSessions();
        }
    }

    deleteSession(sessionId) {
        if (confirm('Are you sure you want to delete this session?')) {
            // Remove from array
            this.searchSessions = this.searchSessions.filter(s => s.id !== sessionId);
            this.saveSessions();
            
            // If we deleted the current session, switch to another one or clear
            if (this.currentSessionId === sessionId) {
                if (this.searchSessions.length > 0) {
                    // Switch to the last session
                    this.switchSession(this.searchSessions[this.searchSessions.length - 1].id);
                } else {
                    // No sessions left, clear everything
                    this.currentSessionId = null;
                    this.conversationHistory = [];
                    this.currentSearchContext = null;
                    this.productsData = null;
                    
                    document.getElementById('emptyState').style.display = 'flex';
                    document.getElementById('chatMessages').style.display = 'none';
                    document.getElementById('chatMessages').innerHTML = '';
                    document.getElementById('productGridContainer').innerHTML = '';
                }
            }
            
            this.updateSearchSessions();
            this.showToast('Session deleted');
        }
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