import { useState, useEffect } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/store/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Cart & Orders
  const [cart, setCart] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  // Admin state
  const [summaryReport, setSummaryReport] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Staff Studio state
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', stock: '', categoryId: '' });
  const [aiFeatures, setAiFeatures] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Auth Inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Notification
  const [notification, setNotification] = useState(null);

  const showNotify = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Sync token and user in localStorage
  const saveAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCart(null);
    setActiveTab('products');
    showNotify('Logged out successfully.');
  };

  // Helper fetch with auth
  const apiFetch = async (endpoint, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    return res;
  };

  // Load products & categories
  const fetchProducts = async () => {
    try {
      let url = `${API_URL}/products?`;
      if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;
      if (selectedCategory) url += `categoryId=${selectedCategory}&`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error('Failed to load products', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const fetchCart = async () => {
    if (!token || user?.role !== 'STUDENT') return;
    try {
      const res = await apiFetch('/cart');
      if (res.ok) setCart(await res.json());
    } catch (e) {
      console.error('Failed to load cart', e);
    }
  };

  const fetchMyOrders = async () => {
    if (!token || user?.role !== 'STUDENT') return;
    try {
      const res = await apiFetch('/orders/mine');
      if (res.ok) setMyOrders(await res.json());
    } catch (e) {
      console.error('Failed to load orders', e);
    }
  };

  const fetchAdminData = async () => {
    if (!token || user?.role !== 'ADMIN') return;
    try {
      const [sumRes, usersRes, ordRes] = await Promise.all([
        apiFetch('/admin/reports/summary'),
        apiFetch('/admin/users'),
        apiFetch('/orders')
      ]);
      if (sumRes.ok) setSummaryReport(await sumRes.json());
      if (usersRes.ok) setUsersList(await usersRes.json());
      if (ordRes.ok) setAllOrders(await ordRes.json());
    } catch (e) {
      console.error('Failed to load admin dashboard', e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    if (token && user) {
      if (user.role === 'STUDENT') {
        fetchCart();
        fetchMyOrders();
      } else if (user.role === 'ADMIN') {
        fetchAdminData();
      }
    }
  }, [token, user]);

  // LOGIN FUNCTION
  const handleLogin = async (email, password) => {
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        saveAuth(data.token, data.user);
        showNotify(`Welcome back, ${data.user.name} (${data.user.role})!`, 'success');
      } else {
        setAuthError(data.error || 'Invalid credentials');
      }
    } catch {
      setAuthError('Cannot connect to backend API.');
    }
  };

  // CART ACTIONS
  const addToCart = async (productId) => {
    if (!token) {
      showNotify('Please log in as a Student to add items to cart.', 'error');
      return;
    }
    if (user.role !== 'STUDENT') {
      showNotify(`Cart is only accessible to Students (Current: ${user.role}).`, 'error');
      return;
    }
    const res = await apiFetch('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: 1 })
    });
    if (res.ok) {
      setCart(await res.json());
      showNotify('Added to cart!', 'success');
    } else {
      const err = await res.json();
      showNotify(err.error || 'Failed to add item', 'error');
    }
  };

  const updateCartQty = async (productId, quantity) => {
    if (quantity < 1) return removeFromCart(productId);
    const res = await apiFetch(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity })
    });
    if (res.ok) setCart(await res.json());
  };

  const removeFromCart = async (productId) => {
    const res = await apiFetch(`/cart/items/${productId}`, { method: 'DELETE' });
    if (res.ok) fetchCart();
  };

  const handleCheckout = async () => {
    const res = await apiFetch('/orders/checkout', { method: 'POST' });
    if (res.ok) {
      const order = await res.json();
      showNotify(`Order #${order.id} placed successfully!`, 'success');
      fetchCart();
      fetchProducts();
      fetchMyOrders();
      setActiveTab('my-orders');
    } else {
      const err = await res.json();
      showNotify(err.error || 'Checkout failed', 'error');
    }
  };

  // STAFF AI & MERCHANDISE ACTIONS
  const handleGenerateAiDescription = async () => {
    if (!newProduct.name) {
      showNotify('Please enter a product name first.', 'error');
      return;
    }
    setAiLoading(true);
    try {
      const res = await apiFetch('/integrations/ai/product-description', {
        method: 'POST',
        body: JSON.stringify({ name: newProduct.name, features: aiFeatures })
      });
      const data = await res.json();
      if (res.ok && data.description) {
        setNewProduct(prev => ({ ...prev, description: data.description }));
        showNotify('AI description generated! You can review or edit it below.', 'success');
      } else {
        showNotify(data.error || 'AI generation failed (OpenAI key not configured in Key Vault).', 'error');
      }
    } catch {
      showNotify('AI service error.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const res = await apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: newProduct.name,
        description: newProduct.description,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        categoryId: Number(newProduct.categoryId)
      })
    });
    if (res.ok) {
      showNotify('Product created successfully!', 'success');
      setNewProduct({ name: '', description: '', price: '', stock: '', categoryId: '' });
      setAiFeatures('');
      fetchProducts();
      setActiveTab('products');
    } else {
      const err = await res.json();
      showNotify(err.error || 'Failed to create product', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this merchandise?')) return;
    const res = await apiFetch(`/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showNotify('Product deleted (marked inactive).', 'success');
      fetchProducts();
    }
  };

  // ADMIN ACTIONS
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const res = await apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: newCategoryName })
    });
    if (res.ok) {
      showNotify(`Category "${newCategoryName}" created!`, 'success');
      setNewCategoryName('');
      fetchCategories();
      if (user?.role === 'ADMIN') fetchAdminData();
    } else {
      const err = await res.json();
      showNotify(err.error || 'Failed to create category', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    const res = await apiFetch(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showNotify(`Order #${orderId} updated to ${status}!`, 'success');
      fetchAdminData();
    }
  };

  const handleUpdateUserRole = async (userId, role) => {
    const res = await apiFetch(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
    if (res.ok) {
      showNotify(`User role updated to ${role}!`, 'success');
      fetchAdminData();
    }
  };

  // Calculate cart total
  const cartTotal = cart?.items?.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0) || 0;
  const cartItemsCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0;

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="header">
        <div className="header-brand">
          <h1>🏫 University Merchandise Store</h1>
          <span className="api-badge">API: Connected (Port 3000)</span>
        </div>

        <div className="user-nav">
          {user ? (
            <>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className={`badge badge-${user.role.toLowerCase()}`}>{user.role}</span>
              </div>
              <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <span style={{ fontSize: '13px', color: '#64748b' }}>Not logged in</span>
          )}
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '16px',
          background: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: notification.type === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${notification.type === 'error' ? '#fca5a5' : '#bbf7d0'}`,
          fontWeight: 500
        }}>
          {notification.msg}
        </div>
      )}

      {/* IF NOT LOGGED IN: SHOW QUICK DEMO LOGIN CARD */}
      {!token ? (
        <div className="card login-card">
          <h2>Sign In to University Store</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
            Choose a demo profile or sign in with your university credentials
          </p>

          <div className="demo-buttons">
            <button className="demo-btn" onClick={() => handleLogin('student@university.edu', 'Demo123!')}>
              <span>🎓 <strong>Student Demo</strong> (Cart & Orders)</span>
              <span className="badge badge-student">Login</span>
            </button>

            <button className="demo-btn" onClick={() => handleLogin('staff@university.edu', 'Demo123!')}>
              <span>👔 <strong>Staff Demo</strong> (Inventory & AI Studio)</span>
              <span className="badge badge-staff">Login</span>
            </button>

            <button className="demo-btn" onClick={() => handleLogin('admin@university.edu', 'Demo123!')}>
              <span>🛡️ <strong>Admin Demo</strong> (Full Control & Reports)</span>
              <span className="badge badge-admin">Login</span>
            </button>
          </div>

          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0', position: 'relative' }}>
            <span style={{ background: '#fff', padding: '0 8px', color: '#94a3b8', fontSize: '12px', position: 'relative', top: '-10px' }}>or enter credentials</span>
          </div>

          {authError && <div style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{authError}</div>}

          <form onSubmit={(e) => { e.preventDefault(); handleLogin(emailInput, passwordInput); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="email"
              placeholder="Email address"
              className="search-input"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="search-input"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>Sign In</button>
          </form>
        </div>
      ) : (
        /* LOGGED IN: SHOW APPLICATION NAVIGATION & VIEWS */
        <>
          <nav className="tabs">
            <button
              className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              🛍️ Merchandise Catalog
            </button>

            {user.role === 'STUDENT' && (
              <>
                <button
                  className={`tab-btn ${activeTab === 'cart' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cart')}
                >
                  🛒 Shopping Cart {cartItemsCount > 0 && <span className="cart-count-badge">{cartItemsCount}</span>}
                </button>

                <button
                  className={`tab-btn ${activeTab === 'my-orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('my-orders')}
                >
                  📦 My Order History
                </button>
              </>
            )}

            {(user.role === 'STAFF' || user.role === 'ADMIN') && (
              <button
                className={`tab-btn ${activeTab === 'staff-studio' ? 'active' : ''}`}
                onClick={() => setActiveTab('staff-studio')}
              >
                ✨ Merchandise Studio (AI)
              </button>
            )}

            {user.role === 'ADMIN' && (
              <button
                className={`tab-btn ${activeTab === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveTab('admin-dashboard'); fetchAdminData(); }}
              >
                📊 Admin Dashboard
              </button>
            )}
          </nav>

          {/* TAB 1: PRODUCT CATALOG */}
          {activeTab === 'products' && (
            <div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="🔍 Search merchandise (e.g., Hoodie)..."
                  className="search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <select
                  className="category-select"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="product-grid">
                {products.map(product => (
                  <div key={product.id} className="product-card">
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3>{product.name}</h3>
                        <span className={`stock-tag ${product.stock > 5 ? 'in-stock' : product.stock > 0 ? 'low-stock' : 'out-of-stock'}`}>
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>
                      <span className="category-tag">{product.category?.name || 'General'}</span>
                      <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.4', margin: '8px 0' }}>
                        {product.description || 'Official university merchandise.'}
                      </p>
                    </div>

                    <div>
                      <div className="product-price">฿{product.price}</div>
                      
                      {user.role === 'STUDENT' ? (
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                          disabled={product.stock <= 0}
                          onClick={() => addToCart(product.id)}
                        >
                          {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            onClick={async () => {
                              const newStock = prompt(`Update stock for ${product.name}:`, product.stock);
                              if (newStock !== null && !isNaN(newStock)) {
                                await apiFetch(`/products/${product.id}`, {
                                  method: 'PUT',
                                  body: JSON.stringify({ stock: Number(newStock) })
                                });
                                fetchProducts();
                                showNotify('Stock updated!', 'success');
                              }
                            }}
                          >
                            Update Stock
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SHOPPING CART (STUDENT) */}
          {activeTab === 'cart' && user.role === 'STUDENT' && (
            <div className="card">
              <h2>Your Shopping Cart</h2>
              {cart?.items?.length ? (
                <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Subtotal</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.items.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.product.name}</strong></td>
                          <td>฿{item.product.price}</td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', marginRight: '6px' }}
                              onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                            >
                              -
                            </button>
                            <span style={{ fontWeight: 600 }}>{item.quantity}</span>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', marginLeft: '6px' }}
                              onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                            >
                              +
                            </button>
                          </td>
                          <td>฿{Number(item.product.price) * item.quantity}</td>
                          <td>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => removeFromCart(item.productId)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '2px solid #e2e8f0' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>
                      Total: ฿{cartTotal}
                    </div>
                    <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '16px' }} onClick={handleCheckout}>
                      Checkout & Place Order
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ color: '#64748b', margin: '20px 0' }}>Your cart is empty. Browse the catalog to add merchandise!</p>
              )}
            </div>
          )}

          {/* TAB 3: ORDER HISTORY (STUDENT) */}
          {activeTab === 'my-orders' && user.role === 'STUDENT' && (
            <div className="card">
              <h2>My Order History</h2>
              {myOrders.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myOrders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{new Date(order.orderDate).toLocaleString()}</td>
                        <td>{order.items?.length || 1} item(s)</td>
                        <td><strong>฿{order.totalAmount}</strong></td>
                        <td>
                          <span className={`badge badge-${order.status === 'CONFIRMED' ? 'staff' : order.status === 'DELIVERED' ? 'student' : 'admin'}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#64748b', margin: '20px 0' }}>No orders placed yet.</p>
              )}
            </div>
          )}

          {/* TAB 4: MERCHANDISE STUDIO & AI (STAFF / ADMIN) */}
          {activeTab === 'staff-studio' && (user.role === 'STAFF' || user.role === 'ADMIN') && (
            <div className="card">
              <h2>Merchandise Studio (with OpenAI Description Generator)</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                Add official university products and let AI write professional descriptions.
              </p>

              <form onSubmit={handleCreateProduct} style={{ display: 'grid', gap: '16px', maxWidth: '600px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Product Name</label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="e.g. University Varsity Jacket"
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Price (฿)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="search-input"
                      placeholder="e.g. 1290"
                      value={newProduct.price}
                      onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Initial Stock</label>
                    <input
                      type="number"
                      className="search-input"
                      placeholder="e.g. 50"
                      value={newProduct.stock}
                      onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Category</label>
                  <select
                    className="category-select"
                    style={{ width: '100%' }}
                    value={newProduct.categoryId}
                    onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Select Category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* AI GENERATOR HELPER */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                    ✨ AI Features Prompt (Optional)
                  </label>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="e.g. 100% heavy wool, leather sleeves, embroidered crest"
                    value={aiFeatures}
                    onChange={e => setAiFeatures(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleGenerateAiDescription}
                    disabled={aiLoading}
                  >
                    {aiLoading ? 'Generating with AI...' : '✨ Generate AI Description'}
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                    Product Description (Editable)
                  </label>
                  <textarea
                    className="search-input"
                    rows="4"
                    placeholder="Product description will appear here after AI generation or manual typing..."
                    value={newProduct.description}
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
                  Publish Merchandise
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: ADMIN DASHBOARD (ADMIN ONLY) */}
          {activeTab === 'admin-dashboard' && user.role === 'ADMIN' && (
            <div>
              {/* METRICS */}
              {summaryReport && (
                <div className="metrics-grid">
                  <div className="metric-box">
                    <div>Total Users</div>
                    <div className="metric-val">{summaryReport.users}</div>
                  </div>
                  <div className="metric-box">
                    <div>Active Products</div>
                    <div className="metric-val">{summaryReport.activeProducts}</div>
                  </div>
                  <div className="metric-box">
                    <div>Total Orders</div>
                    <div className="metric-val">{summaryReport.orders}</div>
                  </div>
                  <div className="metric-box">
                    <div>Revenue</div>
                    <div className="metric-val">฿{summaryReport.revenue}</div>
                  </div>
                </div>
              )}

              {/* CATEGORY CREATION */}
              <div className="card">
                <h3>Manage Categories</h3>
                <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <input
                    type="text"
                    placeholder="New category name (e.g. Souvenirs, Stationery)"
                    className="search-input"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">Add Category</button>
                </form>
              </div>

              {/* ALL CUSTOMER ORDERS */}
              <div className="card">
                <h3>All University Orders</h3>
                {allOrders.length ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Update Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOrders.map(order => (
                        <tr key={order.id}>
                          <td>#{order.id}</td>
                          <td>{order.user?.name || `User #${order.userId}`}</td>
                          <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                          <td>฿{order.totalAmount}</td>
                          <td>
                            <span className={`badge badge-${order.status === 'CONFIRMED' ? 'staff' : order.status === 'DELIVERED' ? 'student' : 'admin'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <select
                              value={order.status}
                              className="category-select"
                              style={{ padding: '4px 8px', fontSize: '13px' }}
                              onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="PROCESSING">PROCESSING</option>
                              <option value="SHIPPED">SHIPPED</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#64748b' }}>No orders found.</p>
                )}
              </div>

              {/* USER ROLES MANAGEMENT */}
              <div className="card">
                <h3>User Role Management</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Current Role</th>
                      <th>Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td><strong>{u.name}</strong></td>
                        <td>{u.email}</td>
                        <td><span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span></td>
                        <td>
                          <select
                            value={u.role}
                            className="category-select"
                            style={{ padding: '4px 8px', fontSize: '13px' }}
                            onChange={e => handleUpdateUserRole(u.id, e.target.value)}
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
