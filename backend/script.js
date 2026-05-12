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

// Cart functionality
let cart = [];

function addToCart(name, price) {
    cart.push({ name, price, quantity: 1 });
    showNotification(`${name} added to cart! 🛒`);
    updateCartDisplay();
    saveCartToLocalStorage();
}

function updateCartDisplay() {
    const cartCount = cart.length;
    console.log(`Cart has ${cartCount} items`);
    console.log('Cart Total: $' + getCartTotal());
}

function saveCartToLocalStorage() {
    localStorage.setItem('shoeStoreCart', JSON.stringify(cart));
}

function loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('shoeStoreCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #90EE90;
        color: #2d5016;
        padding: 1rem 2rem;
        border-radius: 25px;
        font-weight: bold;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Form submission with API
async function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactData)
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`Thank you ${contactData.name}! Your message has been sent. 📧`);
            e.target.reset();
        } else {
            showNotification('Failed to send message. Please try again. ❌');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to send message. Please try again. ❌');
    }
}

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            console.log('Products loaded:', result.data);
            // You can dynamically render products here if needed
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Create order
async function createOrder(orderData) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Order placed successfully! 🎉');
            clearCart();
            return result.data;
        } else {
            showNotification('Failed to place order. Please try again. ❌');
            return null;
        }
    } catch (error) {
        console.error('Error creating order:', error);
        showNotification('Failed to place order. Please try again. ❌');
        return null;
    }
}

// Checkout function
async function checkout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty! 🛒');
        return;
    }

    const customerName = prompt('Enter your name:');
    const customerEmail = prompt('Enter your email:');

    if (!customerName || !customerEmail) {
        showNotification('Please provide your name and email! ℹ️');
        return;
    }

    const orderData = {
        customerName,
        customerEmail,
        products: cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        totalAmount: parseFloat(getCartTotal())
    };

    await createOrder(orderData);
}

// Mobile menu toggle
const mobileMenu = document.querySelector('.mobile-menu');
const navMenu = document.querySelector('.nav-menu');

if (mobileMenu && navMenu) {
    mobileMenu.addEventListener('click', () => {
        navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
    });
}

// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(45, 80, 22, 0.98)';
    } else {
        header.style.background = 'rgba(45, 80, 22, 0.95)';
    }
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Add entrance animation to hero
    setTimeout(() => {
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.classList.add('visible');
        }
    }, 500);

    // Load cart from localStorage
    loadCartFromLocalStorage();

    // Load products from API
    loadProducts();
});

// Additional utility functions
function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
}

function clearCart() {
    cart = [];
    showNotification('Cart cleared! 🗑️');
    updateCartDisplay();
    saveCartToLocalStorage();
}

function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        const removedItem = cart.splice(index, 1)[0];
        showNotification(`${removedItem.name} removed from cart! ❌`);
        updateCartDisplay();
        saveCartToLocalStorage();
    }
}

// Export functions for potential use in other scripts
window.shoeStore = {
    addToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    checkout,
    cart: () => [...cart]
};