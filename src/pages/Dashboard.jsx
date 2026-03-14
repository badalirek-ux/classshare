import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { supabase, STORAGE_BUCKET } from '../supabase'
import { signOut, updatePassword } from 'firebase/auth'
import { db, auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import UploadModal from '../components/UploadModal'
import AdminPanel from './AdminPanel'

const CATEGORIES = ['Tutti', 'Codice', 'Documenti', 'Immagini', 'Altro']
const CODE_EXTS = ['js','jsx','ts','tsx','html','css','php','py','java','c','cpp','json','md','txt','xml','yaml','yml','sh','sql','vue','svelte','rs','go']
const CAT_COLORS = {
  Codice:    { bg: 'rgba(124,109,250,0.12)', text: '#a99bfc', border: 'rgba(124,109,250,0.25)' },
  Documenti: { bg: 'rgba(56,189,248,0.12)',  text: '#7dd3fc', border: 'rgba(56,189,248,0.25)' },
  Immagini:  { bg: 'rgba(52,211,153,0.12)',  text: '#6ee7b7', border: 'rgba(52,211,153,0.25)' },
  Altro:     { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8', border: 'rgba(148,163,184,0.25)' }
}
const EXT_LABELS = {
  pdf:'PDF',zip:'ZIP',js:'JS',jsx:'JSX',ts:'TS',tsx:'TSX',html:'HTM',css:'CSS',
  png:'PNG',jpg:'JPG',jpeg:'JPG',gif:'GIF',svg:'SVG',mp4:'MP4',mp3:'MP3',
  docx:'DOC',xlsx:'XLS',pptx:'PPT',txt:'TXT',json:'JSON',md:'MD',php:'PHP',
  py:'PY',java:'JAVA',sql:'SQL',vue:'VUE',sh:'SH'
}
const AVATAR_COLORS = ['#7c6dfa','#38bdf8','#34d399','#fb923c','#f472b6','#a3e635']

function getExt(name) { return name.split('.').pop().toLowerCase() }
function fmtSize(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB'
  return (b/1048576).toFixed(1) + ' MB'
}
function fmtDate(ts) {
  if (!ts) return ''
  const d = ts.toDate(), now = new Date(), diff = Math.floor((now-d)/1000)
  if (diff < 60) return 'Adesso'
  if (diff < 3600) return Math.floor(diff/60) + 'm fa'
  if (diff < 86400) return Math.floor(diff/3600) + 'h fa'
  if (diff < 604800) return Math.floor(diff/86400) + 'g fa'
  return d.toLocaleDateString('it-IT',{day:'numeric',month:'short'})
}
function initials(n) { return (n||'?').split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()).join('') }
function avatarColor(str) {
  let h=0; for (let c of (str||'')) h=c.charCodeAt(0)+((h<<5)-h)
  return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]
}

async function forceDownload(file) {
  const res = await fetch(file.url)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

function CodePreviewModal({ file, onClose }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(file.url)
      .then(r => r.text())
      .then(t => { setCode(t); setLoading(false) })
      .catch(() => { setCode('Impossibile caricare il file.'); setLoading(false) })
  }, [file.url])

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.previewModal}>
        <div style={s.previewHeader}>
          <div>
            <p style={s.previewTitle}>{file.name}</p>
            <p style={s.previewMeta}>{fmtSize(file.size)} · caricato da {file.uploaderName}</p>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <button style={s.btnDownload} onClick={() => forceDownload(file)}>↓ Scarica</button>
            <button style={s.close} onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={s.previewBody}>
          {loading
            ? <p style={{color:'#6b6b75',fontSize:'14px'}}>Caricamento...</p>
            : <pre style={s.pre}><code>{code}</code></pre>
          }
        </div>
      </div>
    </div>
  )
}

function ProfileModal({ user, profile, files, onClose }) {
  const myFiles = files.filter(f => f.uploadedBy === user.uid)
  const [showPwd, setShowPwd] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  const handleChangePwd = async () => {
    setPwdMsg(''); setPwdError('')
    if (newPwd.length < 6) { setPwdError('Minimo 6 caratteri.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Le password non coincidono.'); return }
    setPwdLoading(true)
    try {
      await updatePassword(user, newPwd)
      setPwdMsg('Password aggiornata!')
      setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setShowPwd(false), 1500)
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setPwdError('Sessione scaduta. Esci e rientra, poi riprova.')
      } else {
        setPwdError('Errore: ' + err.message)
      }
    }
    setPwdLoading(false)
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{...s.baseModal, maxWidth:'500px'}}>
        <div style={s.previewHeader}>
          <p style={s.previewTitle}>Il mio profilo</p>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'16px',padding:'1.25rem 0',borderBottom:'1px solid #1e1e23',marginTop:'4px'}}>
          <div style={{...s.bigAvatar, background: avatarColor(profile?.name)}}>
            {initials(profile?.name)}
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:'18px',fontWeight:'600',color:'#e8e6e0'}}>{profile?.name}</p>
            <p style={{fontSize:'13px',color:'#6b6b75',marginTop:'3px'}}>{user.email}</p>
            <p style={{fontSize:'13px',color:'#a99bfc',marginTop:'6px'}}>{myFiles.length} file caricati</p>
          </div>
        </div>

        <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
          <button style={s.btnOutline} onClick={() => { setShowPwd(v => !v); setPwdMsg(''); setPwdError('') }}>
            {showPwd ? 'Annulla' : '🔑 Cambia password'}
          </button>
          <button style={s.btnLogout} onClick={() => { signOut(auth); onClose() }}>
            ↩ Esci dall'account
          </button>
        </div>

        {showPwd && (
          <div style={{display:'flex',flexDirection:'column',gap:'10px',marginTop:'14px',padding:'14px',background:'#0e0e10',borderRadius:'10px'}}>
            <input style={s.inputDark} type="password" placeholder="Nuova password (min 6 caratteri)"
              value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            <input style={s.inputDark} type="password" placeholder="Conferma nuova password"
              value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            {pwdError && <p style={{fontSize:'12px',color:'#f87171',margin:0}}>{pwdError}</p>}
            {pwdMsg && <p style={{fontSize:'12px',color:'#34d399',margin:0}}>{pwdMsg}</p>}
            <button style={pwdLoading ? s.btnDisabled : s.btn} onClick={handleChangePwd} disabled={pwdLoading}>
              {pwdLoading ? 'Salvataggio...' : 'Salva nuova password'}
            </button>
          </div>
        )}

        <div style={{marginTop:'16px'}}>
          <p style={{fontSize:'11px',color:'#4a4a55',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px'}}>I miei file</p>
          {myFiles.length === 0
            ? <p style={{fontSize:'13px',color:'#6b6b75'}}>Nessun file caricato ancora.</p>
            : <div style={{display:'flex',flexDirection:'column',gap:'8px',maxHeight:'240px',overflowY:'auto'}}>
                {myFiles.map(f => (
                  <div key={f.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#0e0e10',borderRadius:'8px'}}>
                    <div>
                      <p style={{fontSize:'13px',color:'#e8e6e0',fontWeight:'500'}}>{f.name}</p>
                      <p style={{fontSize:'11px',color:'#4a4a55',marginTop:'2px'}}>{fmtSize(f.size)} · {fmtDate(f.createdAt)}</p>
                    </div>
                    <span style={{fontSize:'11px',padding:'3px 8px',borderRadius:'20px',background:'rgba(124,109,250,0.12)',color:'#a99bfc'}}>{f.category}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [files, setFiles] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Tutti')
  const [showUpload, setShowUpload] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'files'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => setFiles(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  const filtered = files.filter(f => {
    const matchCat = category === 'Tutti' || f.category === category
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.tags||[]).some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      f.uploaderName?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleDelete = async (file) => {
    if (!confirm(`Eliminare "${file.name}"?`)) return
    try { if (file.storagePath) await supabase.storage.from(STORAGE_BUCKET).remove([file.storagePath]) } catch {}
    await deleteDoc(doc(db, 'files', file.id))
  }

  return (
    <div style={s.page}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <span style={s.brandIcon}>⬡</span>
          <span style={s.brandName}>ClassShare</span>
        </div>
        <nav style={s.nav}>
          <p style={s.navLabel}>Categorie</p>
          {CATEGORIES.map(c => (
            <button key={c} style={category===c ? s.navItemActive : s.navItem} onClick={() => setCategory(c)}>
              {c==='Tutti' ? 'Tutti i file' : c}
              {c!=='Tutti' && <span style={s.count}>{files.filter(f=>f.category===c).length}</span>}
            </button>
          ))}
        </nav>
        <button style={s.adminBtn} onClick={() => setShowAdmin(true)}>⚙️ Admin</button>
        <div style={s.profileBar} onClick={() => setShowProfile(true)}>
          <div style={{...s.avatar, background: avatarColor(profile?.name)}}>
            {initials(profile?.name || user?.email)}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={s.profileName}>{profile?.name || 'Utente'}</p>
            <p style={s.profileSub}>{profile?.fileCount || 0} file caricati</p>
          </div>
          <button style={s.logoutBtn} onClick={e => { e.stopPropagation(); signOut(auth) }} title="Esci">↩</button>
        </div>
      </aside>

      <main style={s.main}>
        <div style={s.topBar}>
          <div>
            <h1 style={s.heading}>{category==='Tutti' ? 'Tutti i file' : category}</h1>
            <p style={s.subheading}>{filtered.length} file trovati</p>
          </div>
          <button style={s.uploadBtn} onClick={() => setShowUpload(true)}>+ Carica file</button>
        </div>

        <input style={s.search} placeholder="Cerca per nome, tag, autore..."
          value={search} onChange={e => setSearch(e.target.value)} />

        {filtered.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyIcon}>◻</p>
            <p style={s.emptyText}>Nessun file trovato.</p>
            <p style={s.emptySub}>Prova a cambiare categoria o carica il primo file!</p>
          </div>
        ) : (
          <div style={s.grid}>
            {filtered.map(file => {
              const ext = getExt(file.name)
              const label = EXT_LABELS[ext] || ext.toUpperCase().slice(0,4)
              const cat = CAT_COLORS[file.category] || CAT_COLORS['Altro']
              const isOwn = file.uploadedBy === user.uid
              const isCode = CODE_EXTS.includes(ext)
              return (
                <div key={file.id} style={s.card}>
                  <div style={s.cardTop}>
                    <div style={s.extBadge}>{label}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={s.fileName}>{file.name}</p>
                      <p style={s.fileMeta}>{fmtSize(file.size)} · {fmtDate(file.createdAt)}</p>
                    </div>
                  </div>
                  <div style={s.cardMid}>
                    <span style={{...s.catBadge, background:cat.bg, color:cat.text, border:`1px solid ${cat.border}`}}>
                      {file.category}
                    </span>
                    {(file.tags||[]).map(t => <span key={t} style={s.tagBadge}>{t}</span>)}
                  </div>
                  <div style={s.cardBottom}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div style={{...s.miniAvatar, background: avatarColor(file.uploaderName)}}>
                        {initials(file.uploaderName)}
                      </div>
                      <span style={s.uploaderName}>{file.uploaderName}</span>
                    </div>
                    <div style={{display:'flex',gap:'8px'}}>
                      {isCode && (
                        <button style={s.previewBtn} onClick={() => setPreviewFile(file)} title="Anteprima codice">
                          {'</>'}
                        </button>
                      )}
                      <button style={s.actionBtn} onClick={() => forceDownload(file)} title="Scarica">↓</button>
                      {isOwn && <button style={s.deleteBtn} onClick={() => handleDelete(file)}>✕</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => {}} />}
      {previewFile && <CodePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {showProfile && <ProfileModal user={user} profile={profile} files={files} onClose={() => setShowProfile(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  )
}

const s = {
  page: { display:'flex', minHeight:'100vh', background:'#0e0e10' },
  sidebar: { width:'220px', flexShrink:0, background:'#17171a', borderRight:'1px solid #1e1e23', display:'flex', flexDirection:'column', padding:'1.5rem 1rem' },
  brand: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'2rem' },
  brandIcon: { fontSize:'20px', color:'#7c6dfa' },
  brandName: { fontSize:'16px', fontWeight:'600', color:'#e8e6e0', letterSpacing:'-0.3px' },
  nav: { flex:1, display:'flex', flexDirection:'column', gap:'2px' },
  navLabel: { fontSize:'11px', color:'#4a4a55', letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:'8px', marginLeft:'10px' },
  navItem: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:'8px', border:'none', background:'transparent', color:'#6b6b75', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', textAlign:'left', width:'100%' },
  navItemActive: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:'8px', border:'none', background:'rgba(124,109,250,0.12)', color:'#a99bfc', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', textAlign:'left', width:'100%', fontWeight:'500' },
  count: { fontSize:'11px', background:'#2a2a2f', color:'#6b6b75', padding:'1px 7px', borderRadius:'20px' },
  adminBtn: { display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', borderRadius:'8px', border:'1px solid #2a2a2f', background:'transparent', color:'#6b6b75', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', width:'100%', marginBottom:'8px' },
  profileBar: { display:'flex', alignItems:'center', gap:'10px', borderTop:'1px solid #1e1e23', paddingTop:'1rem', marginTop:'auto', cursor:'pointer', borderRadius:'8px', padding:'10px' },
  avatar: { width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'500', color:'#fff', flexShrink:0 },
  bigAvatar: { width:'56px', height:'56px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'500', color:'#fff', flexShrink:0 },
  profileName: { fontSize:'13px', fontWeight:'500', color:'#e8e6e0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  profileSub: { fontSize:'11px', color:'#4a4a55' },
  logoutBtn: { background:'none', border:'none', color:'#4a4a55', cursor:'pointer', fontSize:'16px', padding:'4px', flexShrink:0 },
  main: { flex:1, padding:'2rem', overflowY:'auto' },
  topBar: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' },
  heading: { fontSize:'22px', fontWeight:'600', color:'#e8e6e0', letterSpacing:'-0.4px' },
  subheading: { fontSize:'13px', color:'#4a4a55', marginTop:'3px' },
  uploadBtn: { background:'#7c6dfa', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'500', cursor:'pointer', fontFamily:'DM Sans,sans-serif', whiteSpace:'nowrap' },
  search: { width:'100%', background:'#17171a', border:'1px solid #2a2a2f', borderRadius:'10px', padding:'10px 16px', color:'#e8e6e0', fontSize:'14px', fontFamily:'DM Sans,sans-serif', outline:'none', marginBottom:'1.5rem' },
  empty: { textAlign:'center', paddingTop:'4rem' },
  emptyIcon: { fontSize:'40px', marginBottom:'12px', color:'#2a2a2f' },
  emptyText: { fontSize:'16px', color:'#6b6b75', fontWeight:'500' },
  emptySub: { fontSize:'13px', color:'#4a4a55', marginTop:'6px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'14px' },
  card: { background:'#17171a', border:'1px solid #1e1e23', borderRadius:'12px', padding:'1rem', display:'flex', flexDirection:'column', gap:'12px' },
  cardTop: { display:'flex', gap:'12px', alignItems:'flex-start' },
  extBadge: { background:'#1e1e23', color:'#6b6b75', borderRadius:'6px', padding:'6px 8px', fontSize:'11px', fontWeight:'500', fontFamily:'DM Mono,monospace', flexShrink:0, letterSpacing:'0.5px' },
  fileName: { fontSize:'13px', fontWeight:'500', color:'#e8e6e0', wordBreak:'break-all', lineHeight:'1.4' },
  fileMeta: { fontSize:'11px', color:'#4a4a55', marginTop:'3px' },
  cardMid: { display:'flex', flexWrap:'wrap', gap:'6px' },
  catBadge: { fontSize:'11px', padding:'3px 10px', borderRadius:'20px', fontWeight:'500' },
  tagBadge: { fontSize:'11px', padding:'3px 10px', borderRadius:'20px', background:'#1e1e23', color:'#6b6b75', border:'1px solid #2a2a2f' },
  cardBottom: { display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #1e1e23', paddingTop:'10px' },
  miniAvatar: { width:'22px', height:'22px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:'500', color:'#fff' },
  uploaderName: { fontSize:'12px', color:'#6b6b75' },
  actionBtn: { display:'flex', alignItems:'center', justifyContent:'center', width:'30px', height:'30px', borderRadius:'6px', background:'rgba(124,109,250,0.12)', color:'#a99bfc', fontSize:'16px', border:'1px solid rgba(124,109,250,0.2)', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  previewBtn: { display:'flex', alignItems:'center', justifyContent:'center', width:'30px', height:'30px', borderRadius:'6px', background:'rgba(56,189,248,0.1)', color:'#7dd3fc', fontSize:'10px', border:'1px solid rgba(56,189,248,0.2)', cursor:'pointer', fontFamily:'DM Mono,monospace', fontWeight:'500' },
  deleteBtn: { display:'flex', alignItems:'center', justifyContent:'center', width:'30px', height:'30px', borderRadius:'6px', background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.2)', cursor:'pointer', fontSize:'12px', fontFamily:'DM Sans,sans-serif' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'1rem' },
  baseModal: { background:'#17171a', border:'1px solid #2a2a2f', borderRadius:'16px', padding:'1.75rem', width:'100%', display:'flex', flexDirection:'column', gap:'4px' },
  previewModal: { background:'#17171a', border:'1px solid #2a2a2f', borderRadius:'16px', width:'100%', maxWidth:'800px', maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' },
  previewHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'1.25rem 1.5rem', borderBottom:'1px solid #1e1e23' },
  previewTitle: { fontSize:'15px', fontWeight:'600', color:'#e8e6e0' },
  previewMeta: { fontSize:'12px', color:'#6b6b75', marginTop:'3px' },
  previewBody: { flex:1, overflow:'auto', padding:'1.25rem 1.5rem' },
  pre: { fontFamily:'DM Mono,monospace', fontSize:'13px', color:'#e8e6e0', lineHeight:'1.6', whiteSpace:'pre-wrap', wordBreak:'break-all', margin:0 },
  btnDownload: { padding:'7px 16px', border:'1px solid rgba(124,109,250,0.3)', borderRadius:'8px', background:'rgba(124,109,250,0.12)', color:'#a99bfc', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  close: { background:'none', border:'none', color:'#6b6b75', cursor:'pointer', fontSize:'16px', padding:'4px 8px', borderRadius:'6px' },
  btnOutline: { flex:1, padding:'9px 14px', border:'1px solid #2a2a2f', borderRadius:'8px', background:'transparent', color:'#9b9ba8', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  btnLogout: { flex:1, padding:'9px 14px', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'8px', background:'rgba(248,113,113,0.08)', color:'#f87171', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  btn: { padding:'10px', border:'none', borderRadius:'8px', background:'#7c6dfa', color:'#fff', fontSize:'13px', fontWeight:'500', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  btnDisabled: { padding:'10px', border:'none', borderRadius:'8px', background:'#3d3860', color:'#9b9ba8', fontSize:'13px', cursor:'not-allowed', fontFamily:'DM Sans,sans-serif' },
  inputDark: { background:'#17171a', border:'1px solid #2a2a2f', borderRadius:'8px', padding:'9px 12px', color:'#e8e6e0', fontSize:'13px', fontFamily:'DM Sans,sans-serif', outline:'none' },
}
