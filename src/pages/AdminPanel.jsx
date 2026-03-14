import { useState } from 'react'
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { supabase, STORAGE_BUCKET } from '../supabase'
import { sendPasswordResetEmail } from 'firebase/auth'

const ADMIN_PASSWORD = 'classAdmin@SteveJobs2025'

function fmtSize(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB'
  return (b/1048576).toFixed(1) + ' MB'
}
function fmtDate(ts) {
  if (!ts) return ''
  return ts.toDate().toLocaleDateString('it-IT', { day:'numeric', month:'short', year:'numeric' })
}

export default function AdminPanel({ onClose }) {
  const [authed, setAuthed] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [tab, setTab] = useState('files')
  const [files, setFiles] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('ok')

  const notify = (text, type = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  const login = async () => {
    if (pwd !== ADMIN_PASSWORD) { setPwdError('Password errata.'); return }
    setAuthed(true)
    setLoading(true)
    const fSnap = await getDocs(query(collection(db, 'files'), orderBy('createdAt', 'desc')))
    setFiles(fSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    const uSnap = await getDocs(collection(db, 'profiles'))
    setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  const deleteFile = async (file) => {
    if (!confirm(`Eliminare "${file.name}"?`)) return
    try { if (file.storagePath) await supabase.storage.from(STORAGE_BUCKET).remove([file.storagePath]) } catch {}
    await deleteDoc(doc(db, 'files', file.id))
    setFiles(f => f.filter(x => x.id !== file.id))
    notify('File eliminato.')
  }

  const deleteAllFiles = async () => {
    if (!confirm(`Eliminare TUTTI i ${files.length} file? Operazione irreversibile.`)) return
    setLoading(true)
    const paths = files.filter(f => f.storagePath).map(f => f.storagePath)
    if (paths.length) await supabase.storage.from(STORAGE_BUCKET).remove(paths)
    for (const f of files) await deleteDoc(doc(db, 'files', f.id))
    setFiles([])
    setLoading(false)
    notify('Tutti i file eliminati.')
  }

  const sendReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
      notify(`Email di reset inviata a ${email}`)
    } catch (err) {
      notify('Errore: ' + err.message, 'err')
    }
  }

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0)

  if (!authed) return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.loginBox}>
        <div style={s.header}>
          <p style={s.title}>Pannello Admin</p>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        <p style={{fontSize:'13px',color:'#6b6b75',marginBottom:'16px'}}>Accesso riservato.</p>
        <input style={s.input} type="password" placeholder="Password admin"
          value={pwd} onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()} autoFocus />
        {pwdError && <p style={{fontSize:'12px',color:'#f87171',marginTop:'8px'}}>{pwdError}</p>}
        <button style={{...s.btn, marginTop:'14px', width:'100%'}} onClick={login}>Accedi</button>
      </div>
    </div>
  )

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.panel}>
        <div style={s.header}>
          <p style={s.title}>Pannello Admin</p>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <div style={s.stats}>
          <div style={s.stat}><p style={s.statVal}>{files.length}</p><p style={s.statLbl}>File totali</p></div>
          <div style={s.stat}><p style={s.statVal}>{users.length}</p><p style={s.statLbl}>Utenti</p></div>
          <div style={s.stat}><p style={s.statVal}>{fmtSize(totalSize)}</p><p style={s.statLbl}>Spazio usato</p></div>
        </div>

        {msg && <p style={{...s.msgBox, background: msgType==='err' ? '#2a1515' : '#0f2a1a', color: msgType==='err' ? '#f87171' : '#34d399'}}>{msg}</p>}

        <div style={s.tabs}>
          <button style={tab==='files' ? s.tabActive : s.tabBtn} onClick={() => setTab('files')}>File ({files.length})</button>
          <button style={tab==='users' ? s.tabActive : s.tabBtn} onClick={() => setTab('users')}>Utenti ({users.length})</button>
        </div>

        {loading ? (
          <p style={{fontSize:'13px',color:'#6b6b75',padding:'1rem 0'}}>Caricamento...</p>
        ) : tab === 'files' ? (
          <div style={{display:'flex',flexDirection:'column',gap:'10px',overflow:'hidden'}}>
            {files.length > 0 && (
              <button style={s.btnDanger} onClick={deleteAllFiles}>
                Elimina tutti i file ({files.length})
              </button>
            )}
            <div style={s.list}>
              {files.length === 0
                ? <p style={{fontSize:'13px',color:'#6b6b75',padding:'0.5rem 0'}}>Nessun file.</p>
                : files.map(f => (
                  <div key={f.id} style={s.row}>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={s.rowName}>{f.name}</p>
                      <p style={s.rowMeta}>{fmtSize(f.size)} · {f.uploaderName} · {fmtDate(f.createdAt)}</p>
                    </div>
                    <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                      <span style={s.catPill}>{f.category}</span>
                      <button style={s.btnSmallDanger} onClick={() => deleteFile(f)}>✕</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        ) : (
          <div style={s.list}>
            {users.length === 0
              ? <p style={{fontSize:'13px',color:'#6b6b75',padding:'0.5rem 0'}}>Nessun utente.</p>
              : users.map(u => (
                <div key={u.id} style={s.row}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={s.rowName}>{u.name}</p>
                    <p style={s.rowMeta}>{u.email} · {u.fileCount || 0} file caricati</p>
                  </div>
                  <button style={s.btnSmallOutline} onClick={() => sendReset(u.email)}>
                    Reset pwd
                  </button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'1rem' },
  loginBox: { background:'#17171a', border:'1px solid #2a2a2f', borderRadius:'16px', padding:'1.75rem', width:'100%', maxWidth:'360px', display:'flex', flexDirection:'column' },
  panel: { background:'#17171a', border:'1px solid #2a2a2f', borderRadius:'16px', padding:'1.75rem', width:'100%', maxWidth:'620px', maxHeight:'85vh', display:'flex', flexDirection:'column', gap:'14px', overflow:'hidden' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  title: { fontSize:'16px', fontWeight:'600', color:'#e8e6e0' },
  close: { background:'none', border:'none', color:'#6b6b75', cursor:'pointer', fontSize:'16px', padding:'4px 8px', borderRadius:'6px' },
  stats: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' },
  stat: { background:'#0e0e10', borderRadius:'8px', padding:'12px', textAlign:'center' },
  statVal: { fontSize:'20px', fontWeight:'600', color:'#e8e6e0' },
  statLbl: { fontSize:'11px', color:'#4a4a55', marginTop:'3px' },
  msgBox: { fontSize:'13px', borderRadius:'8px', padding:'10px 14px' },
  tabs: { display:'flex', gap:'4px', background:'#0e0e10', borderRadius:'8px', padding:'4px' },
  tabBtn: { flex:1, padding:'7px', border:'none', borderRadius:'6px', cursor:'pointer', background:'transparent', color:'#6b6b75', fontSize:'13px', fontFamily:'DM Sans,sans-serif' },
  tabActive: { flex:1, padding:'7px', border:'none', borderRadius:'6px', cursor:'pointer', background:'#2a2a2f', color:'#e8e6e0', fontSize:'13px', fontWeight:'500', fontFamily:'DM Sans,sans-serif' },
  list: { overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'8px', maxHeight:'340px' },
  row: { display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', background:'#0e0e10', borderRadius:'8px' },
  rowName: { fontSize:'13px', fontWeight:'500', color:'#e8e6e0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  rowMeta: { fontSize:'11px', color:'#4a4a55', marginTop:'2px' },
  catPill: { fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background:'rgba(124,109,250,0.12)', color:'#a99bfc', whiteSpace:'nowrap' },
  input: { background:'#0e0e10', border:'1px solid #2a2a2f', borderRadius:'8px', padding:'10px 14px', color:'#e8e6e0', fontSize:'14px', fontFamily:'DM Sans,sans-serif', outline:'none' },
  btn: { padding:'10px 20px', border:'none', borderRadius:'8px', background:'#7c6dfa', color:'#fff', fontSize:'14px', fontWeight:'500', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  btnDanger: { padding:'9px 16px', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'8px', background:'rgba(248,113,113,0.08)', color:'#f87171', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', textAlign:'left' },
  btnSmallDanger: { width:'28px', height:'28px', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'6px', background:'rgba(248,113,113,0.08)', color:'#f87171', fontSize:'11px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', flexShrink:0 },
  btnSmallOutline: { padding:'5px 10px', border:'1px solid #2a2a2f', borderRadius:'6px', background:'transparent', color:'#9b9ba8', fontSize:'12px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', whiteSpace:'nowrap' },
}
