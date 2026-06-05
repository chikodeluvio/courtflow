'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface OpenPlay {
  id: string
  name: string
  location?: string
  date?: string
  status: string
  roomCode: string
  ownerId: string
  _count?: { players: number; matches: number }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<OpenPlay[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newDate, setNewDate] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') fetchSessions()
  }, [status])

  async function fetchSessions() {
    const res = await fetch('/api/sessions')
    if (res.ok) {
      const data = await res.json()
      setSessions(data)
    }
    setLoading(false)
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, location: newLocation, date: newDate })
    })
    if (res.ok) {
      const data = await res.json()
      setShowNewModal(false)
      setNewName('')
      setNewLocation('')
      setNewDate('')
      router.push(`/sessions/${data.id}`)
    }
    setCreating(false)
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this session?')) return
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    fetchSessions()
  }

  if (status === 'loading' || loading) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f6f1'}}>
        <div style={{fontFamily:'monospace',color:'#666'}}>Loading...</div>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0,0,0,0)
  const upcomingSessions = sessions.filter(s => s.date && new Date(s.date) >= today && s.status !== 'completed')
  const completedSessions = sessions.filter(s => s.status === 'completed')
  const userId = (session?.user as any)?.id

  return (
    <div style={{minHeight:'100vh',background:'#f8f6f1',display:'flex'}}>
      {/* SIDEBAR */}
      <div style={{width:'240px',background:'white',borderRight:'1px solid #e2ddd4',display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,height:'100vh'}}>
        <div style={{padding:'20px 24px',borderBottom:'1px solid #e2ddd4',display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'34px',height:'34px',background:'#166534',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>🏓</div>
          <div>
            <div style={{fontWeight:'800',fontSize:'16px'}}>CourtFlow</div>
            <div style={{fontSize:'10px',color:'#999',letterSpacing:'2px',textTransform:'uppercase'}}>Pickleball Hub</div>
          </div>
        </div>
        <div style={{padding:'16px 24px',borderBottom:'1px solid #e2ddd4'}}>
          <div style={{fontWeight:'600',fontSize:'14px'}}>{session?.user?.name}</div>
          <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>{session?.user?.email}</div>
        </div>
        <nav style={{flex:1,padding:'16px 0'}}>
          <div style={{padding:'8px 24px',fontSize:'11px',color:'#999',letterSpacing:'2px',textTransform:'uppercase'}}>Main</div>
          <a href="/dashboard" style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 24px',color:'#166534',background:'#f0fdf4',borderLeft:'3px solid #166534',textDecoration:'none',fontSize:'14px'}}>
            🏠 Dashboard
          </a>
          <a href="/dashboard" style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 24px',color:'#666',textDecoration:'none',fontSize:'14px'}}>
            🏓 Open Play
          </a>
        </nav>
        <div style={{padding:'16px 24px',borderTop:'1px solid #e2ddd4'}}>
          <button onClick={() => signOut({ callbackUrl: '/login' })} style={{width:'100%',padding:'8px',border:'1px solid #e2ddd4',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'14px',color:'#666'}}>
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{marginLeft:'240px',flex:1,padding:'32px'}}>
        {/* HEADER */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'32px'}}>
          <div>
            <h1 style={{fontSize:'28px',fontWeight:'800',margin:0}}>Good day, {session?.user?.name?.split(' ')[0]}! 👋</h1>
            <div style={{fontSize:'12px',color:'#999',letterSpacing:'2px',textTransform:'uppercase',marginTop:'4px'}}>Your pickleball overview</div>
          </div>
          <button onClick={() => setShowNewModal(true)} style={{background:'#166534',color:'white',border:'none',borderRadius:'8px',padding:'10px 20px',cursor:'pointer',fontSize:'14px',fontWeight:'500'}}>
            + New Open Play
          </button>
        </div>

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'32px'}}>
          {[
            { icon:'🏓', num: sessions.length, label:'Total Sessions' },
            { icon:'📅', num: upcomingSessions.length, label:'Upcoming Sessions' },
            { icon:'✅', num: completedSessions.length, label:'Completed' },
          ].map(s => (
            <div key={s.label} style={{background:'white',border:'1px solid #e2ddd4',borderRadius:'14px',padding:'20px 24px'}}>
              <div style={{fontSize:'24px',marginBottom:'12px'}}>{s.icon}</div>
              <div style={{fontSize:'32px',fontWeight:'800',lineHeight:'1'}}>{s.num}</div>
              <div style={{fontSize:'11px',color:'#999',letterSpacing:'2px',textTransform:'uppercase',marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* SESSIONS */}
        <div style={{background:'white',border:'1px solid #e2ddd4',borderRadius:'14px',padding:'24px'}}>
          <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'16px'}}>// Your Sessions</div>
          {sessions.length === 0 ? (
            <div style={{textAlign:'center',padding:'48px 0'}}>
              <div style={{fontSize:'48px',marginBottom:'16px'}}>🏓</div>
              <div style={{fontWeight:'700',fontSize:'18px',marginBottom:'8px'}}>No sessions yet</div>
              <div style={{color:'#666',marginBottom:'24px'}}>Create your first open play session!</div>
              <button onClick={() => setShowNewModal(true)} style={{background:'#166534',color:'white',border:'none',borderRadius:'8px',padding:'10px 20px',cursor:'pointer',fontSize:'14px'}}>
                + New Open Play
              </button>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {sessions.map((s, i) => {
                const isOwner = s.ownerId === userId
                return (
                  <div key={s.id} style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px',background:'#f8f6f1',border:'1px solid #e2ddd4',borderRadius:'10px',cursor:'pointer'}} onClick={() => router.push(`/sessions/${s.id}`)}>
                    <div style={{width:'42px',height:'42px',background:['#166534','#e8a020','#1a6598'][i%3],borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>🏓</div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <span style={{fontWeight:'600',fontSize:'15px'}}>{s.name}</span>
                        {isOwner && <span style={{fontFamily:'monospace',fontSize:'10px',background:'#f0fdf4',color:'#166534',padding:'2px 6px',borderRadius:'4px',border:'1px solid #86efac'}}>Organizer</span>}
                      </div>
                      <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>{s.location || 'No location'} · {s.date || 'No date'}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontFamily:'monospace',fontSize:'11px',background:s.status==='active'?'#f0fdf4':'#f8f6f1',color:s.status==='active'?'#166534':'#999',padding:'4px 8px',borderRadius:'6px',border:`1px solid ${s.status==='active'?'#86efac':'#e2ddd4'}`}}>
                        {s.status === 'active' ? '🟢 Live' : '✅ Done'}
                      </span>
                      {isOwner && (
                        <button onClick={e => { e.stopPropagation(); deleteSession(s.id) }} style={{padding:'4px 8px',border:'1px solid #fca5a5',borderRadius:'6px',background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:'12px'}}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* NEW SESSION MODAL */}
      {showNewModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:'16px',padding:'32px',width:'100%',maxWidth:'480px',margin:'16px'}}>
            <h2 style={{fontSize:'22px',fontWeight:'800',marginBottom:'4px'}}>New Open Play Session</h2>
            <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',marginBottom:'24px'}}>// Name and configure your session</div>
            <form onSubmit={createSession}>
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Session Name</label>
                <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Saturday Morning Open Play" required style={{width:'100%',border:'1px solid #e2ddd4',borderRadius:'8px',padding:'12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Location</label>
                <input type="text" value={newLocation} onChange={e=>setNewLocation(e.target.value)} placeholder="Cebu Sports Complex Court 3" style={{width:'100%',border:'1px solid #e2ddd4',borderRadius:'8px',padding:'12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div style={{marginBottom:'24px'}}>
                <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Date</label>
                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{width:'100%',border:'1px solid #e2ddd4',borderRadius:'8px',padding:'12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div style={{display:'flex',gap:'12px'}}>
                <button type="button" onClick={() => setShowNewModal(false)} style={{flex:1,padding:'12px',border:'1px solid #e2ddd4',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'14px'}}>Cancel</button>
                <button type="submit" disabled={creating} style={{flex:1,padding:'12px',background:'#166534',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>
                  {creating ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
