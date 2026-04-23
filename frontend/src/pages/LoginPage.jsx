import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import API from '../utils/api'

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await API.post('/auth/register', form)
      login(res.data.user, res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1e1e1e', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>⚡</div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 700,
            background: 'linear-gradient(90deg, #00c6ff, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>CollabCode</h1>
          <p style={{ color: '#666', fontSize: 13, margin: '6px 0 0' }}>Join the collaboration</p>
        </div>

        <div style={{
          background: '#252526', border: '1px solid #3d3d3d',
          borderRadius: 10, padding: '28px 24px'
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, color: '#ccc', fontWeight: 600 }}>Create account</h2>

          {error && (
            <div style={{
              background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.3)',
              color: '#f87171', padding: '8px 12px', borderRadius: 5,
              fontSize: 12, marginBottom: 14
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { key: 'name', label: 'Name', type: 'text', placeholder: 'Your name' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} required
                  placeholder={f.placeholder}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{
                    width: '100%', background: '#3c3c3c', border: '1px solid #555',
                    color: '#d4d4d4', padding: '9px 12px', borderRadius: 5,
                    fontSize: 13, outline: 'none', boxSizing: 'border-box'
                  }} />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              width: '100%', background: loading ? '#555' : '#007acc', border: 'none',
              color: '#fff', padding: '10px', borderRadius: 5,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4, transition: 'background 0.2s'
            }}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#666' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#4da6ff', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
      <style>{`input:focus { border-color: #007acc !important; } input::placeholder { color: #555; }`}</style>
    </div>
  )
}

export default RegisterPage
