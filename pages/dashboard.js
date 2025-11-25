import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [batches, setBatches] = useState([]);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [batchData, setBatchData] = useState({
    name: '',
    month: '',
    year: new Date().getFullYear(),
    totalEmployees: 0,
    totalAmount: 0
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/batch/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(batchData)
      });

      if (response.ok) {
        const newBatch = await response.json();
        setBatches([...batches, newBatch]);
        setShowNewBatch(false);
        setBatchData({
          name: '',
          month: '',
          year: new Date().getFullYear(),
          totalEmployees: 0,
          totalAmount: 0
        });
        alert('Batch created successfully!');
      } else {
        alert('Failed to create batch');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Please login first</h2>
        <p><a href="/">Go to login</a></p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        background: '#2c3e50', 
        color: 'white', 
        padding: '20px', 
        marginBottom: '20px',
        borderRadius: '5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0 }}>Payroll Dashboard</h1>
          <p style={{ margin: '5px 0 0 0' }}>Welcome, {user.name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '0 0 5px 0' }}>Role: {user.role}</p>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/';
            }}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Stats Cards */}
        <div style={{ background: '#ecf0f1', padding: '20px', borderRadius: '5px' }}>
          <h3>Total Batches</h3>
          <p style={{ fontSize: '24px', margin: '10px 0' }}>{batches.length}</p>
        </div>
        <div style={{ background: '#ecf0f1', padding: '20px', borderRadius: '5px' }}>
          <h3>Total Employees</h3>
          <p style={{ fontSize: '24px', margin: '10px 0' }}>
            {batches.reduce((sum, b) => sum + (b.totalEmployees || 0), 0)}
          </p>
        </div>
      </div>

      {/* New Batch Button */}
      {(user.role === 'admin' || user.role === 'accountant') && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowNewBatch(!showNewBatch)}
            style={{
              background: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            + Create New Batch
          </button>
        </div>
      )}

      {/* New Batch Form */}
      {showNewBatch && (
        <div style={{ background: '#f8f9fa', padding: '20px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #dee2e6' }}>
          <h3>Create New Payroll Batch</h3>
          <form onSubmit={handleCreateBatch}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Batch Name:</label>
              <input
                type="text"
                placeholder="e.g., November 2024"
                value={batchData.name}
                onChange={(e) => setBatchData({ ...batchData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Month:</label>
                <select
                  value={batchData.month}
                  onChange={(e) => setBatchData({ ...batchData, month: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                >
                  <option value="">Select Month</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Year:</label>
                <input
                  type="number"
                  value={batchData.year}
                  onChange={(e) => setBatchData({ ...batchData, year: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Total Employees:</label>
                <input
                  type="number"
                  value={batchData.totalEmployees}
                  onChange={(e) => setBatchData({ ...batchData, totalEmployees: parseInt(e.target.value) })}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Total Amount (₹):</label>
                <input
                  type="number"
                  value={batchData.totalAmount}
                  onChange={(e) => setBatchData({ ...batchData, totalAmount: parseFloat(e.target.value) })}
                  required
                  step="0.01"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                style={{
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Create Batch
              </button>
              <button
                type="button"
                onClick={() => setShowNewBatch(false)}
                style={{
                  background: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batches List */}
      <div>
        <h3>Recent Batches</h3>
        {batches.length === 0 ? (
          <p style={{ color: '#7f8c8d' }}>No batches created yet</p>
        ) : (
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            background: 'white',
            border: '1px solid #ddd'
          }}>
            <thead>
              <tr style={{ background: '#34495e', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Period</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Employees</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Amount</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px' }}>{batch.name}</td>
                  <td style={{ padding: '12px' }}>{batch.month}/{batch.year}</td>
                  <td style={{ padding: '12px' }}>{batch.totalEmployees}</td>
                  <td style={{ padding: '12px' }}>₹{batch.totalAmount.toFixed(2)}</td>
                  <td style={{ padding: '12px' }}><span style={{ background: '#27ae60', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Active</span></td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => alert('Generate files for: ' + batch.name)}
                      style={{
                        background: '#3498db',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Generate Files
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
