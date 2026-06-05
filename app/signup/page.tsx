'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    console.log('Sending:', { name, email, password })
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }
    await signIn('credentials', { email, password, callbackUrl: '/dashboard' })
  }

  return (
    <div style={{minHeight:'100vh',display:'grid',gridTemplateColumns:'1fr 1fr'}}>
      <div style={{background:'#166634',padding:'48px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'48px'}}>
            <div style={{width:'40px',height:'40px',background:'rgba(255,255,255,0.2)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>P</div>
            <div>
              <div style={{color:'white',fontWeight:'bold',fontSize:'18px'}}>CourtFlow</div>
              <div style={{color:'rgba(255,255,255,0.5)',fontSize:'11px',letterSpacing:'3px',textTransform:'uppercase'}}>Pickleball Hub</div>
            </div>
          </div>
          <h1 style={{fontSize:'42px',fontWeight:'900',color:'white',lineHeight:'1.1',marginBottom:'24px'}}>Start running better open play.</h1>
          <p style={{color:'rgba(255,255,255,0.7)',lineHeight:'1.8',marginBottom:'32px'}}>Create your account in seconds. No credit card required.</p>
          <ul style={{listStyle:'none',padding:0,margin:0}}>
            {['Create unlimited open play sessions','Invite via link or room code','Full match history and leaderboards','Owner, Admin, Member roles'].map(f => (
              <li key={f} style={{display:'flex',alignItems:'center',gap:'12px',color:'rgba(255,255,255,0.8)',fontSize:'14px',marginBottom:'12px'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ade80',flexShrink:0}} />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div style={{color:'white',fontSize:'22px',fontWeight:'900'}}>Free forever</div>
      </div>
      <div style={{background:'white',display:'flex',alignItems:'center',justifyContent:'center',padding:'48px'}}>
        <div style={{width:'100%',maxWidth:'360px'}}>
          <h2 style={{fontSize:'28px',fontWeight:'900',color:'#111',marginBottom:'4px'}}>Create account</h2>
          <p style={{color:'#666',fontSize:'14px',marginBottom:'32px'}}>
            Already have an account?{' '}
            <a href="/login" style={{color:'#166634',fontWeight:'500'}}>Sign in</a>
          </p>
          <button
            type="button"
            onClick={() => signIn('google', {callbackUrl:'/dashboard'})}
            style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'24px',cursor:'pointer',fontSize:'14px',background:'white'}}
          >
            Sign up with Google
          </button>
          <div style={{textAlign:'center',marginBottom:'24px'}}>
            <span style={{fontSize:'12px',color:'#9ca3af'}}>or sign up with email</span>
          </div>
          {error && (
            <div style={{background:'#fef2f2',color:'#dc2626',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'}}>
              {error}
            </div>
          )}
          <form onSubmit={handleSignup}>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ivan Deluvio"
                required
                style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              />
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              />
            </div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{width:'100%',background:'#166634',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'14px',cursor:'pointer',opacity:loading?0.7:1}}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
