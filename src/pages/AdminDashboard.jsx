import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { handleApiError } from '../utils/api'
import { showSuccess, showError, showInfo } from '../utils/toast'
import LoadingSpinner from '../components/LoadingSpinner'
import './Dashboard.css'

const AdminDashboard = () => {
  const { user, logout, isAuthenticated, isSeller } = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showMenuForm, setShowMenuForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    available: true,
    image_url: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sellerForm, setSellerForm] = useState({ username: '', email: '', password: '' })
  const [sellerSaving, setSellerSaving] = useState(false)
  const [showSellerModal, setShowSellerModal] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!isSeller) {
      showError('You do not have permission to access this page')
      navigate('/dashboard')
      return
    }
    fetchMenu()
    fetchOrders()

    const intervalId = setInterval(() => {
      fetchOrders()
    }, 8000)
    return () => clearInterval(intervalId)
  }, [isAuthenticated, isSeller, navigate])

  const fetchMenu = async () => {
    try {
      setLoading(true)
      const response = await api.get('/menu')
      setMenu(response.data)
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

  const handleMenuSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const isMultipart = !!imageFile
      let payload
      let headers = {}

      if (isMultipart) {
        payload = new FormData()
        payload.append('name', formData.name)
        payload.append('description', formData.description)
        payload.append('price', String(parseFloat(formData.price)))
        payload.append('category', formData.category)
        payload.append('available', String(!!formData.available))
        if (formData.image_url) {
          payload.append('image_url', formData.image_url)
        }
        if (imageFile) {
          payload.append('image', imageFile)
        }
        headers['Content-Type'] = 'multipart/form-data'
      } else {
        payload = {
          ...formData,
          price: parseFloat(formData.price),
        }
      }
      
      if (editingItem) {
        await api.put(`/menu/${editingItem.id}`, payload, { headers })
        showSuccess('Menu item updated successfully!')
      } else {
        await api.post('/menu', payload, { headers })
        showSuccess('Menu item added successfully!')
      }
      
      setShowMenuForm(false)
      setEditingItem(null)
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        available: true,
        image_url: ''
      })
      setImageFile(null)
      setImagePreview(null)
      fetchMenu()
    } catch (error) {
      handleApiError(error, 'Failed to save menu item')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      available: item.available,
      image_url: item.image_url || ''
    })
    setImageFile(null)
    setImagePreview(item.image_url || null)
    setShowMenuForm(true)
  }

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await api.delete(`/menu/${itemId}`)
        showSuccess('Menu item deleted successfully!')
        fetchMenu()
      } catch (error) {
        handleApiError(error, 'Failed to delete menu item')
      }
    }
  }

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status })
      showInfo(`Order status updated to ${status}`)
      fetchOrders()
    } catch (error) {
      handleApiError(error, 'Failed to update order status')
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

  const handleCreateSeller = async (e) => {
    e.preventDefault()
    setSellerSaving(true)
    try {
      if (sellerForm.username.trim().length < 3) {
        showError('Username must be at least 3 characters')
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sellerForm.email)) {
        showError('Please enter a valid email')
        return
      }
      if (sellerForm.password.length < 6) {
        showError('Password must be at least 6 characters')
        return
      }
      // Use /sellers endpoint (requires seller token)
      await api.post('/sellers', {
        username: sellerForm.username.trim(),
        email: sellerForm.email.trim().toLowerCase(),
        password: sellerForm.password
      })
      showSuccess('New seller created successfully!')
      setSellerForm({ username: '', email: '', password: '' })
      setShowSellerModal(false)
    } catch (error) {
      handleApiError(error, 'Failed to create seller')
    } finally {
      setSellerSaving(false)
    }
  }

  if (!user || !isSeller) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LoadingSpinner size="medium" text="Loading..." />
      </div>
    )
  }

  return (
    <>
    <div className="dashboard">
      <nav className="navbar">
        <h1>🍽️ idli kadai - Seller Panel</h1>
        <div className="nav-right">
          <span>Welcome, {user?.username}</span>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNavMenu(v => !v)}
              className="btn"
              aria-label="Open menu"
              title="Settings"
              style={{ padding: '8px 12px' }}
            >
              ☰
            </button>
            {showNavMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '120%',
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
                  minWidth: '180px',
                  zIndex: 10,
                  overflow: 'hidden'
                }}
              >
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', borderRadius: 0 }}
                  onClick={() => {
                    setShowSellerModal(true)
                    setShowNavMenu(false)
                  }}
                >
                  Add Seller
                </button>
                <button
                  className="btn"
                  style={{ width: '100%', borderRadius: 0 }}
                  onClick={() => {
                    setShowNavMenu(false)
                    navigate('/dashboard')
                  }}
                >
                  Buyer View
                </button>
              </div>
            )}
          </div>
          <button onClick={logout} className="btn btn-danger">Logout</button>
        </div>
      </nav>

      <div className="container">
        <div className="admin-sections">
          <div className="admin-section">
            <div className="section-header">
              <h2>Menu Management</h2>
              <button
                onClick={() => {
                  setEditingItem(null)
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    category: '',
                    available: true,
                    image_url: ''
                  })
                  setShowMenuForm(true)
                }}
                className="btn btn-primary"
                disabled={loading}
              >
                Add New Item
              </button>
            </div>

            {showMenuForm && (
              <div className="modal">
                <div className="modal-content">
                  <h2>{editingItem ? 'Edit' : 'Add'} Menu Item</h2>
                  <form onSubmit={handleMenuSubmit}>
                    <div className="form-group">
                      <label>Name * (min 2 characters)</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        disabled={saving}
                        minLength={2}
                        placeholder="Enter item name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Description * (min 10 characters)</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        disabled={saving}
                        minLength={10}
                        placeholder="Enter item description"
                        rows={4}
                      />
                    </div>
                    <div className="form-group">
                      <label>Price * (Rs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                        disabled={saving}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="form-group">
                      <label>Category * (min 2 characters)</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                        disabled={saving}
                        minLength={2}
                        placeholder="e.g., Koththu, Rice, Beverages"
                      />
                    </div>
                    <div className="form-group">
                      <label>Image (optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={saving}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setImageFile(file)
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (ev) => setImagePreview(ev.target.result)
                            reader.readAsDataURL(file)
                          } else {
                            setImagePreview(null)
                          }
                        }}
                      />
                      {!imageFile && (
                        <input
                          type="url"
                          placeholder="Or paste an image URL"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          disabled={saving}
                        />
                      )}
                      {imagePreview || formData.image_url ? (
                        <div style={{ marginTop: '8px' }}>
                          <img
                            src={imagePreview || formData.image_url}
                            alt="Preview"
                            style={{ maxWidth: '200px', borderRadius: '8px' }}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={formData.available}
                          onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                          disabled={saving}
                        />
                        Available
                      </label>
                    </div>
                    <div className="modal-actions">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : editingItem ? 'Update' : 'Add'} Item
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenuForm(false)
                          setEditingItem(null)
                        }}
                        className="btn btn-secondary"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {loading ? (
              <LoadingSpinner size="medium" text="Loading menu..." />
            ) : menu.length === 0 ? (
              <p>No menu items. Add your first item!</p>
            ) : (
              <div className="menu-grid">
                {menu.map(item => (
                  <div key={item.id} className="menu-item">
                      {item.image_url ? (
                        <div style={{ marginBottom: '8px' }}>
                          <img
                            src={item.image_url.startsWith('http') ? item.image_url : `https://idli-adai-backend-2.onrender.com${item.image_url}`}
                            alt={item.name}
                            style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }}
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        </div>
                      ) : null}
                    <h3>{item.name}</h3>
                    <p className="description">{item.description}</p>
                    <p className="price">Rs. {item.price.toFixed(2)}</p>
                    <p className="category">Category: {item.category}</p>
                    <p className={item.available ? 'available' : 'unavailable'}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </p>
                    <div className="menu-item-actions">
                      <button
                        onClick={() => handleEdit(item)}
                        className="btn btn-secondary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-section">
            <div className="section-header">
              <h2>Orders Management</h2>
              <button onClick={fetchOrders} className="btn btn-secondary" disabled={loading}>
                Refresh Orders
              </button>
            </div>
            {orders.length === 0 ? (
              <p>No orders yet. Orders will appear here when customers place them.</p>
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
                      <div className="order-info">
                        <p><strong>Customer:</strong> {order.customer_name || 'N/A'}</p>
                        <p><strong>Phone:</strong> {order.customer_phone || 'N/A'}</p>
                        {(order.description || order.customer_address) && (
                          <p><strong>Order Description:</strong> {order.description || order.customer_address}</p>
                        )}
                      </div>
                      <div className="order-items">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="order-item">
                            {item.name} x {item.quantity} - Rs. {(item.price * item.quantity).toFixed(2)}
                          </div>
                        ))}
                      </div>
                      {(order.description || order.customer_address) && (
                        <div className="order-info" style={{ marginTop: '8px' }}>
                          <p><strong>Order Description:</strong> {order.description || order.customer_address}</p>
                        </div>
                      )}
                      <div className="order-total">
                        Total: Rs. {order.total?.toFixed(2) || '0.00'}
                      </div>
                      <div className="order-date">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : 'Date not available'}
                      </div>
                      <div className="order-status-controls">
                        <label>Update Status:</label>
                        <select
                          value={order.status || 'pending'}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="status-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showSellerModal && (
      <div className="modal" onClick={() => !sellerSaving && setShowSellerModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h2>Add New Seller</h2>
          <form onSubmit={handleCreateSeller}>
            <div className="form-group">
              <label>New Seller Username *</label>
              <input
                type="text"
                value={sellerForm.username}
                onChange={(e) => setSellerForm({ ...sellerForm, username: e.target.value })}
                minLength={3}
                required
                disabled={sellerSaving}
                placeholder="seller username"
              />
            </div>
            <div className="form-group">
              <label>New Seller Email *</label>
              <input
                type="email"
                value={sellerForm.email}
                onChange={(e) => setSellerForm({ ...sellerForm, email: e.target.value })}
                required
                disabled={sellerSaving}
                placeholder="seller@example.com"
              />
            </div>
            <div className="form-group">
              <label>Temporary Password *</label>
              <input
                type="password"
                value={sellerForm.password}
                onChange={(e) => setSellerForm({ ...sellerForm, password: e.target.value })}
                minLength={6}
                required
                disabled={sellerSaving}
                placeholder="min 6 characters"
              />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary" disabled={sellerSaving}>
                {sellerSaving ? 'Creating...' : 'Create Seller'}
              </button>
              <button
                type="button"
                onClick={() => setShowSellerModal(false)}
                className="btn btn-secondary"
                disabled={sellerSaving}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}

export default AdminDashboard

