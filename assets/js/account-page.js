(function(){
  'use strict';
  function setText(id,value){const node=document.getElementById(id);if(node)node.textContent=value||'';}
  function appendSavedLink(container,item){const link=document.createElement('a');link.href=item.article_url||'#';link.textContent=item.article_title||item.article_url||'Haber';container.appendChild(link);}
  document.addEventListener('DOMContentLoaded',async function(){
    try{
      const active=await HaberMember.requireMember();
      if(!active)return;
      const currentUser=await HaberMember.user();
      setText('member-email',currentUser&&currentUser.email);
      const logout=document.getElementById('logout');
      if(logout)logout.addEventListener('click',async function(){await HaberMember.logout();location.href='/login.html';});
      const list=document.getElementById('saved-list');
      if(list){
        const result=await HaberMember.savedArticles();
        list.textContent='';
        if(result.error){
          const warning=document.createElement('p');
          warning.className='member-muted';
          warning.textContent='Kaydedilen haberler özelliği henüz etkinleştirilmedi.';
          list.appendChild(warning);
        }else if(!result.data||!result.data.length){
          const empty=document.createElement('p');
          empty.className='member-muted';
          empty.textContent='Henüz kaydedilen haber yok.';
          list.appendChild(empty);
        }else{
          result.data.forEach(function(item){appendSavedLink(list,item);});
        }
      }
      const preferences=document.getElementById('prefs-form');
      const prefMail=document.getElementById('pref-mail');
      const prefPush=document.getElementById('pref-push');
      if(preferences){
        const stored=await HaberMember.loadPrefs();
        if(stored.error){
          setText('prefs-message','Kayıtlı tercihler şu anda yüklenemedi.');
        }else if(stored.data){
          if(prefMail)prefMail.checked=!!stored.data.email_daily_digest;
          if(prefPush)prefPush.checked=!!stored.data.breaking_news_push;
        }
        preferences.addEventListener('submit',async function(event){
          event.preventDefault();
          const result=await HaberMember.savePrefs({email_daily_digest:!!(prefMail&&prefMail.checked),breaking_news_push:!!(prefPush&&prefPush.checked),categories:[]});
          setText('prefs-message',result.error?'Bildirim tercihleri özelliği henüz etkinleştirilmedi.':'Tercihler kaydedildi.');
        });
      }
    }catch(error){
      setText('member-error',error.message||'Hesap bilgileri alınamadı.');
    }
  });
})();
