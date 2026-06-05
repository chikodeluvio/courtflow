'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'code' | 'name'>('code')
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  async function findSession(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/join?code=${code.toUpperCase().trim()}`)
    if (!res.ok) {
      setError('Session not found. Check the room code and try again.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setSessionInfo(data)
    setStep('name')
    setLoading(false)
  }

  async function joinSession(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.toUpperCase().trim(), name })
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to join session')
      setLoading(false)
      return
    }
    const data = await res.json()
    router.push(`/sessions/${data.sessionId}`)
  }

  return (
    <div style={{minHeight:'100vh',background:'#f8f6f1',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{background:'white',borderRadius:'20px',padding:'40px',width:'100%',maxWidth:'420px',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'32px'}}>
          <div style={{width:'42px',height:'42px',background:'#166534',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>🏓</div>
          <div>
            <div style={{fontWeight:'800',fontSize:'18px'}}>CourtFlow</div>
            <div style={{fontSize:'11px',color:'#999',letterSpacing:'2px',textTransform:'uppercase'}}>Pickleball Hub</div>
          </div>
        </div>

        {step === 'code' && (
          <>
            <h2 style={{fontSize:'24px',fontWeight:'900',marginBottom:'4px'}}>Join a Session</h2>
            <p style={{color:'#666',fontSize:'14px',marginBottom:'28px'}}>Enter the 6-digit room code from your organizer</p>
            {error && <div style={{background:'#fef2f2',color:'#dc2626',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'}}>{error}</div>}
            <form onSubmit={findSession}>
              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Room Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SMOR1T"
                  maxLength={8}
                  required
                  style={{width:'100%',border:'2px solid #e2ddd4',borderRadius:'10px',padding:'14px',fontSize:'22px',fontFamily:'monospace',fontWeight:'700',letterSpacing:'4px',outline:'none',textAlign:'center',boxSizing:'border-box'}}
                  onFocus={e => e.target.style.borderColor='#166534'}
                  onBlur={e => e.target.style.borderColor='#e2ddd4'}
                />
              </div>
              <button type="submit" disabled={loading || code.length < 4} style={{width:'100%',background:'#166534',color:'white',border:'none',borderRadius:'10px',padding:'14px',fontSize:'15px',fontWeight:'600',cursor:'pointer',opacity:loading||code.length<4?0.6:1}}>
                {loading ? 'Finding session...' : 'Find Session →'}
              </button>
            </form>
            <div style={{marginTop:'24px',paddingTop:'24px',borderTop:'1px solid #e2ddd4',textAlign:'center'}}>
              <a href="/login" style={{color:'#166534',fontSize:'14px',fontWeight:'500',textDecoration:'none'}}>← Back to Login</a>
            </div>
          </>
        )}

        {step === 'name' && sessionInfo && (
          <>
            <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'12px',padding:'16px',marginBottom:'24px'}}>
              <div style={{fontFamily:'monospace',fontSize:'11px',color:'#166534',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'4px'}}>Session Found!</div>
              <div style={{fontWeight:'700',fontSize:'17px'}}>{sessionInfo.name}</div>
              <div style={{fontSize:'13px',color:'#666',marginTop:'4px'}}>{sessionInfo.location || 'No location'} · {sessionInfo.players?.length || 0} players</div>
            </div>
            <h2 style={{fontSize:'22px',fontWeight:'900',marginBottom:'4px'}}>Enter your name</h2>
            <p style={{color:'#666',fontSize:'14px',marginBottom:'24px'}}>How should other players see you?</p>
            {error && <div style={{background:'#fef2f2',color:'#dc2626',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'}}>{error}</div>}
            <form onSubmit={joinSession}>
              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ivan, Chiko..."
                  required
                  maxLength={20}
                  style={{width:'100%',border:'2px solid #e2ddd4',borderRadius:'10px',padding:'14px',fontSize:'16px',outline:'none',boxSizing:'border-box'}}
                  onFocus={e => e.target.style.borderColor='#166534'}
                  onBlur={e => e.target.style.borderColor='#e2ddd4'}
                />
              </div>
              <button type="submit" disabled={loading || !name.trim()} style={{width:'100%',background:'#166534',color:'white',border:'none',borderRadius:'10px',padding:'14px',fontSize:'15px',fontWeight:'600',cursor:'pointer',opacity:loading||!name.trim()?0.6:1}}>
                {loading ? 'Joining...' : '🏓 Join Session'}
              </button>
            </form>
            <div style={{marginTop:'16px',textAlign:'center'}}>
              <button onClick={() => {setStep('code');setError('');setSessionInfo(null)}} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:'14px'}}>← Change code</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
