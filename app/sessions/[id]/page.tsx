'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'

interface Player {
  id: string
  name: string
  level: string
  role: string
  status: string
  wins: number
  losses: number
  matchesPlayed: number
}

interface Match {
  id: number
  teamA: string[]
  teamB: string[]
  scoreA: number
  scoreB: number
  winScore: number
  status: string
  winner: string | null
  mode: string
  createdAt: string
}

interface OpenPlay {
  id: string
  name: string
  location?: string
  date?: string
  status: string
  roomCode: string
  ownerId: string
  players: Player[]
  matches: Match[]
}

export default function SessionDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [openPlay, setOpenPlay] = useState<OpenPlay | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('matches')
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showCreateMatch, setShowCreateMatch] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [playerLevel, setPlayerLevel] = useState('intermediate')
  const [teamA, setTeamA] = useState<string[]>([])
  const [teamB, setTeamB] = useState<string[]>([])
  const [winScore, setWinScore] = useState(11)
  const [mmWinScore, setMmWinScore] = useState(11)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') fetchSession()
  }, [status, id])

  // Real-time updates with Pusher
  useEffect(() => {
    if (!id) return
    import('pusher-js').then(PusherJS => {
      const client = new PusherJS.default(
        process.env.NEXT_PUBLIC_PUSHER_KEY!,
        { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
      )
      const channel = client.subscribe(`session-${id}`)
      channel.bind('match-updated', () => fetchSession())
      channel.bind('match-deleted', () => fetchSession())
      channel.bind('player-added', () => fetchSession())
      return () => { client.unsubscribe(`session-${id}`) }
    })
  }, [id])

  async function fetchSession() {
    const res = await fetch(`/api/sessions/${id}`)
    if (res.ok) {
      const data = await res.json()
      setOpenPlay(data)
    }
    setLoading(false)
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/sessions/${id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName, level: playerLevel })
    })
    if (res.ok) {
      setPlayerName('')
      setShowAddPlayer(false)
      fetchSession()
    }
  }

  async function createMatch(e: React.FormEvent) {
    e.preventDefault()
    if (teamA.length === 0 || teamB.length === 0) return
    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id, teamA, teamB, winScore, mode: 'manual' })
    })
    if (res.ok) {
      setTeamA([])
      setTeamB([])
      setShowCreateMatch(false)
      setActiveTab('matches')
      fetchSession()
    }
  }

  async function updateScore(matchId: number, team: 'A' | 'B', delta: number) {
    const match = openPlay?.matches.find(m => m.id === matchId)
    if (!match || match.status === 'completed' || match.status === 'won') return
    const newScoreA = team === 'A' ? match.scoreA + delta : match.scoreA
    const newScoreB = team === 'B' ? match.scoreB + delta : match.scoreB
    if (newScoreA < 0 || newScoreB < 0) return

    const tieScore = match.winScore - 1
    const tied = newScoreA === tieScore && newScoreB === tieScore
    const tiebreakRule = (match as any).tiebreakRule

    // Check win conditions
    let won = false
    let winner = null

    if (tiebreakRule === 'suddendeath') {
      won = newScoreA > newScoreB || newScoreB > newScoreA
      winner = newScoreA > newScoreB ? 'A' : 'B'
    } else if (tiebreakRule === 'deuce') {
      const diff = Math.abs(newScoreA - newScoreB)
      const max = Math.max(newScoreA, newScoreB)
      won = max >= match.winScore && diff >= 2
      winner = newScoreA > newScoreB ? 'A' : 'B'
    } else {
      won = newScoreA >= match.winScore || newScoreB >= match.winScore
      winner = newScoreA >= match.winScore ? 'A' : 'B'
    }

    await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scoreA: newScoreA,
        scoreB: newScoreB,
        status: won ? 'won' : tied && !tiebreakRule ? 'tied' : 'active',
        winner: won ? winner : null,
        tiebreakRule: (match as any).tiebreakRule || null
      })
    })
    fetchSession()
  }

  async function setTiebreak(matchId: number, rule: 'deuce' | 'suddendeath') {
    await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiebreakRule: rule, status: 'active' })
    })
    fetchSession()
  }

  async function confirmDone(matchId: number) {
    await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    })
    fetchSession()
  }

  async function deletePlayer(playerId: string) {
    if (!confirm('Remove this player?')) return
    await fetch(`/api/sessions/${id}/players/${playerId}`, { method: 'DELETE' })
    fetchSession()
  }

  async function deleteMatch(matchId: number) {
    if (!confirm('Delete this match?')) return
    await fetch(`/api/matches/${matchId}`, { method: 'DELETE' })
    fetchSession()
  }

  async function generateMatch(mode: string) {
    if (!openPlay) return
    const waiting = openPlay.players
    if (waiting.length < 4) {
      alert(`Need at least 4 players. You have ${waiting.length}.`)
      return
    }
    // Shuffle players
    const shuffled = [...waiting].sort(() => Math.random() - 0.5)
    let tA: string[], tB: string[]
    if (mode === 'balanced') {
      // Sort by wins descending, alternate strong/weak
      const sorted = [...waiting].sort((a, b) => b.wins - a.wins)
      tA = [sorted[0].id, sorted[3].id]
      tB = [sorted[1].id, sorted[2].id]
    } else {
      // Random or queue — just take first 4
      tA = [shuffled[0].id, shuffled[1].id]
      tB = [shuffled[2].id, shuffled[3].id]
    }
    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: id, teamA: tA, teamB: tB, winScore: mmWinScore, mode })
    })
    if (res.ok) {
      setActiveTab('matches')
      fetchSession()
    }
  }

  function getPlayerName(playerId: string) {
    return openPlay?.players.find(p => p.id === playerId)?.name || 'Unknown'
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f6f1'}}>
      <div style={{fontFamily:'monospace',color:'#666'}}>Loading...</div>
    </div>
  )

  if (!openPlay) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f6f1'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🏓</div>
        <div style={{fontWeight:'700',fontSize:'18px',marginBottom:'8px'}}>Session not found</div>
        <button onClick={() => router.push('/dashboard')} style={{background:'#166534',color:'white',border:'none',borderRadius:'8px',padding:'10px 20px',cursor:'pointer'}}>Back to Dashboard</button>
      </div>
    </div>
  )

  const userId = (session?.user as any)?.id
  const isOwner = openPlay.ownerId === userId
  const activeMatches = openPlay.matches.filter(m => m.status === 'active' || m.status === 'won' || m.status === 'tied')
  const completedMatches = openPlay.matches.filter(m => m.status === 'completed')

  return (
    <div style={{minHeight:'100vh',background:'#f8f6f1'}}>
      {/* HEADER */}
      <div style={{background:'white',borderBottom:'1px solid #e2ddd4',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <button onClick={() => router.push('/dashboard')} style={{background:'none',border:'none',cursor:'pointer',color:'#666',fontSize:'14px'}}>← Back</button>
          <div>
            <div style={{fontWeight:'800',fontSize:'20px'}}>{openPlay.name}</div>
            <div style={{fontSize:'12px',color:'#999',marginTop:'2px'}}>
              {openPlay.location || 'No location'} · {openPlay.date || 'No date'} · Room: <strong>{openPlay.roomCode}</strong>
              {isOwner && <span style={{marginLeft:'8px',fontFamily:'monospace',fontSize:'10px',background:'#f0fdf4',color:'#166534',padding:'2px 6px',borderRadius:'4px',border:'1px solid #86efac'}}>Organizer</span>}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {isOwner && (
            <button onClick={() => setShowCreateMatch(true)} style={{background:'#166534',color:'white',border:'none',borderRadius:'8px',padding:'8px 16px',cursor:'pointer',fontSize:'14px'}}>
              + Create Match
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{background:'white',borderBottom:'1px solid #e2ddd4',padding:'0 32px',display:'flex',gap:'0'}}>
        {[
          {id:'matches', label:`🏆 Live (${activeMatches.length})`},
          {id:'players', label:`👥 Players (${openPlay.players.length})`},
          {id:'matchmaking', label:'⚡ Matchmaking'},
          {id:'history', label:`📋 History (${completedMatches.length})`},
          {id:'standings', label:'📊 Standings'},
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{padding:'14px 20px',border:'none',background:'none',cursor:'pointer',fontSize:'13px',fontWeight:activeTab===tab.id?'700':'400',color:activeTab===tab.id?'#166534':'#666',borderBottom:activeTab===tab.id?'2px solid #166534':'2px solid transparent'}}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{padding:'24px 32px'}}>

        {/* LIVE MATCHES TAB */}
        {activeTab === 'matches' && (
          <div>
            {activeMatches.length === 0 ? (
              <div style={{textAlign:'center',padding:'64px 0'}}>
                <div style={{fontSize:'48px',marginBottom:'16px'}}>🏓</div>
                <div style={{fontWeight:'700',fontSize:'18px',marginBottom:'8px'}}>No active matches</div>
                <div style={{color:'#666',marginBottom:'24px'}}>Create a match to start scoring!</div>
                {isOwner && <button onClick={() => setShowCreateMatch(true)} style={{background:'#166534',color:'white',border:'none',borderRadius:'8px',padding:'10px 20px',cursor:'pointer',fontSize:'14px'}}>+ Create Match</button>}
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                {activeMatches.map(match => {
                  const tA = match.teamA.map(getPlayerName)
                  const tB = match.teamB.map(getPlayerName)
                  const isWon = match.status === 'won'
                  const isTied = match.status === 'tied'
                  const tiebreakRule = (match as any).tiebreakRule
                  const isDeuce = tiebreakRule === 'deuce'
                  const isSudden = tiebreakRule === 'suddendeath'
                  const borderColor = isWon?'#166534':isTied?'#dc2626':isDeuce?'#e8a020':isSudden?'#dc2626':'#e2ddd4'
                  return (
                    <div key={match.id} style={{background:'white',border:`2px solid ${borderColor}`,borderRadius:'14px',overflow:'hidden'}}>
                      {isWon && (
                        <div style={{background:'#166534',padding:'10px 16px',textAlign:'center',color:'white',fontWeight:'700'}}>
                          🏆 Team {match.winner} Wins! {match.scoreA} — {match.scoreB} · Press Done to save
                        </div>
                      )}
                      {isTied && (
                        <div style={{background:'#fef2f2',borderBottom:'1px solid #fca5a5',padding:'16px',textAlign:'center'}}>
                          <div style={{fontWeight:'800',fontSize:'18px',color:'#dc2626',marginBottom:'8px'}}>🔥 {match.scoreA} — {match.scoreB} · Tied!</div>
                          <div style={{fontSize:'12px',color:'#666',marginBottom:'12px'}}>Choose tiebreak rule</div>
                          <div style={{display:'flex',gap:'12px',justifyContent:'center'}}>
                            <button onClick={() => setTiebreak(match.id,'deuce')} style={{padding:'10px 20px',background:'#fff3e0',border:'2px solid #e8a020',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                              ⚔️ Deuce<br/><span style={{fontSize:'11px',color:'#666',fontWeight:'400'}}>Win by 2</span>
                            </button>
                            <button onClick={() => setTiebreak(match.id,'suddendeath')} style={{padding:'10px 20px',background:'#fef2f2',border:'2px solid #dc2626',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
                              ⚡ Sudden Death<br/><span style={{fontSize:'11px',color:'#666',fontWeight:'400'}}>Next point wins</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {isDeuce && !isWon && (
                        <div style={{background:'#fff3e0',padding:'8px 16px',textAlign:'center',borderBottom:'1px solid #e8a020',fontWeight:'700',color:'#e08c50'}}>
                          ⚔️ DEUCE — Win by 2 · {match.scoreA} : {match.scoreB}
                        </div>
                      )}
                      {isSudden && !isWon && (
                        <div style={{background:'#fef2f2',padding:'8px 16px',textAlign:'center',borderBottom:'1px solid #fca5a5',fontWeight:'700',color:'#dc2626'}}>
                          ⚡ SUDDEN DEATH — Next point wins!
                        </div>
                      )}
                      <div style={{padding:'8px 16px',background:'#f8f6f1',borderBottom:'1px solid #e2ddd4',display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontFamily:'monospace',fontSize:'11px',color:'#999'}}>Match #{match.id}</span>
                        <span style={{fontFamily:'monospace',fontSize:'11px',background:isWon?'#f0fdf4':'#fef9ee',color:isWon?'#166534':'#e08c50',padding:'2px 8px',borderRadius:'6px'}}>{isWon?'🏆 WON':isTied?'🔥 TIED':isDeuce?'⚔️ DEUCE':isSudden?'⚡ SUDDEN':'🟡 LIVE'}</span>
                      </div>
                      <div style={{padding:'24px',display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'16px',alignItems:'center'}}>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontFamily:'monospace',fontSize:'10px',color:'#999',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Team A</div>
                          {tA.map(n => <div key={n} style={{fontWeight:'600',fontSize:'15px',marginBottom:'4px'}}>{n}</div>)}
                          {isOwner && !isWon && !isTied && (
                            <div style={{display:'flex',gap:'8px',justifyContent:'center',marginTop:'12px'}}>
                              <button onClick={() => updateScore(match.id,'A',-1)} style={{width:'36px',height:'36px',border:'2px solid #fca5a5',background:'#fef2f2',borderRadius:'8px',cursor:'pointer',fontSize:'16px',color:'#dc2626'}}>−</button>
                              <button onClick={() => updateScore(match.id,'A',1)} style={{width:'36px',height:'36px',border:'2px solid #86efac',background:'#f0fdf4',borderRadius:'8px',cursor:'pointer',fontSize:'16px',color:'#166534'}}>+</button>
                            </div>
                          )}
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',marginBottom:'4px'}}>VS</div>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',justifyContent:'center'}}>
                            <span style={{fontFamily:'monospace',fontSize:'48px',fontWeight:'900',color:match.scoreA>match.scoreB?'#166534':'#333'}}>{match.scoreA}</span>
                            <span style={{fontFamily:'monospace',fontSize:'24px',color:'#ccc'}}>:</span>
                            <span style={{fontFamily:'monospace',fontSize:'48px',fontWeight:'900',color:match.scoreB>match.scoreA?'#166534':'#333'}}>{match.scoreB}</span>
                          </div>
                          <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',marginTop:'4px'}}>
                            {isDeuce?'⚔️ Win by 2':isSudden?'⚡ Next wins!':isTied?'Choose rule above':`First to ${match.winScore}`}
                          </div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontFamily:'monospace',fontSize:'10px',color:'#999',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Team B</div>
                          {tB.map(n => <div key={n} style={{fontWeight:'600',fontSize:'15px',marginBottom:'4px'}}>{n}</div>)}
                          {isOwner && !isWon && !isTied && (
                            <div style={{display:'flex',gap:'8px',justifyContent:'center',marginTop:'12px'}}>
                              <button onClick={() => updateScore(match.id,'B',1)} style={{width:'36px',height:'36px',border:'2px solid #86efac',background:'#f0fdf4',borderRadius:'8px',cursor:'pointer',fontSize:'16px',color:'#166534'}}>+</button>
                              <button onClick={() => updateScore(match.id,'B',-1)} style={{width:'36px',height:'36px',border:'2px solid #fca5a5',background:'#fef2f2',borderRadius:'8px',cursor:'pointer',fontSize:'16px',color:'#dc2626'}}>−</button>
                            </div>
                          )}
                        </div>
                      </div>
                      {isOwner && (
                        <div style={{padding:'12px 16px',borderTop:'1px solid #e2ddd4',display:'flex',justifyContent:'flex-end',gap:'8px'}}>
                          {isWon
                            ? <button onClick={() => confirmDone(match.id)} style={{padding:'8px 16px',background:'#166534',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>✅ Done</button>
                            : <button onClick={() => deleteMatch(match.id)} style={{padding:'8px 16px',background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>🗑 Delete</button>
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* MATCHMAKING TAB */}
        {activeTab === 'matchmaking' && (
          <div style={{maxWidth:'600px',margin:'0 auto'}}>
            <div style={{background:'white',border:'1px solid #e2ddd4',borderRadius:'14px',padding:'24px',marginBottom:'16px'}}>
              <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'4px'}}>// Auto Matchmaking</div>
              <p style={{color:'#666',fontSize:'14px',marginBottom:'24px'}}>Automatically generate a match from your player pool.</p>

              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Win Score</label>
                <select value={mmWinScore} onChange={e=>setMmWinScore(parseInt(e.target.value))} style={{border:'1px solid #e2ddd4',borderRadius:'8px',padding:'10px 14px',fontSize:'14px',outline:'none',background:'white',width:'140px'}}>
                  <option value={11}>11 pts</option>
                  <option value={15}>15 pts</option>
                  <option value={21}>21 pts</option>
                </select>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                {[
                  { mode:'random', icon:'🎲', title:'Random', desc:'Picks 4 random players and splits them into 2 teams. Good for casual play.' },
                  { mode:'balanced', icon:'⚖️', title:'Balanced', desc:'Pairs strongest with weakest players for fair, competitive matches.' },
                  { mode:'queue', icon:'🔢', title:'Queue', desc:'Takes the next 4 players in order. Good for organized rotation.' },
                ].map(({mode, icon, title, desc}) => (
                  <div key={mode} style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px',border:'1px solid #e2ddd4',borderRadius:'10px',background:'#f8f6f1'}}>
                    <div style={{fontSize:'28px',flexShrink:0}}>{icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:'700',fontSize:'15px',marginBottom:'2px'}}>{title}</div>
                      <div style={{fontSize:'13px',color:'#666'}}>{desc}</div>
                    </div>
                    <button
                      onClick={() => generateMatch(mode)}
                      style={{padding:'8px 18px',background:'#166534',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'500',flexShrink:0}}
                    >
                      Generate
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:'white',border:'1px solid #e2ddd4',borderRadius:'14px',padding:'24px'}}>
              <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'12px'}}>// Player Pool ({openPlay.players.length})</div>
              {openPlay.players.length === 0 ? (
                <div style={{textAlign:'center',padding:'24px',color:'#666',fontSize:'14px'}}>No players yet — add players in the Players tab first!</div>
              ) : (
                <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                  {openPlay.players.map(p => (
                    <div key={p.id} style={{display:'flex',alignItems:'center',gap:'8px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'8px',padding:'6px 12px'}}>
                      <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'#166534',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:'11px',fontWeight:'700'}}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{fontSize:'13px',fontWeight:'500'}}>{p.name}</span>
                      <span style={{fontFamily:'monospace',fontSize:'10px',color:'#166534'}}>{p.wins}W {p.losses}L</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PLAYERS TAB */}
        {activeTab === 'players' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',letterSpacing:'2px',textTransform:'uppercase'}}>{openPlay.players.length} players</div>
              {isOwner && <button onClick={() => setShowAddPlayer(true)} style={{background:'#166534',color:'white',border:'none',borderRadius:'8px',padding:'8px 16px',cursor:'pointer',fontSize:'13px'}}>+ Add Player</button>}
            </div>
            {openPlay.players.length === 0 ? (
              <div style={{textAlign:'center',padding:'48px 0'}}>
                <div style={{fontSize:'48px',marginBottom:'16px'}}>👥</div>
                <div style={{fontWeight:'700',fontSize:'18px',marginBottom:'8px'}}>No players yet</div>
                {isOwner && <button onClick={() => setShowAddPlayer(true)} style={{background:'#166534',color:'white',border:'none',borderRadius:'8px',padding:'10px 20px',cursor:'pointer',fontSize:'14px',marginTop:'16px'}}>+ Add Player</button>}
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'12px'}}>
                {openPlay.players.map(p => (
                  <div key={p.id} style={{background:'white',border:'1px solid #e2ddd4',borderRadius:'12px',padding:'16px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'#166534',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',marginBottom:'12px'}}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{fontWeight:'600',fontSize:'14px'}}>{p.name}</div>
                    <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',marginTop:'4px'}}>{p.level}</div>
                    <div style={{display:'flex',gap:'8px',marginTop:'12px',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',gap:'8px'}}>
                        <span style={{fontFamily:'monospace',fontSize:'10px',background:'#f0fdf4',color:'#166534',padding:'2px 6px',borderRadius:'4px'}}>W: {p.wins}</span>
                        <span style={{fontFamily:'monospace',fontSize:'10px',background:'#fef2f2',color:'#dc2626',padding:'2px 6px',borderRadius:'4px'}}>L: {p.losses}</span>
                      </div>
                      {isOwner && (
                        <button onClick={() => deletePlayer(p.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626',fontSize:'14px',padding:'0'}}>🗑</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            {completedMatches.length === 0 ? (
              <div style={{textAlign:'center',padding:'64px 0'}}>
                <div style={{fontSize:'48px',marginBottom:'16px'}}>📋</div>
                <div style={{fontWeight:'700',fontSize:'18px',marginBottom:'8px'}}>No completed matches yet</div>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                {[...completedMatches].reverse().map(match => {
                  const tA = match.teamA.map(getPlayerName)
                  const tB = match.teamB.map(getPlayerName)
                  const winnerNames = match.winner === 'A' ? tA.join(' & ') : tB.join(' & ')
                  return (
                    <div key={match.id} style={{background:'white',border:'1.5px solid #86efac',borderRadius:'12px',overflow:'hidden'}}>
                      <div style={{background:'#166534',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{color:'white',fontWeight:'700'}}>🏆 {winnerNames} Win! · {match.winner==='A'?match.scoreA:match.scoreB}—{match.winner==='A'?match.scoreB:match.scoreA}</span>
                        {isOwner && <button onClick={() => deleteMatch(match.id)} style={{background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'6px',padding:'4px 10px',color:'white',cursor:'pointer',fontSize:'12px'}}>🗑</button>}
                      </div>
                      <div style={{padding:'12px 16px',display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'8px',alignItems:'center'}}>
                        <div style={{textAlign:'center'}}>{tA.map(n=><div key={n} style={{fontWeight:match.winner==='A'?'700':'400',color:match.winner==='A'?'#166534':'#666',fontSize:'14px'}}>{n}</div>)}</div>
                        <div style={{fontFamily:'monospace',fontWeight:'700',fontSize:'16px',color:'#333',textAlign:'center'}}>{match.scoreA}—{match.scoreB}</div>
                        <div style={{textAlign:'center'}}>{tB.map(n=><div key={n} style={{fontWeight:match.winner==='B'?'700':'400',color:match.winner==='B'?'#166534':'#666',fontSize:'14px'}}>{n}</div>)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* STANDINGS TAB */}
        {activeTab === 'standings' && (
          <div>
            <div style={{background:'white',border:'1px solid #e2ddd4',borderRadius:'14px',overflow:'hidden'}}>
              <div style={{padding:'16px 24px',borderBottom:'1px solid #e2ddd4',fontFamily:'monospace',fontSize:'11px',color:'#999',letterSpacing:'2px',textTransform:'uppercase'}}>// Session Standings</div>
              {openPlay.players.filter(p=>p.matchesPlayed>0).length === 0 ? (
                <div style={{textAlign:'center',padding:'48px 0',color:'#666'}}>Complete matches to see standings!</div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#f8f6f1'}}>
                      {['#','Player','W','L','Win Rate'].map(h=>(
                        <th key={h} style={{padding:'10px 16px',textAlign:'left',fontFamily:'monospace',fontSize:'10px',color:'#999',letterSpacing:'2px',textTransform:'uppercase',borderBottom:'1.5px solid #e2ddd4'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...openPlay.players].filter(p=>p.matchesPlayed>0).sort((a,b)=>b.wins-a.wins).map((p,i)=>{
                      const wr = p.matchesPlayed > 0 ? Math.round((p.wins/p.matchesPlayed)*100) : 0
                      return (
                        <tr key={p.id} style={{borderBottom:'1px solid #e2ddd4'}}>
                          <td style={{padding:'12px 16px',fontSize:'18px'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
                          <td style={{padding:'12px 16px',fontWeight:'600',fontSize:'14px'}}>{p.name}</td>
                          <td style={{padding:'12px 16px',color:'#166534',fontWeight:'700'}}>{p.wins}</td>
                          <td style={{padding:'12px 16px',color:'#dc2626'}}>{p.losses}</td>
                          <td style={{padding:'12px 16px'}}>
                            <div style={{fontFamily:'monospace',fontSize:'12px',marginBottom:'4px'}}>{wr}%</div>
                            <div style={{height:'4px',width:'80px',background:'#e2ddd4',borderRadius:'2px'}}>
                              <div style={{height:'100%',width:`${wr}%`,background:wr>=70?'#166534':wr>=50?'#e8a020':'#dc2626',borderRadius:'2px'}}/>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD PLAYER MODAL */}
      {showAddPlayer && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:'16px',padding:'32px',width:'100%',maxWidth:'400px',margin:'16px'}}>
            <h2 style={{fontSize:'20px',fontWeight:'800',marginBottom:'4px'}}>Add Player</h2>
            <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',marginBottom:'24px'}}></div>
            <form onSubmit={addPlayer}>
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Player Name</label>
                <input type="text" value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="Enter name" required style={{width:'100%',border:'1px solid #e2ddd4',borderRadius:'8px',padding:'12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}} />
              </div>
              <div style={{marginBottom:'24px'}}>
                <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Level</label>
                <select value={playerLevel} onChange={e=>setPlayerLevel(e.target.value)} style={{width:'100%',border:'1px solid #e2ddd4',borderRadius:'8px',padding:'12px',fontSize:'14px',outline:'none',background:'white'}}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div style={{display:'flex',gap:'12px'}}>
                <button type="button" onClick={() => setShowAddPlayer(false)} style={{flex:1,padding:'12px',border:'1px solid #e2ddd4',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'14px'}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:'12px',background:'#166534',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Add Player</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MATCH MODAL */}
      {showCreateMatch && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <div style={{background:'white',borderRadius:'16px',padding:'32px',width:'100%',maxWidth:'560px',margin:'16px'}}>
            <h2 style={{fontSize:'20px',fontWeight:'800',marginBottom:'4px'}}>Create Match</h2>
            <div style={{fontFamily:'monospace',fontSize:'11px',color:'#999',marginBottom:'16px'}}>// Pick players for each team</div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'11px',color:'#666',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px'}}>Win Score</label>
              <select value={winScore} onChange={e=>setWinScore(parseInt(e.target.value))} style={{border:'1px solid #e2ddd4',borderRadius:'8px',padding:'8px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                <option value={11}>11 pts</option>
                <option value={15}>15 pts</option>
                <option value={21}>21 pts</option>
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'16px',alignItems:'start',marginBottom:'24px'}}>
              <div>
                <div style={{fontFamily:'monospace',fontSize:'11px',color:'#166534',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px',borderBottom:'2px solid #166534',paddingBottom:'4px'}}>Team A</div>
                {openPlay.players.map(p => (
                  <label key={p.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 0',cursor:'pointer',fontSize:'14px'}}>
                    <input type="checkbox" checked={teamA.includes(p.id)} onChange={e => {
                      if(e.target.checked) setTeamA([...teamA, p.id])
                      else setTeamA(teamA.filter(id=>id!==p.id))
                    }} />
                    {p.name}
                  </label>
                ))}
              </div>
              <div style={{fontFamily:'monospace',fontSize:'18px',color:'#ccc',paddingTop:'32px',textAlign:'center'}}>VS</div>
              <div>
                <div style={{fontFamily:'monospace',fontSize:'11px',color:'#1a6598',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'8px',borderBottom:'2px solid #1a6598',paddingBottom:'4px'}}>Team B</div>
                {openPlay.players.map(p => (
                  <label key={p.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 0',cursor:'pointer',fontSize:'14px'}}>
                    <input type="checkbox" checked={teamB.includes(p.id)} onChange={e => {
                      if(e.target.checked) setTeamB([...teamB, p.id])
                      else setTeamB(teamB.filter(id=>id!==p.id))
                    }} />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:'12px'}}>
              <button onClick={() => setShowCreateMatch(false)} style={{flex:1,padding:'12px',border:'1px solid #e2ddd4',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'14px'}}>Cancel</button>
              <button onClick={createMatch as any} style={{flex:1,padding:'12px',background:'#166534',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>🏓 Start Match</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
