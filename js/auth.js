// js/auth.js
// Import ESM desde CDN (Supabase JS v2)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// TODO: pon tus valores:
const SUPABASE_URL = 'https://ppybnkaftftreqmcwqwy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweWJua2FmdGZ0cmVxbWN3cXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjY5NjMsImV4cCI6MjA3NjIwMjk2M30.i9TaA_4w9h91qAcM-PtYHKcsMHZb80CvHCq3lcv9B-8'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helpers UI
const $ = (sel) => document.querySelector(sel)
const form = $('.login-form')
const btn = $('.login-btn')

function showAlert(message, type = 'success') {
  // Inserta una alerta Bootstrap encima del botón
  const old = $('.signup-alert')
  if (old) old.remove()
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

async function createProfileIfPossible(userId, username, fullName) {
  // Intenta insertar el perfil si hay sesión (RLS lo permite)
  const { error } = await supabase.from('usuarios').insert({
    user_id: userId,
    usuario: username,
    nombre_completo: fullName
  })
  // Si email-confirm está ON y no hay sesión, esto fallará por RLS: es normal.
  return { error }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
})

btn?.addEventListener('click', async () => {
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
    // 1) Alta en Auth (puedes pasar metadatos; útiles si luego usas trigger)
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, full_name: fullName } }
    })
    if (signUpErr) throw signUpErr

    // 2) Según tu configuración de confirmación de email:
    // - DEV (sin confirmación) => hay session; inserta perfil ahora.
    // - PROD (con confirmación) => no hay session; muestra aviso.
    const { data: sessionInfo } = await supabase.auth.getSession()
    const hasSession = !!sessionInfo?.session
    const userId = signUpData.user?.id

    if (hasSession && userId) {
      const { error: insertErr } = await createProfileIfPossible(userId, username, fullName)
      if (insertErr) {
        // Posibles causas: UNIQUE en "usuario" o RLS si perdiste sesión.
        if (insertErr.code === '23505') {
          showAlert('Ese nombre de usuario ya está en uso. Prueba con otro.', 'danger')
        } else {
          showAlert('Cuenta creada, pero no pudimos guardar tu perfil. Inicia sesión e inténtalo de nuevo.', 'warning')
        }
      } else {
        showAlert('¡Cuenta creada! Redirigiendo…', 'success')
        // Redirige a tu panel o login
        setTimeout(() => { window.location.href = '../html/log.html' }, 900)
      }
    } else {
      // Confirmación de email ACTIVADA (recomendada en producción)
      showAlert(
        'Hemos enviado un correo de verificación. Revisa tu bandeja y, tras confirmar, inicia sesión para completar tu perfil.',
        'info'
      )
    }
  } catch (err) {
    console.error(err)
    showAlert('No se pudo crear la cuenta. ' + (err?.message || ''), 'danger')
  } finally {
    setBusy(false)
  }
})
