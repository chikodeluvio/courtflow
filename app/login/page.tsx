'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) { setError('Invalid email or password'); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',gridTemplateColumns:'1fr 1fr'}}>
      <div style={{background:'#166534',padding:'3rem',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'3rem'}}>
            <div style={{width:'40px',height:'40px',background:'rgba(255,255,255,0.2)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>🏓</div>
            <div>
              <div style={{color:'white',fontWeight:'bold',fontSize:'1.1rem'}}>CourtFlow</div>
              <div style={{color:'rgba(255,255,255,0.5)',fontSize:'0.65rem',letterSpacing:'0.2em',textTransform:'uppercase'}}>Pickleball Hub</div>
            </div>
          </div>
          <h1 style={{fontSize:'3rem',fontWeight:'900',color:'white',lineHeight:'1',marginBottom:'1.5rem'}}>Your Pickleball.<br/>Organized.</h1>
          <p style={{color:'rgba(255,255,255,0.7)',lineHeight:'1.8'}}>Run open play sessions, track scores, manage courts, and grow your pickleball community.</p>
        </div>
        <div style={{color:'white',fontSize:'1.5rem',fontWeight:'900'}}>Free to start</div>
      </div>
      <div style={{background:'white',display:'flex',alignItems:'center',justifyContent:'center',padding:'3rem'}}>
        <div style={{width:'100%',maxWidth:'360px'}}>
          <h2 style={{fontSize:'2rem',fontWeight:'900',color:'#111',marginBottom:'0.25rem'}}>Welcome back</h2>
          <p style={{color:'#666',fontSize:'0.875rem',marginBottom:'2rem'}}>
            No account? <a href="/signup" style={{color:'#166534',fontWeight:'500'}}>Sign up free</a>
          </p>
          <button onClick={() => signIn('google', {callbackUrl:'/dashboard'})} style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'0.75rem',marginBottom:'0.75rem',cursor:'pointer',fontSize:'0.875rem',background:'white'}}>
            Continue with Google
          </button>
          <button onClick={() => router.push('/join')} style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'0.75rem',marginBottom:'1.5rem',cursor:'pointer',fontSize:'0.875rem',background:'white'}}>
            Continue as Guest
          </button>
          <div style={{borderTop:'1px solid #e5e7eb',margin:'1.5rem 0',textAlign:'center'}}><span style={{fontSize:'0.75rem',color:'#9ca3af',background:'white',padding:'0 0.5rem'}}>or email</span></div>
          {error && <div style={{background:'#fef2f2',color:'#dc2626',padding:'0.75rem',borderRadius:'8px',marginBottom:'1rem',fontSize:'0.875rem'}}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:'1rem'}}>
              <label style={{display:'block',fontSize:'0.65rem',color:'#666',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'0.5rem'}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'0.75rem',fontSize:'0.875rem',outline:'none',boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:'1rem'}}>
              <label style={{display:'block',fontSize:'0.65rem',color:'#666',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:'0.5rem'}}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'0.75rem',fontSize:'0.875rem',outline:'none',boxSizing:'border-box'}} />
            </div>
            <button type="submit" disabled={loading} style={{width:'100%',background:'#166534',color:'white',border:'none',borderRadius:'8px',padding:'0.75rem',fontSize:'0.875rem',cursor:'pointer'}}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}