import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('admin123');
  const [clientId, setClientId] = useState('demo-client-001');

  useEffect(() => {
    // Test API connection
    fetch('http://localhost:8001/api/health')
      .then(res => res.json())
      .then(data => {
        setMessage('✅ BusCare API Connected Successfully!');
      })
      .catch(err => {
        setMessage('❌ API Connection Failed');
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          email: email,
          password: password
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        setMessage('✅ Login Successful! Token received.');
      } else {
        setMessage('❌ Login Failed: ' + data.detail);
      }
    } catch (error) {
      setMessage('❌ Login Error: ' + error.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚌 BusCare Fleet Management</h1>
        <p>Complete Fleet Compliance and Management Platform</p>
        
        <div className="status-card">
          <h3>API Status: {message}</h3>
        </div>

        {!token ? (
          <div className="login-card">
            <h2>Login to BusCare</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Client ID:</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="demo-client-001"
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@demo.com"
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123"
                />
              </div>
              <button type="submit" className="login-btn">Login</button>
            </form>
          </div>
        ) : (
          <div className="success-card">
            <h2>🎉 Login Successful!</h2>
            <p>You are now authenticated with BusCare API</p>
            <div className="token-info">
              <small>Token: {token.substring(0, 50)}...</small>
            </div>
            <div className="api-links">
              <a href="http://localhost:8001/docs" target="_blank" rel="noopener noreferrer">
                📚 Open API Documentation
              </a>
              <a href="http://localhost:8001/redoc" target="_blank" rel="noopener noreferrer">
                📖 Open ReDoc Documentation
              </a>
            </div>
          </div>
        )}

        <div className="features">
          <h3>🚀 BusCare Features</h3>
          <div className="feature-grid">
            <div className="feature-card">
              <h4>🔧 Driver Inspections</h4>
              <p>Pre-trip checklists with media capture</p>
            </div>
            <div className="feature-card">
              <h4>👨‍🔧 Mechanic Assignments</h4>
              <p>Issue tracking and resolution workflow</p>
            </div>
            <div className="feature-card">
              <h4>✅ Supervisor Verification</h4>
              <p>Quality control for resolved issues</p>
            </div>
            <div className="feature-card">
              <h4>💬 Passenger Feedback</h4>
              <p>QR-code based feedback collection</p>
            </div>
            <div className="feature-card">
              <h4>🚨 Compliance Alerts</h4>
              <p>Document expiry tracking</p>
            </div>
            <div className="feature-card">
              <h4>💰 Financial Management</h4>
              <p>Collections, expenses, and P&L tracking</p>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
