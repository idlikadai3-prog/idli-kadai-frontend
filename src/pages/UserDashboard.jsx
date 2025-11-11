import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { handleApiError } from '../utils/api'
import { showSuccess, showError } from '../utils/toast'
import LoadingSpinner from '../components/LoadingSpinner'
import './Dashboard.css'

const UserDashboard = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchMenu()
    fetchOrders()
  }, [isAuthenticated, navigate])

  const fetchMenu = async () => {
    try {
      setLoading(true)
      const response = await api.get('/menu')
      setMenu(response.data.filter(item => item.available))
    } catch (error) {
      handleApiError(error, 'Failed to load menu items')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders')
      setOrders(response.data)
    } catch (error) {
      handleApiError(error, 'Failed to load orders')
    }
  }

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.menu_item_id === item.id)
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.menu_item_id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1
      }])
    }
  }

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.menu_item_id !== itemId))
  }

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
    } else {
      setCart(cart.map(item =>
        item.menu_item_id === itemId
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const handleCheckout = async (e) => {
    e.preventDefault()
    if (cart.length === 0) {
      showError('Your cart is empty')
      return
    }

    setPlacingOrder(true)
    try {
      const total = getTotal()
      const response = await api.post('/orders', {
        items: cart,
        total,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        // Send as description primarily; keep customer_address for backward compatibility
        description: customerAddress.trim(),
        customer_address: customerAddress.trim()
      })
      
      showSuccess('Order placed successfully! Check your email for confirmation.')
      setCart([])
      setShowCheckout(false)
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      fetchOrders()
    } catch (error) {
      handleApiError(error, 'Failed to place order')
    } finally {
      setPlacingOrder(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff9800',
      preparing: '#2196F3',
      ready: '#4CAF50',
      completed: '#4CAF50',
      cancelled: '#f44336'
    }
    return colors[status] || '#666'
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner size="medium" text="Loading..." />
      </div>
    )
  }

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>🍽️ idli kadai</h1>
        <div className="nav-right">
          <span>Welcome, {user?.username}</span>
          {user?.role === 'seller' && (
            <button onClick={() => navigate('/admin')} className="btn btn-secondary">
              Seller Panel
            </button>
          )}
          <button onClick={logout} className="btn btn-danger">Logout</button>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-grid">
          <div className="menu-section">
            <h2>Menu</h2>
            {loading ? (
              <LoadingSpinner size="medium" text="Loading menu..." />
            ) : menu.length === 0 ? (
              <p>No menu items available</p>
            ) : (
              <div className="menu-grid">
                {menu.map(item => (
                  <div key={item.id} className="menu-item">
                    <h3>{item.name}</h3>
                    <p className="description">{item.description}</p>
                    <p className="price">Rs. {item.price.toFixed(2)}</p>
                    <p className="category">{item.category}</p>
                    <button
                      onClick={() => addToCart(item)}
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cart-section">
            <h2>Cart ({cart.length})</h2>
            {cart.length === 0 ? (
              <p>Your cart is empty</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item.menu_item_id} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{item.name}</h4>
                        <p>Rs. {item.price.toFixed(2)}</p>
                      </div>
                      <div className="cart-item-controls">
                        <button
                          onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                          className="btn-quantity"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                          className="btn-quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-total">
                  <strong>Total: Rs. {getTotal().toFixed(2)}</strong>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="btn btn-primary btn-block"
                >
                  Checkout
                </button>
              </>
            )}
          </div>
        </div>

        {showCheckout && (
          <div className="modal">
            <div className="modal-content">
              <h2>Checkout</h2>
              <form onSubmit={handleCheckout}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    disabled={placingOrder}
                    minLength={2}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    disabled={placingOrder}
                    minLength={10}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="form-group">
                  <label>Order Description *</label>
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    required
                    disabled={placingOrder}
                    minLength={5}
                    placeholder="Describe your order and delivery details (address, instructions, pickup/delivery preference)"
                    rows={3}
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary" disabled={placingOrder || cart.length === 0}>
                    {placingOrder ? 'Placing Order...' : 'Place Order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="btn btn-secondary"
                    disabled={placingOrder}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="orders-section">
          <h2>My Orders</h2>
          {orders.length === 0 ? (
            <p>No orders yet. Start ordering from the menu above!</p>
          ) : (
            <div className="orders-list">
              {orders.map(order => {
                const orderId = order.id?.slice(-6)?.toUpperCase() || order.orderId || 'N/A'
                return (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <span className="order-id">Order #{orderId}</span>
                      <span
                        className="order-status"
                        style={{ color: getStatusColor(order.status) }}
                      >
                        {order.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    <div className="order-items">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="order-item">
                          {item.name} x {item.quantity} - Rs. {(item.price * item.quantity).toFixed(2)}
                        </div>
                      ))}
                    </div>
                    <div className="order-total">
                      Total: Rs. {order.total?.toFixed(2) || '0.00'}
                    </div>
                    {order.customer_name && (
                      <div className="order-info">
                        <p><strong>Customer:</strong> {order.customer_name}</p>
                        {order.customer_phone && (
                          <p><strong>Phone:</strong> {order.customer_phone}</p>
                        )}
                    {(order.description || order.customer_address) && (
                      <p><strong>Order Description:</strong> {order.description || order.customer_address}</p>
                        )}
                      </div>
                    )}
                    <div className="order-date">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : 'Date not available'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDashboard

