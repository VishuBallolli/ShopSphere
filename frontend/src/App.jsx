import { useEffect, useState } from 'react'
import './App.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const orderStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
const fallbackProductImage = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
    <rect width="600" height="450" fill="#f3d8ca"/>
    <circle cx="300" cy="175" r="92" fill="#f4c95d"/>
    <path d="M0 350 C150 290 230 380 355 320 C455 272 520 310 600 275 V450 H0 Z" fill="#236b68"/>
    <text x="300" y="405" text-anchor="middle" fill="#fffaf1" font-family="Georgia, serif" font-size="28">ShopSphere</text>
  </svg>
`)}`

function ProductImage({ product }) {
  const imageUrl = typeof product.image_url === 'string' ? product.image_url.trim() : ''
  const [imageSource, setImageSource] = useState(imageUrl || fallbackProductImage)

  return (
    <div className="product-image">
      <img
        src={imageSource}
        alt={product.name}
        onError={() => setImageSource(fallbackProductImage)}
      />
    </div>
  )
}

function App() {
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [authMessage, setAuthMessage] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addingProductId, setAddingProductId] = useState(null)
  const [cartMessage, setCartMessage] = useState({ type: '', text: '' })
  const [cartItems, setCartItems] = useState([])
  const [cartTotal, setCartTotal] = useState(0)
  const [isCartLoading, setIsCartLoading] = useState(false)
  const [cartError, setCartError] = useState('')
  const [updatingCartItemId, setUpdatingCartItemId] = useState(null)
  const [removingCartItemId, setRemovingCartItemId] = useState(null)
  const [isClearingCart, setIsClearingCart] = useState(false)
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState({ type: '', text: '' })
  const [orders, setOrders] = useState([])
  const [isOrdersLoading, setIsOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isOrderDetailsLoading, setIsOrderDetailsLoading] = useState(false)
  const [orderDetailsError, setOrderDetailsError] = useState('')
  const [pendingOrderStatuses, setPendingOrderStatuses] = useState({})
  const [updatingOrderStatusId, setUpdatingOrderStatusId] = useState(null)
  const [adminOrderMessage, setAdminOrderMessage] = useState({ type: '', text: '' })
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('shopsphere_token'))
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('shopsphere_user')

    try {
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  const clearAuthentication = (message = '') => {
    localStorage.removeItem('shopsphere_token')
    localStorage.removeItem('shopsphere_user')
    setAuthToken(null)
    setCurrentUser(null)
    if (message) {
      setAuthMessage({ type: 'error', text: message })
    }
  }

  const loadCart = async (token) => {
    setIsCartLoading(true)
    setCartError('')

    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(data.error || 'Unable to load your cart right now.')
      }

      setCartItems(Array.isArray(data.items) ? data.items : [])
      setCartTotal(Number(data.total) || 0)
    } catch (requestError) {
      setCartError(requestError.message || 'Unable to load your cart right now.')
    } finally {
      setIsCartLoading(false)
    }
  }

  useEffect(() => {
    if (!authToken) {
      setCartItems([])
      setCartTotal(0)
      setCartError('')
      setIsCartLoading(false)
      return
    }

    loadCart(authToken)
  }, [authToken])

  const loadOrders = async (token) => {
    setIsOrdersLoading(true)
    setOrdersError('')

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthentication('Your session has expired. Please login again.')
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(data.error || 'Unable to load your orders right now.')
      }

      setOrders(Array.isArray(data) ? data : data.orders || [])
    } catch (requestError) {
      setOrdersError(requestError.message || 'Unable to load your orders right now.')
    } finally {
      setIsOrdersLoading(false)
    }
  }

  useEffect(() => {
    if (!authToken) {
      setOrders([])
      setOrdersError('')
      setSelectedOrder(null)
      return
    }

    loadOrders(authToken)
  }, [authToken])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/products')

        if (!response.ok) {
          throw new Error('Unable to load products.')
        }

        const data = await response.json()
        setProducts(Array.isArray(data) ? data : data.products || [])
      } catch (requestError) {
        setError(requestError.message || 'Unable to load products right now.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleAuthNavigation = (mode) => {
    setAuthMode(mode)
    setAuthMessage({ type: '', text: '' })
    document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleAuthChange = (event) => {
    const { name, value } = event.target
    setAuthForm((form) => ({ ...form, [name]: value }))
  }

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    const { name, email, password, confirmPassword } = authForm
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (authMode === 'register' && !trimmedName) {
      setAuthMessage({ type: 'error', text: 'Please enter your name.' })
      return
    }

    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      setAuthMessage({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }

    if (!password) {
      setAuthMessage({ type: 'error', text: 'Please enter your password.' })
      return
    }

    if (authMode === 'register' && password.length < 6) {
      setAuthMessage({ type: 'error', text: 'Your password must be at least 6 characters.' })
      return
    }

    if (authMode === 'register' && password !== confirmPassword) {
      setAuthMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setIsSubmitting(true)
    setAuthMessage({ type: '', text: '' })

    try {
      const endpoint = authMode === 'register' ? 'register' : 'login'
      const body = authMode === 'register'
        ? { name: trimmedName, email: trimmedEmail, password }
        : { email: trimmedEmail, password }
      const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('This email is already registered. Please log in instead.')
        }

        if (response.status === 400) {
          throw new Error(data.error || 'Please check your information and try again.')
        }

        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      if (authMode === 'register') {
        setAuthMode('login')
        setAuthForm({ name: '', email: trimmedEmail, password: '', confirmPassword: '' })
        setAuthMessage({ type: 'success', text: 'Registration successful. Please log in.' })
      } else {
        if (!data.token) {
          throw new Error('Login response did not include a valid session token.')
        }

        localStorage.setItem('shopsphere_token', data.token)
        if (data.user) {
          localStorage.setItem('shopsphere_user', JSON.stringify(data.user))
        } else {
          localStorage.removeItem('shopsphere_user')
        }
        setAuthToken(data.token)
        setCurrentUser(data.user || null)
        setAuthForm({ name: '', email: '', password: '', confirmPassword: '' })
        setAuthMessage({ type: 'success', text: 'You are now logged in.' })
      }
    } catch (requestError) {
      setAuthMessage({ type: 'error', text: requestError.message || 'Unable to complete that request.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    clearAuthentication()
    setAuthMode('login')
    setAuthMessage({ type: 'success', text: 'You have been logged out.' })
  }

  const handleAddToCart = async (product) => {
    const token = localStorage.getItem('shopsphere_token')

    if (!token) {
      setCartMessage({ type: 'error', text: 'Please login to add products to your cart.' })
      return
    }

    setAddingProductId(product.id)
    setCartMessage({ type: '', text: '' })

    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please login again.')
        }

        if (response.status === 400) {
          throw new Error(data.error || 'Please check the product and try again.')
        }

        if (response.status === 404) {
          throw new Error('This product could not be found.')
        }

        throw new Error(data.error || 'Unable to add this product to your cart.')
      }

      setCartMessage({ type: 'success', text: `${product.name} added to cart.` })
      loadCart(token)
    } catch (requestError) {
      setCartMessage({ type: 'error', text: requestError.message || 'Unable to add this product to your cart.' })
    } finally {
      setAddingProductId(null)
    }
  }

  const handleQuantityChange = async (item, change) => {
    if (updatingCartItemId === item.id || removingCartItemId === item.id) {
      return
    }

    const newQuantity = item.quantity + change
    if (newQuantity < 1) {
      return
    }

    const token = localStorage.getItem('shopsphere_token')
    if (!token) {
      setCartError('Your session has expired. Please login again.')
      return
    }

    setUpdatingCartItemId(item.id)
    setCartError('')

    try {
      const response = await fetch(`http://localhost:5000/api/cart/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: newQuantity }),
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(data.error || 'Unable to update this cart item.')
      }

      const nextItems = cartItems.map((cartItem) => (
        cartItem.id === item.id ? data : cartItem
      ))
      setCartItems(nextItems)
      setCartTotal(nextItems.reduce((total, cartItem) => total + Number(cartItem.subtotal), 0))
    } catch (requestError) {
      setCartError(requestError.message || 'Unable to update this cart item.')
    } finally {
      setUpdatingCartItemId(null)
    }
  }

  const handleRemoveCartItem = async (item) => {
    if (removingCartItemId === item.id || updatingCartItemId === item.id) {
      return
    }

    const token = localStorage.getItem('shopsphere_token')
    if (!token) {
      setCartError('Your session has expired. Please login again.')
      return
    }

    setRemovingCartItemId(item.id)
    setCartError('')

    try {
      const response = await fetch(`http://localhost:5000/api/cart/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(data.error || 'Unable to remove this cart item.')
      }

      const nextItems = cartItems.filter((cartItem) => cartItem.id !== item.id)
      setCartItems(nextItems)
      setCartTotal(nextItems.reduce((total, cartItem) => total + Number(cartItem.subtotal), 0))
    } catch (requestError) {
      setCartError(requestError.message || 'Unable to remove this cart item.')
    } finally {
      setRemovingCartItemId(null)
    }
  }

  const handleClearCart = async () => {
    if (isClearingCart || cartItems.length === 0) {
      return
    }

    const token = localStorage.getItem('shopsphere_token')
    if (!token) {
      setCartError('Your session has expired. Please login again.')
      return
    }

    setIsClearingCart(true)
    setCartError('')

    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(data.error || 'Unable to clear your cart.')
      }

      setCartItems([])
      setCartTotal(0)
    } catch (requestError) {
      setCartError(requestError.message || 'Unable to clear your cart.')
    } finally {
      setIsClearingCart(false)
    }
  }

  const handleCheckout = async () => {
    if (isCheckoutSubmitting || cartItems.length === 0) {
      return
    }

    const token = localStorage.getItem('shopsphere_token')
    if (!token) {
      setCheckoutMessage({ type: 'error', text: 'Please login to checkout.' })
      return
    }

    setIsCheckoutSubmitting(true)
    setCheckoutMessage({ type: '', text: '' })

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthentication('Your session has expired. Please login again.')
          throw new Error('Your session has expired. Please login again.')
        }

        if (response.status === 409) {
          throw new Error(data.error || 'Some products no longer have enough stock.')
        }

        if (response.status === 400) {
          throw new Error(data.error || 'This cart cannot be checked out right now.')
        }

        throw new Error(data.error || 'Unable to complete checkout right now.')
      }

      const orderId = data.order?.id || data.id
      setCheckoutMessage({
        type: 'success',
        text: orderId ? `Order #${orderId} placed successfully.` : 'Order placed successfully.',
      })
      await loadCart(token)
      await loadOrders(token)
    } catch (requestError) {
      setCheckoutMessage({ type: 'error', text: requestError.message || 'Unable to complete checkout right now.' })
    } finally {
      setIsCheckoutSubmitting(false)
    }
  }

  const handleViewOrderDetails = async (orderId) => {
    const token = localStorage.getItem('shopsphere_token')
    if (!token) {
      clearAuthentication('Your session has expired. Please login again.')
      return
    }

    setIsOrderDetailsLoading(true)
    setOrderDetailsError('')

    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthentication('Your session has expired. Please login again.')
          throw new Error('Your session has expired. Please login again.')
        }

        throw new Error(data.error || 'Unable to load order details.')
      }

      setSelectedOrder(data)
    } catch (requestError) {
      setOrderDetailsError(requestError.message || 'Unable to load order details.')
    } finally {
      setIsOrderDetailsLoading(false)
    }
  }

  const handleUpdateOrderStatus = async (order) => {
    const token = localStorage.getItem('shopsphere_token')
    if (!token) {
      clearAuthentication('Your session has expired. Please login again.')
      return
    }

    const status = pendingOrderStatuses[order.id] || order.status
    setUpdatingOrderStatusId(order.id)
    setAdminOrderMessage({ type: '', text: '' })

    try {
      const response = await fetch(`http://localhost:5000/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      const responseText = await response.text()
      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthentication('Your session has expired. Please login again.')
          throw new Error('Your session has expired. Please login again.')
        }

        if (response.status === 403) {
          throw new Error('Admin access required.')
        }

        if (response.status === 400) {
          throw new Error(data.error || 'Please choose a valid order status.')
        }

        if (response.status === 404) {
          throw new Error('This order could not be found.')
        }

        throw new Error(data.error || 'Unable to update the order status.')
      }

      const updatedOrder = data.order || data
      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        currentOrder.id === order.id ? updatedOrder : currentOrder
      )))
      if (selectedOrder?.order?.id === order.id) {
        setSelectedOrder(data)
      }
      setPendingOrderStatuses((statuses) => {
        const nextStatuses = { ...statuses }
        delete nextStatuses[order.id]
        return nextStatuses
      })
      setAdminOrderMessage({ type: 'success', text: `Order #${order.id} status updated.` })
    } catch (requestError) {
      setAdminOrderMessage({ type: 'error', text: requestError.message || 'Unable to update the order status.' })
    } finally {
      setUpdatingOrderStatusId(null)
    }
  }

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredProducts = products.filter((product) => (
    product.name.toLowerCase().includes(normalizedSearchTerm)
  ))
  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="ShopSphere home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>ShopSphere</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a className="active" href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#cart">Cart</a>
          {authToken ? (
            <>
              <button type="button" className="nav-link-button" onClick={() => scrollToSection('orders')}>
                {isAdmin ? 'Admin Orders' : 'My Orders'}
              </button>
              <span className="logged-in-user">{currentUser?.name || currentUser?.email || 'Account'}</span>
              <button type="button" className="logout-button" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button type="button" className="nav-link-button" onClick={() => handleAuthNavigation('login')}>Login</button>
              <button type="button" className="nav-register nav-link-button" onClick={() => handleAuthNavigation('register')}>Register</button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <p className="eyebrow">Your everyday marketplace</p>
            <h1>Welcome to <span>ShopSphere</span></h1>
            <p className="hero-description">
              Discover useful products, trusted sellers, and a shopping experience
              designed to keep everything simple.
            </p>
            <a className="primary-button" href="#products">Shop Now <span aria-hidden="true">&#8594;</span></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-sun"></div>
            <div className="art-circle art-circle-one"></div>
            <div className="art-circle art-circle-two"></div>
            <div className="art-card">
              <span className="art-card-label">SHOP</span>
              <strong>Find your<br />next favorite.</strong>
              <span className="art-card-arrow">&#8599;</span>
            </div>
          </div>
        </section>

        <section className="auth-section" id="auth">
          <div className="auth-intro">
            <p className="eyebrow">Shop with confidence</p>
            <h2>{authMode === 'login' ? 'Welcome back.' : 'Join ShopSphere.'}</h2>
            <p>{authMode === 'login' ? 'Log in to continue your shopping journey.' : 'Create an account to get started.'}</p>
          </div>
          <div className="auth-panel">
            <div className="auth-switch" role="tablist" aria-label="Authentication mode">
              <button type="button" className={authMode === 'login' ? 'selected' : ''} onClick={() => handleAuthNavigation('login')}>Login</button>
              <button type="button" className={authMode === 'register' ? 'selected' : ''} onClick={() => handleAuthNavigation('register')}>Register</button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <label>
                  Name
                  <input name="name" type="text" value={authForm.name} onChange={handleAuthChange} autoComplete="name" required />
                </label>
              )}
              <label>
                Email
                <input name="email" type="email" value={authForm.email} onChange={handleAuthChange} autoComplete="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" value={authForm.password} onChange={handleAuthChange} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required />
              </label>
              {authMode === 'register' && (
                <label>
                  Confirm password
                  <input name="confirmPassword" type="password" value={authForm.confirmPassword} onChange={handleAuthChange} autoComplete="new-password" required />
                </label>
              )}
              <button className="auth-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait...' : authMode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>
            {authMessage.text && <p className={`auth-message ${authMessage.type}`}>{authMessage.text}</p>}
          </div>
        </section>

        <section className="products-section" id="products">
          <div className="products-toolbar">
            <div>
              <p className="eyebrow">Browse the collection</p>
              <h2>Featured products</h2>
            </div>
            <div className="products-search-area">
              <label htmlFor="product-search">Search products</label>
              <input
                id="product-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name"
              />
              {!isLoading && !error && products.length > 0 && (
                <span>{filteredProducts.length} of {products.length} products</span>
              )}
            </div>
          </div>
          {isLoading && <p className="products-message">Loading products...</p>}
          {!isLoading && error && <p className="products-message products-error">{error}</p>}
          {!isLoading && !error && products.length === 0 && (
            <p className="products-message">No products are available right now.</p>
          )}
          {!isLoading && !error && products.length > 0 && filteredProducts.length === 0 && (
            <p className="products-message">No products found.</p>
          )}
          {cartMessage.text && <p className={`cart-message ${cartMessage.type}`}>{cartMessage.text}</p>}
          {!isLoading && !error && filteredProducts.length > 0 && (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <ProductImage product={product} />
                  <div className="product-card-content">
                    <p className="product-category">
                      {product.category_name || product.category?.name || 'Uncategorized'}
                    </p>
                    <h3>{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="product-details">
                      <strong>${Number(product.price).toFixed(2)}</strong>
                      <span>{product.stock} in stock</span>
                    </div>
                    <button
                      type="button"
                      className="add-to-cart-button"
                      onClick={() => handleAddToCart(product)}
                      disabled={addingProductId === product.id}
                    >
                      {addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="cart-section" id="cart">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your selections</p>
              <h2>Your cart</h2>
            </div>
            {authToken && !isCartLoading && cartItems.length > 0 && (
              <p className="section-note">
                {cartItems.reduce((count, item) => count + item.quantity, 0)} item(s) in your cart.
              </p>
            )}
          </div>

          {!authToken && (
            <p className="cart-message">Please login to view your cart.</p>
          )}
          {authToken && isCartLoading && (
            <p className="cart-message">Loading your cart...</p>
          )}
          {authToken && cartError && (
            <p className="cart-message error">{cartError}</p>
          )}
          {authToken && !isCartLoading && !cartError && cartItems.length === 0 && (
            <p className="cart-message">Your cart is empty.</p>
          )}
          {authToken && !isCartLoading && cartItems.length > 0 && (
            <div className="cart-layout">
              <div className="cart-list">
                {cartItems.map((item) => {
                  const isUpdating = updatingCartItemId === item.id
                  const isRemoving = removingCartItemId === item.id
                  const isBusy = isUpdating || isRemoving || isClearingCart

                  return (
                    <article className="cart-item" key={item.id}>
                      <div className="cart-item-info">
                        <h3>{item.product_name}</h3>
                        <p>${Number(item.price).toFixed(2)} each</p>
                      </div>
                      <div className="quantity-controls" aria-label={`Quantity for ${item.product_name}`}>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, -1)}
                          disabled={isBusy || item.quantity <= 1}
                          aria-label={`Decrease ${item.product_name} quantity`}
                        >
                          -
                        </button>
                        <span>{isUpdating ? '...' : item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, 1)}
                          disabled={isBusy}
                          aria-label={`Increase ${item.product_name} quantity`}
                        >
                          +
                        </button>
                      </div>
                      <strong className="cart-item-subtotal">${Number(item.subtotal).toFixed(2)}</strong>
                      <button
                        type="button"
                        className="remove-cart-button"
                        onClick={() => handleRemoveCartItem(item)}
                        disabled={isBusy}
                      >
                        {isRemoving ? 'Removing...' : 'Remove'}
                      </button>
                    </article>
                  )
                })}
              </div>
              <aside className="cart-summary">
                <div>
                  <span>Total</span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>
                <button
                  type="button"
                  className="clear-cart-button"
                  onClick={handleClearCart}
                  disabled={isClearingCart || updatingCartItemId !== null || removingCartItemId !== null}
                >
                  {isClearingCart ? 'Clearing...' : 'Clear Cart'}
                </button>
                <button
                  type="button"
                  className="checkout-button"
                  onClick={handleCheckout}
                  disabled={isCheckoutSubmitting || isClearingCart || updatingCartItemId !== null || removingCartItemId !== null}
                >
                  {isCheckoutSubmitting ? 'Processing...' : 'Checkout'}
                </button>
              </aside>
            </div>
          )}
          {checkoutMessage.text && <p className={`cart-message ${checkoutMessage.type}`}>{checkoutMessage.text}</p>}
        </section>

        <section className="orders-section" id="orders">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{isAdmin ? 'Order administration' : 'Your purchase history'}</p>
              <h2>{isAdmin ? 'Admin Orders' : 'My Orders'}</h2>
            </div>
            {authToken && <p className="section-note">{isAdmin ? 'Review and update order statuses.' : 'Review your recent ShopSphere orders.'}</p>}
          </div>

          {!authToken && (
            <p className="cart-message">Please login to view your orders.</p>
          )}
          {authToken && isOrdersLoading && (
            <p className="cart-message">Loading your orders...</p>
          )}
          {authToken && ordersError && (
            <p className="cart-message error">{ordersError}</p>
          )}
          {authToken && !isOrdersLoading && !ordersError && orders.length === 0 && (
            <p className="cart-message">You have not placed any orders yet.</p>
          )}
          {authToken && isOrderDetailsLoading && (
            <p className="cart-message">Loading order details...</p>
          )}
          {authToken && orderDetailsError && (
            <p className="cart-message error">{orderDetailsError}</p>
          )}
          {authToken && isAdmin && adminOrderMessage.text && (
            <p className={`cart-message ${adminOrderMessage.type}`}>{adminOrderMessage.text}</p>
          )}
          {selectedOrder && !isOrderDetailsLoading && (
            <div className="order-details-panel">
              <div className="order-details-header">
                <div>
                  <p className="eyebrow">Order details</p>
                  <h3>Order #{selectedOrder.order.id}</h3>
                </div>
                <button type="button" className="close-details-button" onClick={() => setSelectedOrder(null)}>Close</button>
              </div>
              <div className="order-detail-meta">
                <span className={`status-badge status-${selectedOrder.order.status}`}>{selectedOrder.order.status}</span>
                {isAdmin && <span>User ID: {selectedOrder.order.user_id}</span>}
                <strong>${Number(selectedOrder.order.total_amount).toFixed(2)}</strong>
              </div>
              {isAdmin && (
                <div className="admin-status-editor">
                  <label htmlFor="detail-order-status">Update status</label>
                  <select
                    id="detail-order-status"
                    value={pendingOrderStatuses[selectedOrder.order.id] || selectedOrder.order.status}
                    onChange={(event) => setPendingOrderStatuses((statuses) => ({ ...statuses, [selectedOrder.order.id]: event.target.value }))}
                    disabled={updatingOrderStatusId === selectedOrder.order.id}
                  >
                    {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <button
                    type="button"
                    className="update-status-button"
                    onClick={() => handleUpdateOrderStatus(selectedOrder.order)}
                    disabled={updatingOrderStatusId === selectedOrder.order.id}
                  >
                    {updatingOrderStatusId === selectedOrder.order.id ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              )}
              <div className="order-detail-items">
                {selectedOrder.items.map((item) => (
                  <div className="order-detail-item" key={item.id}>
                    <span>{item.product_name}</span>
                    <span>{item.quantity} x ${Number(item.price).toFixed(2)}</span>
                    <strong>${Number(item.subtotal).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          {authToken && !isOrdersLoading && !ordersError && orders.length > 0 && (
            <div className={`orders-list ${isAdmin ? 'admin-orders-list' : ''}`}>
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div>
                    <p className="order-card-label">Order</p>
                    <h3>#{order.id}</h3>
                  </div>
                  <div>
                    <p className="order-card-label">Placed</p>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <p className="order-card-label">Total</p>
                    <strong>${Number(order.total_amount).toFixed(2)}</strong>
                  </div>
                  {isAdmin && (
                    <div>
                      <p className="order-card-label">User ID</p>
                      <span>{order.user_id || 'See details'}</span>
                    </div>
                  )}
                  <span className={`status-badge status-${order.status}`}>{order.status}</span>
                  <button type="button" className="view-order-button" onClick={() => handleViewOrderDetails(order.id)}>
                    View Details
                  </button>
                  {isAdmin && (
                    <div className="admin-status-editor card-status-editor">
                      <label htmlFor={`order-status-${order.id}`}>Status</label>
                      <select
                        id={`order-status-${order.id}`}
                        value={pendingOrderStatuses[order.id] || order.status}
                        onChange={(event) => setPendingOrderStatuses((statuses) => ({ ...statuses, [order.id]: event.target.value }))}
                        disabled={updatingOrderStatusId === order.id}
                      >
                        {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <button
                        type="button"
                        className="update-status-button"
                        onClick={() => handleUpdateOrderStatus(order)}
                        disabled={updatingOrderStatusId === order.id}
                      >
                        {updatingOrderStatusId === order.id ? 'Updating...' : 'Update'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>ShopSphere</span>
        </a>
        <p>&copy; 2024 ShopSphere. A simpler way to shop.</p>
      </footer>
    </div>
  )
}

export default App
