
// API Configuration
const API_BASE_URL = 'https://shoestoreproject.vercel.app/api';

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});

// ====== CART FUNCTIONALITY ======
let cart = JSON.parse(localStorage.getItem('shoeStoreCart') || '[]');

function addToCart(product) {
    // Check if product already in cart
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
        showNotification(`${product.name} quantity updated! 🛒`);
    } else {
        cart.push({
            id: product.id || Date.now(),
            name: product.name,
            price: product.price,
            image: product.image || product.imageUrl,
            quantity: 1
        });
        showNotification(`${product.name} added to cart! 🛒`);
    }
    
    saveCart();
    updateCartDisplay();
    updateCartCount();
}

function saveCart() {
    localStorage.setItem('shoeStoreCart', JSON.stringify(cart));
}

function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalDiv = document.getElementById('cartTotal');
    
    if (!cartItemsDiv) return;
    
    if (cart.length === 0) {
        cartItemsDiv.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: #666;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>Your cart is empty</p>
            </div>
        `;
        if (cartTotalDiv) cartTotalDiv.textContent = '$0.00';
        return;
    }
    
    cartItemsDiv.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image || 'images/placeholder.jpg'}" alt="${item.name}" class="cart-item-image" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%234a7c59%22 width=%22100%22 height=%22100%22/%3E%3Ctext fill=%22%23fff%22 font-size=%2212%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22%3EShoe%3C/text%3E%3C/svg%3E'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                <div class="cart-item-quantity">
                    <button class="qty-btn" onclick="updateCartQuantity(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity(${index}, 1)">+</button>
                </div>
            </div>
            <button class="remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotalDiv) cartTotalDiv.textContent = '$' + total.toFixed(2);
}

function updateCartQuantity(index, change) {
    cart[index].quantity += change;
    
    if (cart[index].quantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    saveCart();
    updateCartDisplay();
    updateCartCount();
}

function removeFromCart(index) {
    const removedItem = cart[index];
    cart.splice(index, 1);
    showNotification(`${removedItem.name} removed from cart! ❌`);
    saveCart();
    updateCartDisplay();
    updateCartCount();
}

function clearCart() {
    if (cart.length === 0) {
        showNotification('Cart is already empty! 🛒');
        return;
    }
    
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        showNotification('Cart cleared! 🗑️');
        saveCart();
        updateCartDisplay();
        updateCartCount();
    }
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        cartCountElement.textContent = count;
    }
}

function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    if (cartSidebar) {
        cartSidebar.classList.toggle('active');
    }
}

function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    window.location.href = 'checkout.html';
}

// ====== LOAD PRODUCTS FROM BACKEND ======
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const result = await response.json();
        
        if (result.success && result.data) {
            displayFeaturedProducts(result.data);
            displayShopProducts(result.data);
        } else {
            console.error('Failed to load products');
            showProductLoadError();
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showProductLoadError();
    }
}

function displayFeaturedProducts(products) {
    const featuredGrid = document.getElementById('featuredProducts');
    if (!featuredGrid) return;
    
    // Show first 6 products as featured
    const featured = products.slice(0, 6);
    
    if (featured.length === 0) {
        featuredGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-box-open"></i>
                <p>No products available yet</p>
            </div>
        `;
        return;
    }
    
    featuredGrid.innerHTML = featured.map(product => createProductCard(product)).join('');
}

function displayShopProducts(products) {
    const shopGrid = document.getElementById('shopProducts');
    if (!shopGrid) return;
    
    if (products.length === 0) {
        shopGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-box-open"></i>
                <p>No products available yet</p>
            </div>
        `;
        return;
    }
    
    shopGrid.innerHTML = products.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    // Handle image URL - THIS IS WHERE IMAGES ARE EMBEDDED
    const imageUrl = product.imageUrl || product.image || '';
    const imageElement = imageUrl 
        ? `<img src="${API_BASE_URL.replace('/api', '')}${imageUrl}" 
               alt="${product.name}" 
               class="product-image"
               onerror="this.parentElement.innerHTML='<div class=\\'product-image-placeholder\\'><i class=\\'fas fa-shoe-prints\\'></i><p>Image not available</p></div>'">`
        : `<div class="product-image-placeholder">
               <i class="fas fa-shoe-prints"></i>
               <p>Upload product image</p>
           </div>`;
    
    return `
        <div class="product-item fade-in" data-category="${product.category || 'all'}">
            ${imageElement}
            <div class="product-info">
                <div class="product-category">${product.category || 'General'}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description || 'No description available'}</p>
                <div class="product-footer">
                    <span class="product-price">$${parseFloat(product.price || 0).toFixed(2)}</span>
                    <button class="add-to-cart-btn" onclick='addToCart(${JSON.stringify({
                        id: product._id,
                        name: product.name,
                        price: product.price,
                        image: imageUrl
                    })})'>
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showProductLoadError() {
    const featuredGrid = document.getElementById('featuredProducts');
    const shopGrid = document.getElementById('shopProducts');
    
    const errorHTML = `
        <div class="loading-spinner">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Unable to load products. Please check your connection.</p>
        </div>
    `;
    
    if (featuredGrid) featuredGrid.innerHTML = errorHTML;
    if (shopGrid) shopGrid.innerHTML = errorHTML;
}

// ====== FILTER FUNCTIONALITY ======
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Get filter value
            const filter = this.dataset.filter;
            
            // Filter products
            const products = document.querySelectorAll('.product-item');
            products.forEach(product => {
                const category = product.dataset.category;
                if (filter === 'all' || category === filter) {
                    product.style.display = 'flex';
                } else {
                    product.style.display = 'none';
                }
            });
        });
    });
}

// ====== NOTIFICATIONS ======
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #4a7c59, #90EE90);
        color: white;
        padding: 1rem 2rem;
        border-radius: 25px;
        font-weight: bold;
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        max-width: 300px;
    `;
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ====== FORM SUBMISSION ======
function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    showNotification(`Thank you ${name}! Your message has been sent. 📧`);
    e.target.reset();
}

// ====== MOBILE MENU ======
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        if (navMenu.style.display === 'flex') {
            navMenu.style.display = 'none';
        } else {
            navMenu.style.display = 'flex';
            navMenu.style.flexDirection = 'column';
            navMenu.style.position = 'absolute';
            navMenu.style.top = '100%';
            navMenu.style.left = '0';
            navMenu.style.right = '0';
            navMenu.style.background = 'rgba(45, 80, 22, 0.98)';
            navMenu.style.padding = '1rem';
        }
    }
}

// ====== HEADER SCROLL EFFECT ======
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (header) {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(45, 80, 22, 0.98)';
            header.style.boxShadow = '0 5px 20px rgba(0,0,0,0.2)';
        } else {
            header.style.background = 'rgba(45, 80, 22, 0.95)';
        }
    }
});

// ====== INITIALIZE PAGE ======
document.addEventListener('DOMContentLoaded', () => {
    // Load products from backend
    loadProducts();
    
    // Update cart count
    updateCartCount();
    
    // Update cart display if on page
    updateCartDisplay();
    
    // Setup filter buttons
    setupFilters();
    
    // Add entrance animation to hero
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.classList.add('visible');
        }
    }, 500);
    
    // Re-observe fade-in elements after product load
    setTimeout(() => {
        document.querySelectorAll('.fade-in:not(.visible)').forEach(el => {
            observer.observe(el);
        });
    }, 1000);
});

// ====== UTILITY FUNCTIONS ======
function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
}

// ====== EXPORT FOR USE IN OTHER SCRIPTS ======
window.shoeStore = {
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    updateCartCount,
    toggleCart,
    checkout,
    cart: () => [...cart]
};