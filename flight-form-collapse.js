/* 航空券を保存した後、入力フォームを折りたたむ */
(function(){
  'use strict';
  let closed=false;
  const style=document.createElement('style');style.textContent='.flight-entry-toggle{width:100%;margin:0 0 10px;background:#f1f6fc!important;color:#31506f!important;border:1px solid #d9e5f2!important}.flight-entry-collapsed .flight-grid,.flight-entry-collapsed #bookingImport,.flight-entry-collapsed #airportList{display:none}.flight-entry-collapsed .flight-grid~.flight-note{display:none}.flight-entry-collapsed .flight-grid~.flight-actions:not(#flightList .flight-actions){display:none}';document.head.appendChild(style);
  function apply(){
    const body=document.getElementById('flightBody'),grid=body?.querySelector('.flight-grid');if(!body||!grid||body.querySelector('.flight-entry-toggle'))return;
    const button=document.createElement('button');button.type='button';button.className='flight-entry-toggle';
    const sync=()=>{body.classList.toggle('flight-entry-collapsed',closed);button.textContent=closed?'＋ 航空券を追加・編集':'▲ 入力フォームを閉じる';};
    button.onclick=()=>{closed=!closed;sync();};grid.before(button);if(body.querySelector('#flightList .flight-ticket'))closed=true;sync();
  }
  document.addEventListener('click',e=>{if(e.target?.id==='flSave')setTimeout(()=>{closed=true;apply();},0);});
  new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});apply();
})();
