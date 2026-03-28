/* ═══════════════════════════════════════════
   CANNAPASS — Authentication
   Login, signup, logout, session management
   ═══════════════════════════════════════════ */

const Auth = (() => {
  // ─── Initialize Auth ───
  async function init() {
    showLoading();
    checkConnection();

    // Listen for auth state changes
    sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadUserData(session.user);
        hideLoading();
        showApp();
        Router.init();
      } else if (event === 'SIGNED_OUT') {
        State.reset();
        hideLoading();
        showAuth();
        resetForms();
      }
    });

    // Check existing session
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await loadUserData(session.user);
      hideLoading();
      showApp();
      Router.init();
    } else {
      hideLoading();
      showAuth();
    }

    setupAuthUI();
  }

  // ─── Load User Profile ───
  async function loadUserData(user) {
    State.set('user', user);

    const { data: profile, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[Auth] Profile load error:', error);
      Toast.error('Erro ao carregar perfil. Tente novamente.');
      return;
    }

    State.set('profile', profile);

    // If patient, load patient data
    if (profile.role === ROLES.PATIENT) {
      const { data: patient } = await sb
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      State.set('patient', patient);
    }

    State.set('loading', false);
  }

  // ─── Login ───
  async function login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('E-mail ou senha incorretos.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Confirme seu e-mail antes de entrar.');
      }
      throw new Error(error.message);
    }

    return data;
  }

  // ─── Signup ───
  async function signup(email, password, fullName, role) {
    // Create auth user
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('Este e-mail já está cadastrado.');
      }
      throw new Error(error.message);
    }

    // If email confirmation is required
    if (data.user && !data.session) {
      Toast.info('Verifique seu e-mail para confirmar a conta.');
      return null;
    }

    // Create profile (trigger may handle this, but ensure it exists)
    if (data.user) {
      const { error: profileError } = await sb
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: fullName,
          role: role,
          email: email
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('[Auth] Profile creation error:', profileError);
      }
    }

    return data;
  }

  // ─── Logout ───
  async function logout() {
    const confirmed = await Modal.open({
      title: 'Sair da conta',
      body: 'Tem certeza que deseja sair?',
      confirmText: 'Sair',
      cancelText: 'Cancelar',
      danger: true
    });

    if (!confirmed) return;

    const { error } = await sb.auth.signOut();
    if (error) {
      Toast.error('Erro ao sair. Tente novamente.');
      console.error('[Auth] Logout error:', error);
    }
  }

  // ─── Check Connection to Supabase ───
  async function checkConnection() {
    const dot = document.getElementById('auth-status-dot');
    const text = document.getElementById('auth-status-text');
    if (!dot || !text) return;

    try {
      // Use auth endpoint instead of table query to avoid RLS issues
      const { error } = await sb.auth.getSession();
      if (error) throw error;
      dot.className = 'auth-status-dot online';
      text.textContent = 'Conectado ao Supabase';
    } catch {
      dot.className = 'auth-status-dot offline';
      text.textContent = 'Sem conexão com o servidor';
    }
  }

  // ─── Setup Auth UI Events ───
  function setupAuthUI() {
    // Login form
    const loginForm = document.getElementById('login-form');
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = document.getElementById('login-btn');

      clearAuthError('auth-error');
      btn.classList.add('btn-loading');
      btn.disabled = true;

      try {
        await login(email, password);
      } catch (err) {
        showAuthError('auth-error', err.message);
      } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
      }
    });

    // Signup form
    const signupForm = document.getElementById('signup-form');
    signupForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const role = document.getElementById('signup-role').value;
      const btn = document.getElementById('signup-btn');

      if (!role) {
        showAuthError('signup-error', 'Selecione um perfil.');
        return;
      }
      if (!name) {
        showAuthError('signup-error', 'Informe seu nome completo.');
        return;
      }
      if (!validateEmail(email)) {
        showAuthError('signup-error', 'E-mail inválido.');
        return;
      }
      if (password.length < 6) {
        showAuthError('signup-error', 'A senha deve ter no mínimo 6 caracteres.');
        return;
      }

      clearAuthError('signup-error');
      btn.classList.add('btn-loading');
      btn.disabled = true;

      try {
        const result = await signup(email, password, name, role);
        if (!result) {
          // Email confirmation needed, switch to login
          toggleAuthMode();
        }
      } catch (err) {
        showAuthError('signup-error', err.message);
      } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
      }
    });

    // Role selector
    document.getElementById('role-selector')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.auth-role-btn');
      if (!btn) return;

      document.querySelectorAll('.auth-role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('signup-role').value = btn.dataset.role;
      document.getElementById('signup-btn').disabled = false;
      clearAuthError('signup-error');
    });

    // Toggle login/signup
    document.getElementById('auth-footer-link')?.addEventListener('click', toggleAuthMode);

    // Password toggles
    document.querySelectorAll('.password-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const input = toggle.previousElementSibling;
        if (input.type === 'password') {
          input.type = 'text';
          toggle.textContent = '🙈';
        } else {
          input.type = 'password';
          toggle.textContent = '👁';
        }
      });
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        }
      });
    });

    // Theme toggles
    document.getElementById('theme-toggle-auth')?.addEventListener('click', Theme.toggle);
    document.getElementById('theme-toggle')?.addEventListener('click', Theme.toggle);

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', logout);

    // Mobile sidebar
    document.getElementById('hamburger-btn')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
      document.getElementById('sidebar-overlay')?.classList.toggle('open');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sidebar-overlay')?.classList.remove('open');
    });
  }

  // ─── Toggle Login/Signup Mode ───
  function toggleAuthMode() {
    const loginDiv = document.getElementById('auth-login');
    const signupDiv = document.getElementById('auth-signup');
    const footerText = document.getElementById('auth-footer-text');
    const footerLink = document.getElementById('auth-footer-link');

    if (loginDiv.classList.contains('hidden')) {
      // Switch to login
      loginDiv.classList.remove('hidden');
      signupDiv.classList.add('hidden');
      footerText.textContent = 'Não tem uma conta?';
      footerLink.textContent = 'Criar conta';
    } else {
      // Switch to signup
      loginDiv.classList.add('hidden');
      signupDiv.classList.remove('hidden');
      footerText.textContent = 'Já tem uma conta?';
      footerLink.textContent = 'Entrar';
    }
    clearAuthError('auth-error');
    clearAuthError('signup-error');
  }

  // ─── Error Display Helpers ───
  function showAuthError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
  }

  function clearAuthError(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('visible');
  }

  // ─── Reset Forms ───
  function resetForms() {
    document.getElementById('login-form')?.reset();
    document.getElementById('signup-form')?.reset();
    document.getElementById('signup-role').value = '';
    document.querySelectorAll('.auth-role-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('signup-btn').disabled = true;
    clearAuthError('auth-error');
    clearAuthError('signup-error');
    // Ensure login mode
    document.getElementById('auth-login')?.classList.remove('hidden');
    document.getElementById('auth-signup')?.classList.add('hidden');
  }

  return { init, logout, loadUserData };
})();

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Auth.init();
});
