(function(){
  'use strict';

  const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

  function meta(name){
    const element=document.querySelector('meta[name="'+name+'"]');
    return element?String(element.content||'').trim():'';
  }

  function sdk(){
    return new Promise((resolve,reject)=>{
      if(window.supabase){resolve();return;}
      const script=document.createElement('script');
      script.src=SDK;
      script.async=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Üyelik bağlantısı yüklenemedi.'));
      document.head.appendChild(script);
    });
  }

  async function client(){
    await sdk();
    if(window.haberMemberClient)return window.haberMemberClient;
    const url=meta('haber-member-url');
    const key=meta('haber-member-public');
    if(!url||!key)throw new Error('Üyelik bağlantısı yapılandırılmamış.');
    window.haberMemberClient=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return window.haberMemberClient;
  }

  async function session(){
    const instance=await client();
    const response=await instance.auth.getSession();
    if(response.error)throw response.error;
    return response.data.session;
  }

  async function user(){
    const instance=await client();
    const response=await instance.auth.getUser();
    if(response.error)throw response.error;
    return response.data.user;
  }

  async function login(email,password){
    const instance=await client();
    return instance.auth.signInWithPassword({email,password});
  }

  async function register(email,password,displayName){
    const instance=await client();
    return instance.auth.signUp({email,password,options:{data:{display_name:displayName||''}}});
  }

  async function googleLogin(){
    const instance=await client();
    const redirectTo=new URL('/account.html',window.location.origin).toString();
    const response=await instance.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo:redirectTo}
    });
    if(response.error)throw response.error;
    return response;
  }

  async function logout(){
    const instance=await client();
    return instance.auth.signOut();
  }

  async function requireMember(){
    const currentSession=await session();
    if(!currentSession){location.href='/login.html';return null;}
    return currentSession;
  }

  async function saveArticle(article){
    const instance=await client();
    const currentUser=await user();
    if(!currentUser)throw new Error('Oturum açmanız gerekiyor.');
    return instance.from('saved_articles').upsert({user_id:currentUser.id,article_url:article.url,article_title:article.title,article_slug:article.slug||''},{onConflict:'user_id,article_url'});
  }

  async function savedArticles(){
    const instance=await client();
    return instance.from('saved_articles').select('id,article_url,article_title,article_slug,created_at').order('created_at',{ascending:false});
  }

  async function loadPrefs(){
    const instance=await client();
    const currentUser=await user();
    if(!currentUser)throw new Error('Oturum açmanız gerekiyor.');
    return instance.from('notification_preferences').select('email_daily_digest,breaking_news_push,categories,updated_at').eq('user_id',currentUser.id).maybeSingle();
  }

  async function savePrefs(prefs){
    const instance=await client();
    const currentUser=await user();
    if(!currentUser)throw new Error('Oturum açmanız gerekiyor.');
    return instance.from('notification_preferences').upsert({user_id:currentUser.id,email_daily_digest:!!prefs.email_daily_digest,breaking_news_push:!!prefs.breaking_news_push,categories:Array.isArray(prefs.categories)?prefs.categories:[]},{onConflict:'user_id'});
  }

  window.HaberMember={client,session,user,login,register,googleLogin,logout,requireMember,saveArticle,savedArticles,loadPrefs,savePrefs};
})();
