// js/auth.js (sin verificación de email)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Tus claves (anon es pública por diseño)
const SUPABASE_URL = 'https://ppybnkaftftreqmcwqwy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweWJua2FmdGZ0cmVxbWN3cXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjY5NjMsImV4cCI6MjA3NjIwMjk2M30.i9TaA_4w9h91qAcM-PtYHKcsMHZb80CvHCq3lcv9B-8'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// -------- Helpers UI --------
const $ = (sel) => document.querySelector(sel)
const form = $('.login-form')
const btn = $('.login-btn')

function showAlert(message, type = 'success') {
  const old = $('.signup-alert')
  if (old) old.remove()
  if (!message) return
  const div = document.createElement('div')
  div.className = `signup-alert alert alert-${type} mt-3`
  div.role = 'alert'
  div.innerHTML = message
  btn.closest('form').appendChild(div)
}

function setBusy(busy) {
  btn.disabled = busy
  btn.innerHTML = busy
    ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creando cuenta...'
    : '<i class="bi bi-person-check me-2"></i>Crear cuenta'
}

async function ensureSession(email, password) {
  // Comprueba si ya hay sesión; si no, inicia sesión con password
  const { data: sessionInfo } = await supabase.auth.getSession()
  if (sessionInfo?.session) return sessionInfo.session
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

async function insertProfile(userId, username, fullName) {
  const { error } = await supabase.from('usuarios').insert({
    user_id: userId,
    usuario: username,
    nombre_completo: fullName
  })
  return { error }
}

async function register() {
  // Lee inputs
  const username = $('#username')?.value?.trim()
  const fullName = $('#fullname')?.value?.trim()
  const email = $('#email')?.value?.trim()
  const password = $('#password')?.value

  if (!username || !fullName || !email || !password) {
    showAlert('Completa todos los campos.', 'warning')
    return
  }

  setBusy(true)
  showAlert('')

  try {
    // 1) Alta en Auth (sin verificación de email)
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, full_name: fullName } }
    })
    if (signUpErr) throw signUpErr

    // 2) Garantizar sesión (por si signUp no la devuelve)
    await ensureSession(email, password)

    // 3) Obtener userId actual
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user?.id) throw userErr || new Error('No se pudo obtener el usuario')
    const userId = userData.user.id

    // 4) Insertar perfil (RLS permite porque auth.uid() = user_id)
    const { error: insertErr } = await insertProfile(userId, username, fullName)
    if (insertErr) {
      if (insertErr.code === '23505') {
        // UNIQUE violation (p. ej., username duplicado)
        showAlert('Ese nombre de usuario ya está en uso. Prueba con otro.', 'danger')
      } else {
        showAlert('Cuenta creada, pero hubo un problema guardando tu perfil. Intenta iniciar sesión y reintentar.', 'warning')
      }
      return
    }

    // 5) Éxito
    showAlert('¡Cuenta creada! Redirigiendo…', 'success')
    setTimeout(() => { window.location.href = '../html/log.html' }, 900)

  } catch (err) {
    console.error(err)
    showAlert('No se pudo crear la cuenta. ' + (err?.message || ''), 'danger')
  } finally {
    setBusy(false)
  }
}

// Soporta tanto submit del formulario como click del botón (tu botón es type="button")
form?.addEventListener('submit', (e) => { e.preventDefault(); register() })
btn?.addEventListener('click', (e) => { e.preventDefault(); register() })
