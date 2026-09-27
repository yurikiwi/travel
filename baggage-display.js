/* 航空券カードに、メールから取得した手荷物規定を常時表示する */
(function(){
  'use strict';
  const style=document.createElement('style');style.textContent='.flight-baggage{margin-top:9px;padding:8px 10px;border-radius:8px;background:#edf7ff;color:#28557d;font-size:13px;line-height:1.45}.flight-baggage b{display:block;color:#197fb7;margin-bottom:2px}';document.head.appendChild(style);
  function draw(){
    if(typeof trip!=='function')return;
    const flights=trip().flights||[],cards=document.querySelectorAll('#flightList .flight-ticket');
    cards.forEach((card,i)=>{if(card.querySelector('.flight-baggage'))return;const bag=flights[i]?.bag;if(!bag)return;const box=document.createElement('div');box.className='flight-baggage';box.innerHTML='<b>🧳 手荷物規定</b>';box.append(document.createTextNode(bag));card.querySelector('.flight-actions')?.before(box);});
  }
  new MutationObserver(draw).observe(document.body,{childList:true,subtree:true});draw();
})();
