import { useState, useRef } from 'react'
import { supabase, STORAGE_BUCKET } from '../supabase'
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['Codice', 'Documenti', 'Immagini', 'Altro']
const LANGUAGES = ['js','jsx','ts','tsx','html','css','php','py','java','c','cpp','json','sql','sh','md','txt','vue','xml']

export default function UploadModal({ onClose, onSuccess }) {
  const { user, profile } = useAuth()
  const [mode, setMode] = useState('file')
  const [files, setFiles] = useState([])
  const [category, setCategory] = useState('Codice')
  const [tags, setTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState([])
  const [error, setError] = useState('')
  const [codeText, setCodeText] = useState('')
  const [codeLang, setCodeLang] = useState('js')
  const [codeName, setCodeName] = useState('')
  const fileRef = useRef()

  const fmt = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB'
    return (bytes/1048576).toFixed(1) + ' MB'
  }

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    setFiles(prev => {
      const existing = prev.map(f => f.name)
      const toAdd = arr.filter(f => !existing.includes(f.name))
      return [...prev, ...toAdd]
    })
  }

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name))

  const uploadSingle = async (file, index) => {
    const fileName = `${user.uid}_${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET).upload(fileName, file, { upsert: false })
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
    await addDoc(collection(db, 'files'), {
      name: file.name, url: urlData.publicUrl, storagePath: fileName,
      size: file.size, category, tags: tagList,
      uploadedBy: user.uid, uploaderName: profile?.name || user.email,
      createdAt: serverTimestamp()
    })
    setUploadStatus(prev => prev.map((s, i) => i === index ? 'done' : s))
  }

  const handleUploadFiles = async () => {
    if (files.length === 0) { setError('Seleziona almeno un file.'); return }
    setUploading(true); setError('')
    setUploadStatus(files.map(() => 'pending'))
    let failed = 0
    for (let i = 0; i < files.length; i++) {
      setUploadStatus(prev => prev.map((s, idx) => idx === i ? 'uploading' : s))
      try {
        await uploadSingle(files[i], i)
      } catch (err) {
        setUploadStatus(prev => prev.map((s, idx) => idx === i ? 'error' : s))
        failed++
      }
    }
    await updateDoc(doc(db, 'profiles', user.uid), { fileCount: increment(files.length - failed) })
    setUploading(false)
    if (failed === 0) { onSuccess(); onClose() }
    else setError(`${failed} file non caricati. Gli altri sono stati salvati.`)
  }

  const handleUploadCode = async () => {
    if (!codeText.trim()) { setError('Incolla del codice prima.'); return }
    const name = (codeName.trim() || 'snippet') + '.' + codeLang
    setUploading(true); setError('')
    setUploadStatus(['uploading'])
    try {
      const blob = new Blob([codeText], { type: 'text/plain' })
      const fileName = `${user.uid}_${Date.now()}_${name}`
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET).upload(fileName, blob, { upsert: false })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
      await addDoc(collection(db, 'files'), {
        name, url: urlData.publicUrl, storagePath: fileName,
        size: blob.size, category, tags: tagList,
        uploadedBy: user.uid, uploaderName: profile?.name || user.email,
        createdAt: serverTimestamp()
      })
      await updateDoc(doc(db, 'profiles', user.uid), { fileCount: increment(1) })
      setUploading(false); onSuccess(); onClose()
    } catch (err) {
      setError('Errore: ' + err.message); setUploading(false)
    }
  }

  const statusIcon = (st) => st === 'done' ? '✓' : st === 'error' ? '✕' : st === 'uploading' ? '↑' : '○'
  const statusColor = (st) => st === 'done' ? '#34d399' : st === 'error' ? '#f87171' : st === 'uploading' ? '#a99bfc' : '#4a4a55'

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>Condividi con la classe</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <div style={s.modeTabs}>
          <button style={mode === 'file' ? s.modeActive : s.modeTab} onClick={() => { setMode('file'); setError('') }}>
            📁 Carica file
          </button>
          <button style={mode === 'code' ? s.modeActive : s.modeTab} onClick={() => { setMode('code'); setError('') }}>
            {'</>'} Incolla codice
          </button>
        </div>

        {mode === 'file' ? (
          <div>
            <div
              style={s.dropzone}
              onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
            >
              <input ref={fileRef} type="file" style={{ display: 'none' }} multiple
                onChange={e => addFiles(e.target.files)} />
              {files.length === 0 ? (
                <div>
                  <p style={s.dropText}>Trascina qui o clicca per scegliere</p>
                  <p style={s.dropSub}>Puoi selezionare più file insieme</p>
                </div>
              ) : (
                <p style={{color:'#6b6b75', fontSize:'13px'}}>+ Aggiungi altri file</p>
              )}
            </div>

            {files.length > 0 && (
              <div style={s.fileList}>
                {files.map((f, i) => (
                  <div key={f.name} style={s.fileRow}>
                    <span style={{fontSize:'12px', color: statusColor(uploadStatus[i]), minWidth:'16px'}}>
                      {uploadStatus[i] ? statusIcon(uploadStatus[i]) : '○'}
                    </span>
                    <div style={{flex:1, minWidth:0}}>
                      <p style={{fontSize:'13px', color:'#e8e6e0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{f.name}</p>
                      <p style={{fontSize:'11px', color:'#4a4a55'}}>{fmt(f.size)}</p>
                    </div>
                    {!uploading && (
                      <button style={s.removeBtn} onClick={() => removeFile(f.name)}>✕</button>
                    )}
                  </div>
                ))}
                <p style={{fontSize:'12px', color:'#4a4a55', marginTop:'6px'}}>
                  {files.length} file · {fmt(files.reduce((a, f) => a + f.size, 0))} totali
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={s.codeSection}>
            <div style={{display:'flex',gap:'10px',marginBottom:'10px'}}>
              <div style={{flex:1}}>
                <label style={s.label}>Nome file <span style={s.optional}>(senza estensione)</span></label>
                <input style={{...s.input, marginTop:'6px'}} placeholder="es. todo-app"
                  value={codeName} onChange={e => setCodeName(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Linguaggio</label>
                <select style={{...s.input, marginTop:'6px', width:'90px'}}
                  value={codeLang} onChange={e => setCodeLang(e.target.value)}>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <textarea style={s.codeEditor} placeholder="Incolla il tuo codice qui..."
              value={codeText} onChange={e => setCodeText(e.target.value)} spellCheck={false} />
            {codeText && (
              <p style={{fontSize:'11px',color:'#4a4a55',marginTop:'4px'}}>
                {codeText.split('\n').length} righe · {fmt(new Blob([codeText]).size)}
              </p>
            )}
          </div>
        )}

        <div style={s.field}>
          <label style={s.label}>Categoria</label>
          <div style={s.cats}>
            {CATEGORIES.map(c => (
              <button key={c} style={category === c ? s.catActive : s.cat}
                onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>Tag <span style={s.optional}>(separati da virgola)</span></label>
          <input style={s.input} placeholder="es. react, homework, settimana3"
            value={tags} onChange={e => setTags(e.target.value)} />
        </div>

        {error && <p style={s.error}>{error}</p>}

        <div style={s.actions}>
          <button style={s.btnSecondary} onClick={onClose}>Annulla</button>
          <button style={uploading ? s.btnDisabled : s.btn}
            onClick={mode === 'file' ? handleUploadFiles : handleUploadCode}
            disabled={uploading}>
            {uploading
              ? `Caricamento ${uploadStatus.filter(s=>s==='done').length}/${mode==='file'?files.length:1}...`
              : mode === 'file'
                ? files.length > 1 ? `Carica ${files.length} file` : 'Carica file'
                : 'Condividi codice'}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:'1rem' },
  modal: { background:'#17171a', border:'1px solid #2a2a2f', borderRadius:'16px', padding:'1.75rem', width:'100%', maxWidth:'540px', display:'flex', flexDirection:'column', gap:'16px', maxHeight:'90vh', overflowY:'auto' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  title: { fontSize:'16px', fontWeight:'600', color:'#e8e6e0' },
  close: { background:'none', border:'none', color:'#6b6b75', cursor:'pointer', fontSize:'16px', padding:'4px 8px', borderRadius:'6px' },
  modeTabs: { display:'flex', gap:'4px', background:'#0e0e10', borderRadius:'8px', padding:'4px' },
  modeTab: { flex:1, padding:'8px', border:'none', borderRadius:'6px', cursor:'pointer', background:'transparent', color:'#6b6b75', fontSize:'13px', fontFamily:'DM Sans,sans-serif' },
  modeActive: { flex:1, padding:'8px', border:'none', borderRadius:'6px', cursor:'pointer', background:'#7c6dfa', color:'#fff', fontSize:'13px', fontWeight:'500', fontFamily:'DM Sans,sans-serif' },
  dropzone: { border:'1.5px dashed #2a2a2f', borderRadius:'12px', padding:'1.5rem', textAlign:'center', cursor:'pointer' },
  dropText: { color:'#9b9ba8', fontSize:'14px' },
  dropSub: { color:'#4a4a55', fontSize:'12px', marginTop:'4px' },
  fileList: { marginTop:'10px', display:'flex', flexDirection:'column', gap:'6px' },
  fileRow: { display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', background:'#0e0e10', borderRadius:'8px' },
  removeBtn: { background:'none', border:'none', color:'#4a4a55', cursor:'pointer', fontSize:'12px', padding:'2px 6px', borderRadius:'4px', flexShrink:0 },
  codeSection: { display:'flex', flexDirection:'column' },
  codeEditor: { background:'#0e0e10', border:'1px solid #2a2a2f', borderRadius:'8px', padding:'12px', color:'#e8e6e0', fontSize:'13px', fontFamily:'DM Mono,monospace', outline:'none', resize:'vertical', minHeight:'180px', lineHeight:'1.6' },
  field: { display:'flex', flexDirection:'column', gap:'8px' },
  label: { fontSize:'13px', color:'#9b9ba8', fontWeight:'500' },
  optional: { color:'#4a4a55', fontWeight:'400' },
  cats: { display:'flex', gap:'8px', flexWrap:'wrap' },
  cat: { padding:'6px 14px', borderRadius:'20px', border:'1px solid #2a2a2f', background:'transparent', color:'#6b6b75', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  catActive: { padding:'6px 14px', borderRadius:'20px', border:'1px solid #7c6dfa', background:'rgba(124,109,250,0.15)', color:'#a99bfc', fontSize:'13px', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  input: { background:'#0e0e10', border:'1px solid #2a2a2f', borderRadius:'8px', padding:'10px 14px', color:'#e8e6e0', fontSize:'13px', fontFamily:'DM Sans,sans-serif', outline:'none' },
  error: { fontSize:'13px', color:'#f87171', background:'#2a1515', borderRadius:'8px', padding:'10px 14px' },
  actions: { display:'flex', gap:'10px', justifyContent:'flex-end' },
  btnSecondary: { padding:'10px 20px', border:'1px solid #2a2a2f', borderRadius:'8px', background:'transparent', color:'#9b9ba8', fontSize:'14px', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  btn: { padding:'10px 24px', border:'none', borderRadius:'8px', background:'#7c6dfa', color:'#fff', fontSize:'14px', fontWeight:'500', cursor:'pointer', fontFamily:'DM Sans,sans-serif' },
  btnDisabled: { padding:'10px 24px', border:'none', borderRadius:'8px', background:'#3d3860', color:'#9b9ba8', fontSize:'14px', cursor:'not-allowed', fontFamily:'DM Sans,sans-serif' }
}
