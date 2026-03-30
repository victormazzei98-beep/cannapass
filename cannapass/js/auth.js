/* ═══════════════════════════════════════════
   CANNAPASS — Authentication
   Login, signup, logout, session management
   ═══════════════════════════════════════════ */

const Auth = (() => {
  let _isRecoveryFlow = false;

  // ─── Initialize Auth ───
  async function init() {
    // Public verification route — bypass auth entirely
    const hash = window.location.hash || '';
    if (hash.startsWith(PUBLIC_VERIFY_HASH)) {
      hideLoading();
      const token = hash.slice(PUBLIC_VERIFY_HASH.length);
      Router.showPublicVerification(token);
      return;
    }

    showLoading();
    checkConnection();

    // Detect if this is a password recovery redirect (Supabase puts tokens in hash)
    const hashParams = window.location.hash;
    if (hashParams.includes('type=recovery') || hashParams.includes('type%3Drecovery')) {
      _isRecoveryFlow = true;
      console.log('[Auth] Recovery flow detected from URL hash');
    }

    // Listen for auth state changes
    sb.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event, '_isRecoveryFlow:', _isRecoveryFlow);
      try {
        if (event === 'PASSWORD_RECOVERY') {
          // User clicked the reset link in their email — highest priority
          _isRecoveryFlow = true;
          hideLoading();
          showAuth();
          showAuthPanel('auth-reset');
        } else if (event === 'SIGNED_IN' && session && _isRecoveryFlow) {
          // Ignore SIGNED_IN during recovery flow — wait for PASSWORD_RECOVERY event
          console.log('[Auth] Ignoring SIGNED_IN during recovery flow');
          State.set('user', session.user);
        } else if (event === 'SIGNED_IN' && session) {
          await loadUserData(session.user);
          hideLoading();
          showApp();
          Router.init();
        } else if (event === 'SIGNED_OUT') {
          _isRecoveryFlow = false;
          State.reset();
          hideLoading();
          showAuth();
          resetForms();
        } else if (event === 'INITIAL_SESSION') {
          // Handled by getSession() below — do nothing
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Token refreshed silently, update user data
          State.set('user', session.user);
        } else {
          // Unknown event — ensure loading is hidden
          hideLoading();
        }
      } catch (err) {
        console.error('[Auth] State change error:', err);
        hideLoading();
        showAuth();
      }
    });

    // Check existing session (skip auto-login during recovery flow)
    try {
      if (_isRecoveryFlow) {
        // During recovery, don't auto-navigate to dashboard
        // The PASSWORD_RECOVERY event will handle showing the reset form
        console.log('[Auth] Skipping auto-login for recovery flow');
        hideLoading();
      } else {
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
      }
    } catch (err) {
      console.error('[Auth] Session check error:', err);
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

  // ─── Forgot Password (send reset email) ───
  async function forgotPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://cannapass.vercel.app'
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Muitas tentativas. Aguarde alguns minutos.');
      }
      throw new Error(error.message);
    }
  }

  // ─── Reset Password (from email link — PASSWORD_RECOVERY event) ───
  async function resetPassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message);
    }
  }

  // ─── Change Password (logged-in user) ───
  async function changePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(error.message);
    }
  }

  // ─── Show in-app Change Password Modal ───
  async function showChangePasswordModal() {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    if (!overlay) return;

    modalTitle.textContent = 'Alterar Senha';
    modalBody.innerHTML = `
      <div class="form-stack">
        <div class="form-group">
          <label class="form-label" for="modal-new-password">Nova senha</label>
          <div class="password-wrapper">
            <input class="form-input" type="password" id="modal-new-password" placeholder="Mínimo 6 caracteres" minlength="6" autocomplete="new-password">
            <span class="password-toggle" role="button" tabindex="0" aria-label="Mostrar senha">${Icons['eye-open']}</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="modal-confirm-password">Confirmar nova senha</label>
          <div class="password-wrapper">
            <input class="form-input" type="password" id="modal-confirm-password" placeholder="Repita a nova senha" minlength="6" autocomplete="new-password">
            <span class="password-toggle" role="button" tabindex="0" aria-label="Mostrar senha">${Icons['eye-open']}</span>
          </div>
        </div>
        <div id="modal-password-error" class="auth-error" role="alert"></div>
      </div>
    `;
    confirmBtn.textContent = 'Salvar';
    cancelBtn.textContent = 'Cancelar';
    confirmBtn.className = 'btn btn-primary';

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Setup password toggles inside modal
    overlay.querySelectorAll('.password-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const input = toggle.previousElementSibling;
        if (input.type === 'password') {
          input.type = 'text';
          toggle.innerHTML = Icons['eye-closed'];
        } else {
          input.type = 'password';
          toggle.innerHTML = Icons['eye-open'];
        }
      });
    });

    return new Promise(resolve => {
      const cleanup = () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onEscape);
      };

      const onCancel = () => { cleanup(); resolve(false); };
      const onOverlay = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
      const onEscape = (e) => { if (e.key === 'Escape') { cleanup(); resolve(false); } };

      const onConfirm = async () => {
        const newPwd = document.getElementById('modal-new-password').value;
        const confirmPwd = document.getElementById('modal-confirm-password').value;
        const errorEl = document.getElementById('modal-password-error');

        // Validate
        if (!newPwd || newPwd.length < 6) {
          errorEl.textContent = 'A senha deve ter no mínimo 6 caracteres.';
          errorEl.classList.add('visible');
          return;
        }
        if (newPwd !== confirmPwd) {
          errorEl.textContent = 'As senhas não coincidem.';
          errorEl.classList.add('visible');
          return;
        }

        confirmBtn.classList.add('btn-loading');
        confirmBtn.disabled = true;

        try {
          await changePassword(newPwd);
          cleanup();
          Toast.success('Senha alterada com sucesso!');
          resolve(true);
        } catch (err) {
          errorEl.textContent = err.message || 'Erro ao alterar senha.';
          errorEl.classList.add('visible');
        } finally {
          confirmBtn.classList.remove('btn-loading');
          confirmBtn.disabled = false;
        }
      };

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onEscape);
    });
  }

  // ─── Show Auth Panels Helper ───
  function showAuthPanel(panelId) {
    ['auth-login', 'auth-signup', 'auth-forgot', 'auth-reset'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== panelId);
    });
    // Show/hide footer (only for login and signup)
    const footer = document.getElementById('auth-footer');
    if (footer) footer.classList.toggle('hidden', panelId !== 'auth-login' && panelId !== 'auth-signup');
  }

  // ─── Logout ───
  async function logout() {
    try {
      const confirmed = await Modal.open({
        title: 'Sair da conta',
        body: 'Tem certeza que deseja sair?',
        confirmText: 'Sair',
        cancelText: 'Cancelar',
        danger: true
      });

      if (!confirmed) return;

      showLoading();

      const { error } = await sb.auth.signOut();
      if (error) {
        hideLoading();
        Toast.error('Erro ao sair. Tente novamente.');
        console.error('[Auth] Logout error:', error);
      }
      // SIGNED_OUT event in onAuthStateChange will handle hideLoading + showAuth
    } catch (err) {
      console.error('[Auth] Logout error:', err);
      hideLoading();
      showAuth();
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

    // Forgot password link
    document.getElementById('forgot-password-link')?.addEventListener('click', () => {
      showAuthPanel('auth-forgot');
      clearAuthError('forgot-error');
    });

    // Back to login from forgot
    document.getElementById('back-to-login-link')?.addEventListener('click', () => {
      showAuthPanel('auth-login');
    });

    // Forgot password form submit
    const forgotForm = document.getElementById('forgot-form');
    forgotForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      const btn = document.getElementById('forgot-btn');

      if (!validateEmail(email)) {
        showAuthError('forgot-error', 'E-mail inválido.');
        return;
      }

      clearAuthError('forgot-error');
      btn.classList.add('btn-loading');
      btn.disabled = true;

      try {
        await forgotPassword(email);
        Toast.success('Link de recuperação enviado! Verifique seu e-mail.');
        showAuthPanel('auth-login');
      } catch (err) {
        showAuthError('forgot-error', err.message);
      } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
      }
    });

    // Reset password form submit (after clicking email link)
    const resetForm = document.getElementById('reset-form');
    resetForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPwd = document.getElementById('reset-password').value;
      const confirmPwd = document.getElementById('reset-password-confirm').value;
      const btn = document.getElementById('reset-btn');

      if (newPwd.length < 6) {
        showAuthError('reset-error', 'A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPwd !== confirmPwd) {
        showAuthError('reset-error', 'As senhas não coincidem.');
        return;
      }

      clearAuthError('reset-error');
      btn.classList.add('btn-loading');
      btn.disabled = true;

      try {
        await resetPassword(newPwd);
        _isRecoveryFlow = false;
        Toast.success('Senha redefinida com sucesso! Você já está logado.');
        // User is now signed in via the recovery token
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          await loadUserData(session.user);
          hideLoading();
          showApp();
          Router.init();
        } else {
          showAuthPanel('auth-login');
        }
      } catch (err) {
        showAuthError('reset-error', err.message);
      } finally {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
      }
    });

    // Password toggles
    document.querySelectorAll('.password-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const input = toggle.previousElementSibling;
        if (input.type === 'password') {
          input.type = 'text';
          toggle.innerHTML = Icons['eye-closed'];
        } else {
          input.type = 'password';
          toggle.innerHTML = Icons['eye-open'];
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
    const footerText = document.getElementById('auth-footer-text');
    const footerLink = document.getElementById('auth-footer-link');

    if (loginDiv.classList.contains('hidden')) {
      showAuthPanel('auth-login');
      footerText.textContent = 'Não tem uma conta?';
      footerLink.textContent = 'Criar conta';
    } else {
      showAuthPanel('auth-signup');
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
    document.getElementById('forgot-form')?.reset();
    document.getElementById('reset-form')?.reset();
    const roleInput = document.getElementById('signup-role');
    if (roleInput) roleInput.value = '';
    document.querySelectorAll('.auth-role-btn').forEach(b => b.classList.remove('active'));
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) signupBtn.disabled = true;
    clearAuthError('auth-error');
    clearAuthError('signup-error');
    clearAuthError('forgot-error');
    clearAuthError('reset-error');
    // Ensure login mode
    showAuthPanel('auth-login');
  }

  return { init, logout, loadUserData, changePassword: showChangePasswordModal };
})();

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Auth.init();
});
