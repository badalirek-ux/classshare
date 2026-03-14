import { useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, ALLOWED_DOMAIN } from '../firebase'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.email.endsWith(ALLOWED_DOMAIN)) {
      setError(`Solo email con dominio ${ALLOWED_DOMAIN} sono ammesse.`)
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        if (!form.name.trim()) { setError('Inserisci il tuo nome.'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
        await updateProfile(cred.user, { displayName: form.name })
        await setDoc(doc(db, 'profiles', cred.user.uid), {
          uid: cred.user.uid,
          name: form.name,
          email: form.email,
          fileCount: 0,
          createdAt: serverTimestamp()
        })
      } else {
        await signInWithEmailAndPassword(auth, form.email, form.password)
      }
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Email già registrata.',
        'auth/wrong-password': 'Password errata.',
        'auth/user-not-found': 'Utente non trovato.',
        'auth/weak-password': 'Password troppo corta (min 6 caratteri).',
        'auth/invalid-email': 'Email non valida.',
        'auth/invalid-credential': 'Credenziali non valide.',
      }
      setError(msgs[err.code] || 'Errore: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoIcon}>⬡</span>
          <span style={s.logoText}>ClassShare</span>
        </div>
        <p style={s.sub}>
          {mode === 'login' ? 'Bentornato nella tua classe del corso 42 ITS.' : 'Unisciti alla tua classe del corso 42 ITS.'}
        </p>

        <div style={s.tabs}>
          <button style={mode === 'login' ? s.tabActive : s.tab} onClick={() => { setMode('login'); setError('') }}>Accedi</button>
          <button style={mode === 'register' ? s.tabActive : s.tab} onClick={() => { setMode('register'); setError('') }}>Registrati</button>
        </div>

        <form onSubmit={handle} style={s.form}>
          {mode === 'register' && (
            <div style={s.field}>
              <label style={s.label}>Nome completo</label>
              <input style={s.input} placeholder="es. Marco Rossi" value={form.name}
                onChange={e => set('name', e.target.value)} required />
            </div>
          )}
          <div style={s.field}>
            <label style={s.label}>Email scolastica</label>
            <input style={s.input} type="email" placeholder={`nome${ALLOWED_DOMAIN}`}
              value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" placeholder="••••••••"
              value={form.password} onChange={e => set('password', e.target.value)} required />
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button style={loading ? s.btnDisabled : s.btn} type="submit" disabled={loading}>
            {loading ? 'Caricamento...' : mode === 'login' ? 'Accedi' : 'Crea account'}
          </button>
        </form>

        <p style={s.hint}>Solo email <code style={s.code}>{ALLOWED_DOMAIN}</code> sono ammesse.</p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0e0e10', padding: '1rem'
  },
  card: {
    background: '#17171a', border: '1px solid #2a2a2f', borderRadius: '16px',
    padding: '2.5rem', width: '100%', maxWidth: '420px'
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
  logoIcon: { fontSize: '22px', color: '#7c6dfa' },
  logoText: { fontSize: '20px', fontWeight: '600', color: '#e8e6e0', letterSpacing: '-0.3px' },
  sub: { fontSize: '14px', color: '#6b6b75', marginBottom: '24px' },
  tabs: { display: 'flex', gap: '4px', background: '#0e0e10', borderRadius: '8px', padding: '4px', marginBottom: '24px' },
  tab: {
    flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer',
    background: 'transparent', color: '#6b6b75', fontSize: '14px', fontFamily: 'DM Sans, sans-serif'
  },
  tabActive: {
    flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer',
    background: '#7c6dfa', color: '#fff', fontSize: '14px', fontWeight: '500',
    fontFamily: 'DM Sans, sans-serif'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#9b9ba8', fontWeight: '500' },
  input: {
    background: '#0e0e10', border: '1px solid #2a2a2f', borderRadius: '8px',
    padding: '10px 14px', color: '#e8e6e0', fontSize: '14px',
    fontFamily: 'DM Sans, sans-serif', outline: 'none',
    transition: 'border-color 0.15s'
  },
  error: { fontSize: '13px', color: '#f87171', background: '#2a1515', borderRadius: '8px', padding: '10px 14px' },
  btn: {
    background: '#7c6dfa', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', marginTop: '4px', transition: 'opacity 0.15s'
  },
  btnDisabled: {
    background: '#3d3860', color: '#9b9ba8', border: 'none', borderRadius: '8px',
    padding: '12px', fontSize: '14px', fontWeight: '500', cursor: 'not-allowed',
    fontFamily: 'DM Sans, sans-serif', marginTop: '4px'
  },
  hint: { marginTop: '20px', fontSize: '12px', color: '#4a4a55', textAlign: 'center' },
  code: { fontFamily: 'DM Mono, monospace', color: '#7c6dfa', fontSize: '12px' }
}
