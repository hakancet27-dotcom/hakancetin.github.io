(function(){
  'use strict';

  function loadMemberAuth(){
    return new Promise(function(resolve,reject){
      if(window.HaberMember){resolve();return;}
      var current=document.querySelector('script[data-member-auth-loader]');
      if(current){
        current.addEventListener('load',resolve,{once:true});
        current.addEventListener('error',reject,{once:true});
        return;
      }
      var script=document.createElement('script');
      script.src='/assets/js/member-auth.js?v=20260530b';
      script.defer=true;
      script.dataset.memberAuthLoader='true';
      script.onload=resolve;
      script.onerror=reject;
      document.head.appendChild(script);
    });
  }

  function cleanArticleUrl(){
    return window.location.origin+window.location.pathname;
  }

  function articleData(){
    var titleNode=document.querySelector('article h1');
    var parts=window.location.pathname.split('/').filter(Boolean);
    return {
      url:cleanArticleUrl(),
      title:titleNode?titleNode.textContent.trim():document.title.replace(/\s*\|.*$/,''),
      slug:parts.length?parts[parts.length-1].replace(/\.html$/,''):''
    };
  }

  function nextLoginUrl(){
    return '/login.html?next='+encodeURIComponent(window.location.pathname+window.location.search+window.location.hash);
  }

  function escapeHtml(value){
    return String(value||'').replace(/[&<>"']/g,function(char){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function formatDate(value){
    try{return new Date(value).toLocaleString('tr-TR');}
    catch(error){return '';}
  }

  function setMessage(text,isError){
    var status=document.getElementById('member-article-message');
    if(!status)return;
    status.textContent=text||'';
    status.classList.toggle('error',Boolean(isError));
  }

  function setButton(saved){
    var button=document.getElementById('member-save-article');
    if(!button)return;
    button.dataset.saved=saved?'true':'false';
    button.classList.toggle('is-saved',saved);
    button.textContent=saved?'✓ Kaydedildi · Kaldır':'♡ Haberi Kaydet';
    button.setAttribute('aria-pressed',saved?'true':'false');
  }

  function replaceLegacyCommentBox(activeSession){
    var section=document.querySelector('.article-comments');
    if(!section)return null;
    section.innerHTML=''+
      '<h2>Yorumlar</h2>'+
      '<p id="comment-auth-message" class="member-article-message" role="status" aria-live="polite"></p>'+
      '<form id="member-comment-form" class="comment-form" style="display:none">'+
        '<textarea id="member-comment-text" rows="4" maxlength="700" placeholder="Yorumunuzu yazın"></textarea>'+
        '<button id="member-comment-submit" type="submit">Yorum Gönder</button>'+
      '</form>'+
      '<a id="member-comment-login" class="member-save-article" href="'+nextLoginUrl()+'">Yorum yapmak için giriş yapın</a>'+
      '<div id="comment-list" class="comment-list"></div>';
    var message=document.getElementById('comment-auth-message');
    var form=document.getElementById('member-comment-form');
    var login=document.getElementById('member-comment-login');
    if(activeSession&&activeSession.user){
      if(form)form.style.display='grid';
      if(login)login.style.display='none';
      if(message)message.textContent='Yorum yazma yalnız üyelere açıktır. Oturumunuz açık.';
    }else{
      if(form)form.style.display='none';
      if(login)login.style.display='inline-flex';
      if(message)message.textContent='Yorumları herkes okuyabilir; yorum yazmak için üye girişi gerekir.';
    }
    return section;
  }

  async function loadComments(){
    var list=document.getElementById('comment-list');
    if(!list || !window.HaberMember || !window.HaberMember.listComments)return;
    var article=articleData();
    var response=await window.HaberMember.listComments(article.slug);
    if(response.error)throw response.error;
    var rows=response.data||[];
    if(!rows.length){
      list.innerHTML='<p class="member-article-message">Henüz yorum yok.</p>';
      return;
    }
    list.innerHTML=rows.map(function(row){
      return '<div class="comment-item"><strong>'+escapeHtml(row.display_name)+' · '+escapeHtml(formatDate(row.created_at))+'</strong><p>'+escapeHtml(row.body)+'</p></div>';
    }).join('');
  }

  function bindCommentForm(){
    var form=document.getElementById('member-comment-form');
    var text=document.getElementById('member-comment-text');
    var submit=document.getElementById('member-comment-submit');
    var message=document.getElementById('comment-auth-message');
    if(!form || !text)return;
    form.addEventListener('submit',async function(event){
      event.preventDefault();
      var body=text.value.trim();
      if(!body){return;}
      if(submit)submit.disabled=true;
      if(message)message.textContent='Yorum gönderiliyor...';
      try{
        var response=await window.HaberMember.createComment(articleData(),body);
        if(response.error)throw response.error;
        text.value='';
        if(message)message.textContent='Yorumunuz yayınlandı.';
        await loadComments();
      }catch(error){
        if(message)message.textContent=error.message||'Yorum gönderilemedi. Lütfen yeniden deneyin.';
      }finally{
        if(submit)submit.disabled=false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded',async function(){
    var button=document.getElementById('member-save-article');
    var activeSession=null;
    try{
      await loadMemberAuth();
      activeSession=await window.HaberMember.session();
      replaceLegacyCommentBox(activeSession);
      await loadComments();
      if(activeSession&&activeSession.user){bindCommentForm();}
      if(button&&activeSession&&activeSession.user){
        var found=await window.HaberMember.isArticleSaved(cleanArticleUrl());
        if(!found.error)setButton(Boolean(found.data));
      }
    }catch(error){
      replaceLegacyCommentBox(null);
      setMessage('Üyelik durumu yüklenemedi.',true);
    }

    if(!button)return;
    button.addEventListener('click',async function(){
      button.disabled=true;
      try{
        activeSession=await window.HaberMember.session();
        if(!activeSession||!activeSession.user){
          location.href=nextLoginUrl();
          return;
        }
        var alreadySaved=button.dataset.saved==='true';
        var response=alreadySaved
          ? await window.HaberMember.removeArticle(cleanArticleUrl())
          : await window.HaberMember.saveArticle(articleData());
        if(response.error)throw response.error;
        setButton(!alreadySaved);
        setMessage(alreadySaved?'Haber kayıtlarınızdan kaldırıldı.':'Haber hesabınıza kaydedildi.',false);
      }catch(error){
        setMessage('İşlem tamamlanamadı. Lütfen yeniden deneyin.',true);
      }finally{
        button.disabled=false;
      }
    });
  });
})();