(function(){
  'use strict';
  function message(text,isError){
    const node=document.getElementById('member-message');
    if(!node)return;
    node.textContent=text||'';
    node.className='member-message'+(isError?' error':'');
  }
  function safeNextPath(){
    const raw=new URLSearchParams(window.location.search).get('next')||'';
    return /^\/[A-Za-z0-9/?&=_#.%+-]*$/.test(raw)&&raw.indexOf('//')!==0?raw:'/account.html';
  }
  function isResetMode(){
    const params=new URLSearchParams(window.location.search);
    return params.get('reset')==='1' || window.location.hash.indexOf('type=recovery')!==-1;
  }
  function ensureResetStyles(){
    if(document.getElementById('member-reset-inline-style'))return;
    const style=document.createElement('style');
    style.id='member-reset-inline-style';
    style.textContent='.member-hidden{display:none!important}.member-link-btn{display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;color:#e10600;font:inherit;font-weight:900;text-decoration:underline;cursor:pointer;margin-top:10px;padding:0}.member-link-btn:hover{color:#b42318}';
    document.head.appendChild(style);
  }
  function injectPasswordResetUi(){
    ensureResetStyles();
    const login=document.getElementById('login-form');
    if(!login || document.getElementById('forgot-password-form'))return;
    const toggle=document.createElement('button');
    toggle.id='forgot-password-toggle';
    toggle.type='button';
    toggle.className='member-link-btn';
    toggle.textContent='Şifremi unuttum';

    const forgot=document.createElement('form');
    forgot.id='forgot-password-form';
    forgot.className='member-form member-hidden';
    forgot.innerHTML='<label>E-posta<input id="forgot-email" type="email" autocomplete="email" required></label><button class="member-btn secondary" type="submit">Şifre Sıfırlama Bağlantısı Gönder</button>';

    const reset=document.createElement('form');
    reset.id='reset-password-form';
    reset.className='member-form member-hidden';
    reset.innerHTML='<label>Yeni Şifre<input id="reset-password" type="password" autocomplete="new-password" minlength="8" required></label><button class="member-btn" type="submit">Yeni Şifreyi Kaydet</button>';

    login.insertAdjacentElement('afterend',reset);
    login.insertAdjacentElement('afterend',forgot);
    login.insertAdjacentElement('afterend',toggle);
  }
  function showResetForm(){
    const login=document.getElementById('login-form');
    const signup=document.getElementById('signup-form');
    const google=document.getElementById('google-login');
    const forgotToggle=document.getElementById('forgot-password-toggle');
    const forgot=document.getElementById('forgot-password-form');
    const reset=document.getElementById('reset-password-form');
    if(login)login.classList.add('member-hidden');
    if(signup)signup.classList.add('member-hidden');
    if(google)google.classList.add('member-hidden');
    if(forgotToggle)forgotToggle.classList.add('member-hidden');
    if(forgot)forgot.classList.add('member-hidden');
    if(reset)reset.classList.remove('member-hidden');
  }
  document.addEventListener('DOMContentLoaded',async function(){
    injectPasswordResetUi();
    const login=document.getElementById('login-form');
    const signup=document.getElementById('signup-form');
    const google=document.getElementById('google-login');
    const forgotToggle=document.getElementById('forgot-password-toggle');
    const forgot=document.getElementById('forgot-password-form');
    const reset=document.getElementById('reset-password-form');
    const next=safeNextPath();
    if(isResetMode()){
      showResetForm();
      message('Yeni şifrenizi belirleyin.');
    }else{
      try{
        const active=await HaberMember.session();
        if(active&&active.user){
          message('Oturumunuz açık. Yönlendiriliyorsunuz...');
          window.setTimeout(function(){location.href=next;},250);
          return;
        }
      }catch(error){
        /* Form remains available when session check fails. */
      }
    }
    if(login){
      login.addEventListener('submit',async function(event){
        event.preventDefault();
        message('Giriş yapılıyor...');
        try{
          const response=await HaberMember.login(document.getElementById('login-email').value,document.getElementById('login-password').value);
          if(response.error)throw response.error;
          location.href=next;
        }catch(error){
          message(error.message||'Giriş başarısız.',true);
        }
      });
    }
    if(forgotToggle&&forgot){
      forgotToggle.addEventListener('click',function(){
        forgot.classList.toggle('member-hidden');
      });
    }
    if(forgot){
      forgot.addEventListener('submit',async function(event){
        event.preventDefault();
        message('Şifre sıfırlama bağlantısı gönderiliyor...');
        try{
          const email=document.getElementById('forgot-email').value;
          const response=await HaberMember.resetPassword(email);
          if(response.error)throw response.error;
          message('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu kontrol edin.');
        }catch(error){
          message(error.message||'Şifre sıfırlama bağlantısı gönderilemedi.',true);
        }
      });
    }
    if(reset){
      reset.addEventListener('submit',async function(event){
        event.preventDefault();
        message('Yeni şifre kaydediliyor...');
        try{
          const password=document.getElementById('reset-password').value;
          const response=await HaberMember.updatePassword(password);
          if(response.error)throw response.error;
          message('Şifreniz güncellendi. Hesabınıza yönlendiriliyorsunuz...');
          window.setTimeout(function(){location.href='/account.html';},600);
        }catch(error){
          message(error.message||'Yeni şifre kaydedilemedi.',true);
        }
      });
    }
    if(signup){
      signup.addEventListener('submit',async function(event){
        event.preventDefault();
        message('Üyelik oluşturuluyor...');
        try{
          const response=await HaberMember.register(document.getElementById('signup-email').value,document.getElementById('signup-password').value,document.getElementById('signup-name').value);
          if(response.error)throw response.error;
          if(response.data&&response.data.session){location.href=next;return;}
          message('Üyelik oluşturuldu. E-posta doğrulaması gerekiyorsa kutunuzu kontrol edip ardından giriş yapın.');
        }catch(error){
          message(error.message||'Üyelik oluşturulamadı.',true);
        }
      });
    }
    if(google){
      google.addEventListener('click',async function(){
        try{ await HaberMember.googleLogin(next); }
        catch(error){ message(error.message||'Google girişi başlatılamadı.',true); }
      });
    }
  });
})();