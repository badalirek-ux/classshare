import { useState, useRef } from 'react'
import { supabase, STORAGE_BUCKET } from '../supabase'
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['Codice', 'Documenti', 'Immagini', 'Altro']

export default function UploadModal({ onClose, onSuccess }) {
  const { user, profile } = useAuth()
  const [file, setFile] = useState(null)
  const [category, setCategory] = useState('Codice')
  const [tags, setTags] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleUpload = async () => {
    if (!file) { setError('Seleziona un file.'); return }
    setUploading(true)
    setError('')
    setProgress(10)

    try {
      const fileName = `${user.uid}_${Date.now()}_${file.name}`
      setProgress(30)

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, { upsert: false })

      if (uploadError) throw uploadError
      setProgress(70)

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName)

      const url = urlData.publicUrl
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)

      await addDoc(collection(db, 'files'), {
        name: file.name,
        url,
        storagePath: fileName,
        size: file.size,
        category,
        tags: tagList,
        uploadedBy: user.uid,
        uploaderName: profile?.name || user.email,
        createdAt: serverTimestamp()
      })

      await updateDoc(doc(db, 'profiles', user.uid), { fileCount: increment(1) })
      setProgress(100)
      setUploading(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError('Errore upload: ' + err.message)
      setUploading(false)
      setProgress(0)
    }
  }

  const fmt = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>Carica file</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>

        <div
          style={s.dropzone}
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}
        >
          <input ref={fileRef} type="file" style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0])} />
          {file ? (
            <div>
              <p style={s.fileName}>{file.name}</p>
              <p style={s.fileSize}>{fmt(file.size)}</p>
            </div>
          ) : (
            <div>
              <p style={s.dropText}>Trascina qui o clicca per scegliere</p>
              <p style={s.dropSub}>Qualsiasi tipo di file</p>
            </div>
          )}
        </div>

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

        {uploading && (
          <div style={s.progressWrap}>
            <div style={s.progressBg}>
              <div style={{ ...s.progressBar, width: progress + '%' }} />
            </div>
            <span style={s.progressText}>{progress}%</span>
          </div>
        )}

        {error && <p style={s.error}>{error}</p>}

        <div style={s.actions}>
          <button style={s.btnSecondary} onClick={onClose}>Annulla</button>
          <button style={uploading ? s.btnDisabled : s.btn}
            onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Caricamento...' : 'Carica'}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100, padding: '1rem'
  },
  modal: {
    background: '#17171a', border: '1px solid #2a2a2f', borderRadius: '16px',
    padding: '1.75rem', width: '100%', maxWidth: '480px',
    display: 'flex', flexDirection: 'column', gap: '18px'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '16px', fontWeight: '600', color: '#e8e6e0' },
  close: {
    background: 'none', border: 'none', color: '#6b6b75', cursor: 'pointer',
    fontSize: '16px', padding: '4px 8px', borderRadius: '6px'
  },
  dropzone: {
    border: '1.5px dashed #2a2a2f', borderRadius: '12px', padding: '2rem',
    textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s'
  },
  fileName: { color: '#e8e6e0', fontWeight: '500', fontSize: '14px' },
  fileSize: { color: '#6b6b75', fontSize: '12px', marginTop: '4px' },
  dropText: { color: '#9b9ba8', fontSize: '14px' },
  dropSub: { color: '#4a4a55', fontSize: '12px', marginTop: '4px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', color: '#9b9ba8', fontWeight: '500' },
  optional: { color: '#4a4a55', fontWeight: '400' },
  cats: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  cat: {
    padding: '6px 14px', borderRadius: '20px', border: '1px solid #2a2a2f',
    background: 'transparent', color: '#6b6b75', fontSize: '13px',
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
  },
  catActive: {
    padding: '6px 14px', borderRadius: '20px', border: '1px solid #7c6dfa',
    background: 'rgba(124,109,250,0.15)', color: '#a99bfc', fontSize: '13px',
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
  },
  input: {
    background: '#0e0e10', border: '1px solid #2a2a2f', borderRadius: '8px',
    padding: '10px 14px', color: '#e8e6e0', fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif', outline: 'none'
  },
  progressWrap: { display: 'flex', alignItems: 'center', gap: '12px' },
  progressBg: { flex: 1, height: '4px', background: '#2a2a2f', borderRadius: '4px', overflow: 'hidden' },
  progressBar: { height: '100%', background: '#7c6dfa', borderRadius: '4px', transition: 'width 0.2s' },
  progressText: { fontSize: '12px', color: '#6b6b75', minWidth: '32px' },
  error: { fontSize: '13px', color: '#f87171', background: '#2a1515', borderRadius: '8px', padding: '10px 14px' },
  actions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
  btnSecondary: {
    padding: '10px 20px', border: '1px solid #2a2a2f', borderRadius: '8px',
    background: 'transparent', color: '#9b9ba8', fontSize: '14px',
    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
  },
  btn: {
    padding: '10px 24px', border: 'none', borderRadius: '8px',
    background: '#7c6dfa', color: '#fff', fontSize: '14px',
    fontWeight: '500', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
  },
  btnDisabled: {
    padding: '10px 24px', border: 'none', borderRadius: '8px',
    background: '#3d3860', color: '#9b9ba8', fontSize: '14px',
    cursor: 'not-allowed', fontFamily: 'DM Sans, sans-serif'
  }
}
