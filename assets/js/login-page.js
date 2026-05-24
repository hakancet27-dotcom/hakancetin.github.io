(function(){
  'use strict';
  function message(text,isError){
    const node=document.getElementById('member-message');
    if(!node)return;
    node.textContent=text||'';
    node.className='member-message'+(isError?' error':'');
  }
  document.addEventListener('DOMContentLoaded',function(){
    const login=document.getElementById('login-form');
    const signup=document.getElementById('signup-form');
    const google=document.getElementById('google-login');
    if(login){
      login.addEventListener('submit',async function(event){
        event.preventDefault();
        message('Giriş yapılıyor...');
        try{
          const response=await HaberMember.login(document.getElementById('login-email').value,document.getElementById('login-password').value);
          if(response.error)throw response.error;
          location.href='/account.html';
        }catch(error){
          message(error.message||'Giriş başarısız.',true);
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
          message('Üyelik oluşturuldu. Gerekirse e-posta doğrulaması için kutunuzu kontrol edin.');
        }catch(error){
          message(error.message||'Üyelik oluşturulamadı.',true);
        }
      });
    }
    if(google){
      google.addEventListener('click',async function(){
        try{ await HaberMember.googleLogin(); }
        catch(error){ message(error.message||'Google girişi başlatılamadı.',true); }
      });
    }
  });
})();
